const Listing = require('../models/Listing');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { goesWithFor } = require('../services/crossSell.service');
const { similarTo } = require('../matchers/retrieve');
const { paginate, buildPagination } = require('../utils/paginate');
const calculateScamScore = require('../utils/scamScore');

// Below this many keyword results, an explicit search is worth a retrieval
// pass. Five fills less than one row of cards, which is the point at which
// the page reads as "nothing here" to a student.
const DEEP_SEARCH_FLOOR = 5;

// A row, not a wall — the same reason the cross-sell strip shows four. It
// also means the marginal matches at the bottom of the ranking mostly never
// get a slot: they only appear when there are fewer than four good ones.
const MAX_SIMILAR = 4;

// A substitute costs roughly what the thing it replaces costs. An accessory
// costs a fraction of it. So the row has a floor as well as a ceiling, and
// it is the cheapest reliable way to tell the two apart — measured on the
// demo board, where the gap is not close:
//
//   screen guard / phone      1.3%     cover / phone        1.9%
//   lock / cycle              6%       power bank / phone    11%
//   helmet / cycle            14%   <- companions end here
//   calculator / calculator   44%   <- alternatives start here
//   Redmi / iPhone            50%      Firefox / Hercules    67%
//
// It catches what the `goesWith` subtraction cannot: that only removes
// companions the cross-sell actually picked, and the model picks at most
// four, so a companion it passed over was still landing in this row. A
// ₹250 lock under a ₹4,200 cycle scored 0.849 — higher than any genuine
// pair of cycles — and read as "more like this".
//
// The cost, stated plainly: a genuine bargain is hidden. Somebody selling a
// working cycle for ₹500 will not appear under a ₹4,200 one. That is the
// wrong call for a bargain hunter and the right one for a row that claims
// these are the same kind of thing.
const SIMILAR_PRICE_FLOOR = 0.25;
const { excludeBlocked } = require('../utils/blockedUsers');
const { emitAdminActivity } = require('../services/adminFeed.service');

// POST /listings
const create = catchAsync(async (req, res) => {
  const images = (req.files || []).map((file) => file.path);
  const scamScore = calculateScamScore(req.body);

  const listing = await Listing.create({
    ...req.body,
    images,
    sellerId: req.user._id,
    scamScore,
    status: scamScore >= 70 ? 'pending' : 'active',
  });

  emitAdminActivity('listings');

  return res.status(201).json(new ApiResponse(201, { listing }, 'Listing created'));
});

// Escapes user input before it goes into a RegExp, so a stray "(" or "*"
// in a search box is treated as a character and not as syntax.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  recent: { isBumped: -1, createdAt: -1 },
  'price-asc': { price: 1, createdAt: -1 },
  'price-desc': { price: -1, createdAt: -1 },
};

