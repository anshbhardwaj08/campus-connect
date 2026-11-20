const Listing = require('../models/Listing');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { goesWithFor } = require('../services/crossSell.service');
const { paginate, buildPagination } = require('../utils/paginate');
const calculateScamScore = require('../utils/scamScore');

// Below this many keyword results, an explicit search is worth a retrieval
// pass. Five fills less than one row of cards, which is the point at which
// the page reads as "nothing here" to a student.
const DEEP_SEARCH_FLOOR = 5;
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
  // The regex above cannot match "bike" to a cycle, which is the single
  // most visible gap between what this page looks like it does and what it
  // does. Retrieval can — but embedding a query is a network round trip,
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
const getSimilar = catchAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');

  const similar = await Listing.find({
    _id: { $ne: listing._id },
    category: listing.category,
    status: 'active',
    ...(await excludeBlocked('sellerId')),
  })
    .limit(8)
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, { listings: similar }, 'Similar listings fetched'));
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