// GET /listings
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { q, category, condition, minPrice, maxPrice, sort, listingType } = req.query;

  // A suspended seller's listings come off the page entirely — see
  // utils/blockedUsers.js.
  const filter = { status: 'active', ...(await excludeBlocked('sellerId')) };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  // Listings created before renting existed have no listingType at all, so
  // asking for sales has to include the ones that predate the field.
  if (listingType === 'rent') filter.listingType = 'rent';
  if (listingType === 'sale') filter.listingType = { $ne: 'rent' };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Search is a case-insensitive regex rather than the model's $text index,
  // because the UI searches as you type: $text matches whole words only, so
  // "cyc" would return nothing for "cycle" and search would feel broken
  // mid-word. The tradeoff is that this does not use an index — fine at
  // campus scale, but move to $text or Atlas Search if volume grows.
  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort(SORTS[sort] || SORTS.recent)
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'name avatar trustScore isEmailVerified'),
    Listing.countDocuments(filter),
  ]);

  // Second tier: what the keywords missed.
  //
  // The regex above cannot match a description of a thing to the thing:
  // "something to keep food cold" finds no fridge, "somewhere to study in
  // my room" finds no desk. That is the most visible gap between what this
  // page looks like it does and what it does. Retrieval closes it —
  // measured on the demo board, those two land at 0.70 and above.
  //
  // What it does NOT close is a one-word synonym. "bike" scores 0.652
  // against a cycle and the bar is 0.66, so it still finds nothing; "a bike
  // to ride around campus" scores 0.706 and ranks both cycles first. Short
  // queries sit right at the line because a single word carries less to
  // match on than a sentence does, and the threshold is shared with the
  // wanted board, whose posts are all sentences. Worth knowing before
  // lowering it for one word's sake.
  //
  // Embedding a query is a network round trip,
  // and this box searches as you type, so doing it on every keystroke
  // would be slow, expensive and rate-limited.
  //
  // So it runs only when BOTH are true:
  //   deep=1        the student actually submitted, rather than typed a
  //                 letter (the client sends it on Enter and on GO only)
  //   thin results  the keywords already came up short
  //
  // That is exactly the "bike" case and almost nothing else. A page that
  // regex answered well never reaches a model, and neither does typing.
  // If the provider is missing or fails, semanticSearch returns nothing
  // and the student simply gets the keyword results.
  const wantsDeep = req.query.deep === '1' || req.query.deep === 'true';
  if (wantsDeep && q && q.trim() && listings.length < DEEP_SEARCH_FLOOR && page === 1) {
    const { semanticSearch } = require('../matchers/retrieve');

    // Same eligibility as the keyword pass, minus the text clause — the
    // filters are stated constraints and still apply.
    const { $or, ...structural } = filter;
    const already = new Set(listings.map((l) => String(l._id)));

    const hits = await semanticSearch(q, {
      filter: structural,
      limit: limit - listings.length,
    });

    const extra = hits.map((h) => h.listing).filter((l) => !already.has(String(l._id)));

    if (extra.length) {
      // Populated separately because retrieval works on lean documents.
      const populated = await Listing.find({ _id: { $in: extra.map((l) => l._id) } }).populate(
        'sellerId',
        'name avatar trustScore isEmailVerified'
      );

      // Keep retrieval's ordering: it ranked these by how well they answer
      // the query, and _id order means nothing to a reader.
      const byId = new Map(populated.map((l) => [String(l._id), l]));
      const ordered = extra.map((l) => byId.get(String(l._id))).filter(Boolean);

      return res.status(200).json(
        new ApiResponse(
          200,
          { listings: [...listings, ...ordered] },
          'Listings fetched',
          buildPagination(page, limit, total + ordered.length)
        )
      );
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Listings fetched', buildPagination(page, limit, total)));
});

// GET /listings/:id
const getById = catchAsync(async (req, res) => {
  // Same exclusion as the browse list: hiding a suspended seller from the
  // grid but serving their listing to anyone with the direct link would
  // just move the problem.
  const listing = await Listing.findOne({
    _id: req.params.id,
    ...(await excludeBlocked('sellerId')),
  }).populate('sellerId', 'name avatar trustScore dealsCompleted isEmailVerified');
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing fetched'));
});

// PATCH /listings/:id
const update = catchAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (String(listing.sellerId) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit your own listings');
  }

  Object.assign(listing, req.body);
  await listing.save();

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing updated'));
});

// DELETE /listings/:id
const deleteListing = catchAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (String(listing.sellerId) !== String(req.user._id) && req.user.role === 'student') {
    throw new ApiError(403, 'You can only delete your own listings');
  }

  await listing.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, 'Listing deleted'));
});

// PATCH /listings/:id/sold
const markSold = catchAsync(async (req, res) => {
  const listing = await Listing.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { status: 'sold' },
    { new: true }
  );
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing marked as sold'));
});

// PATCH /listings/:id/bump
const bump = catchAsync(async (req, res) => {
  const listing = await Listing.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { isBumped: true, bumpExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    { new: true }
  );
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing bumped'));
});

// PATCH /listings/:id/relist
const relist = catchAsync(async (req, res) => {
  const listing = await Listing.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { status: 'active', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { new: true }
  );
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing relisted'));
});

// PATCH /listings/:id/view
const incrementView = catchAsync(async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  );
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { viewCount: listing.viewCount }, 'View recorded'));
});

// GET /listings/:id/similar
//
// "More like this, under ₹X" — SUBSTITUTES: other listings that are the
// same kind of thing and cost no more. This is the exact opposite question
// to the goes-with strip directly above it on the page, which wants
// COMPLEMENTS, and the two have to be kept apart deliberately (see below).
//
// It used to be "same category, newest first", which answered neither
// question: it put a ₹40,000 laptop under a ₹900 calculator because both
// are electronics, and it ranked by nothing a shopper cares about.
const getSimilar = catchAsync(async (req, res) => {
  // `+embedding` because similarTo compares cached vectors; `+goesWith`
  // because whatever the cross-sell already picked must not appear twice on
  // one page. Both are `select: false` on the model.
  const listing = await Listing.findById(req.params.id).select('+embedding +goesWith');
  if (!listing) throw new ApiError(404, 'Listing not found');

  // The two things the row's own heading promises, so both filter rather
  // than rank:
  //   price      "under ₹X" has to be true of everything in the row, and a
  //              floor under that, because an accessory is not an alternative
  //   type       a hire rate against a sale price is meaningless — ₹120/day
  //              is not "cheaper than" a ₹2,100 bike, it is a different
  //              kind of number
  const eligible = {
    ...(await excludeBlocked('sellerId')),
    listingType: listing.listingType,
    ...(typeof listing.price === 'number'
      ? { price: { $lte: listing.price, $gte: Math.floor(listing.price * SIMILAR_PRICE_FLOOR) } }
      : {}),
  };

  // Whatever the strip above is already showing, removed.
  //
  // This is not tidying, it is the one thing that makes the row work.
  // Meaning cannot tell a substitute from a complement: measured on real
  // embeddings, a phone and its own back cover score 0.858 while two
  // different phones score 0.832, because a thing and its companion get
  // described in the same words. No threshold separates them, so the
  // cross-sell's answers are subtracted instead of argued with.
  const companions = new Set((listing.goesWith?.items || []).map((i) => String(i.listingId)));

  // Ask for enough that dropping the companions cannot leave a short row.
  const hits = await similarTo(listing, {
    filter: eligible,
    limit: MAX_SIMILAR + companions.size,
  });

  const ranked = hits
    .map((h) => h.listing)
    .filter((l) => !companions.has(String(l._id)))
    .slice(0, MAX_SIMILAR);

  if (ranked.length) {
    // Populated separately because retrieval works on lean documents, then
    // put back into retrieval's order — a `$in` query returns `_id` order,
    // which means nothing to a shopper, and the whole point here is that
    // the best match is first.
    const populated = await Listing.find({ _id: { $in: ranked.map((l) => l._id) } }).populate(
      'sellerId',
      'name avatar trustScore isEmailVerified'
    );
    const byId = new Map(populated.map((l) => [String(l._id), l]));
    const ordered = ranked.map((l) => byId.get(String(l._id))).filter(Boolean);

    return res
      .status(200)
      .json(new ApiResponse(200, { listings: ordered, source: 'semantic' }, 'Similar listings fetched'));
  }

  // Nothing retrieved. Three ways that happens and all of them are
  // ordinary: this listing was posted in the last hour so the job has not
  // written its vector yet, no embedding provider is configured, or there
  // genuinely is nothing close enough on the board.
  //
  // So: same category, newest first — what this endpoint used to do — but
  // keeping the price and type constraints, because the heading above the
  // row promises them whichever way the row was filled.
  const fallback = await Listing.find({
    _id: { $ne: listing._id },
    category: listing.category,
    status: 'active',
    ...eligible,
  })
    .populate('sellerId', 'name avatar trustScore isEmailVerified')
    .sort({ createdAt: -1 })
    .limit(MAX_SIMILAR);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings: fallback, source: 'category' }, 'Similar listings fetched'));
});

// GET /listings/:id/goes-with
//
// Reads the cached answer the hourly job wrote. No model is called here and
// none ever should be: this is a page load, and a student should not wait on
// a language model to see a listing.
const getGoesWith = catchAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id).select('_id');
  if (!listing) throw new ApiError(404, 'Listing not found');

  // `missing` is what obviously goes with this and is NOT for sale, which
  // the page turns into an offer to post a wanted request. Dropping it here
  // is how that whole half of the feature silently did nothing.
  const { items, missing, source } = await goesWithFor(listing._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { items, missing, source }, 'Goes-with fetched'));
});

module.exports = {
  create,
  getAll,
  getById,
  update,
  delete: deleteListing,
  markSold,
  bump,
  relist,
  incrementView,
  getSimilar,
  getGoesWith,
};
