const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Conversation = require('../models/Conversation');
const generateDealCode = require('../utils/generateDealCode');
const { emitAdminActivity } = require('../services/adminFeed.service');
const { createNotification } = require('../services/notification.service');

// A deal is a two-person handshake, and every step of it ends with the ball
// in the other person's court. Without these the other side has no way of
// knowing it is their turn unless they happen to have the thread open.
//
// Never awaited into the response path and never allowed to throw: failing
// to tell someone their offer was accepted is bad, but failing their whole
// request because of it is worse.
const notify = (userId, payload) =>
  createNotification({ userId, type: 'deal', ...payload }).catch(() => {});

const nameOf = async (userId) => {
  const user = await User.findById(userId).select('name').lean();
  return user?.name || 'The other person';
};

const DAY_MS = 86400000;
// A hire is quoted in the listing's own period, so the owner answers "how
// many weeks?" rather than doing the arithmetic themselves.
const PERIOD_DAYS = { day: 1, week: 7, month: 30 };

const formatDay = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Both confirm routes do the same work from opposite ends. Kept in one place
// so the completion side effects — listing status, trust counters, the
// notifications — cannot drift apart between them.
const applyConfirmation = async (deal, side) => {
  const mine = side === 'buyer' ? 'buyerId' : 'sellerId';
  const theirs = side === 'buyer' ? 'sellerId' : 'buyerId';

  if (deal.buyerConfirmed && deal.sellerConfirmed) {
    deal.status = 'completed';

    // A rented item comes back; a sold one does not. Marking a rental
    // "sold" would take it off the page for good.
    const listing = await Listing.findById(deal.listingId).select('listingType');
    const renting = listing?.listingType === 'rent';

    // The handover is the moment the hire actually starts, which is why the
    // due date is set here and not when the deal was agreed.
    if (renting && deal.rentalDays && !deal.dueAt) {
      deal.dueAt = new Date(Date.now() + deal.rentalDays * DAY_MS);
    }

    await deal.save();
    await Listing.findByIdAndUpdate(deal.listingId, {
      status: renting ? 'rented' : 'sold',
    });

    await User.findByIdAndUpdate(deal.sellerId, { $inc: { dealsCompleted: 1 } });
    await User.findByIdAndUpdate(deal.buyerId, { $inc: { dealsCompleted: 1 } });
    emitAdminActivity('deals');

    const [buyerName, sellerName] = await Promise.all([
      nameOf(deal.buyerId),
      nameOf(deal.sellerId),
    ]);

    // A hire is not finished at the handover, so saying "all done, leave a
    // review" would be wrong — it has only just started.
    const due = deal.dueAt ? formatDay(deal.dueAt) : null;
    // Said from each side's own point of view, because a deposit is only
    // meaningful as "yours, held by them" or "theirs, held by you".
    const held = deal.securityDeposit
      ? ` ₹${deal.securityDeposit} deposit`
      : '';

    await Promise.all([
      notify(deal.buyerId, {
        title: due ? 'The hire has started' : 'Deal closed',
        message: due
          ? `Due back to ${sellerName} on ${due}.${held ? ` They are holding your${held}.` : ''}`
          : `All done with ${sellerName}. Leave them a review.`,
        link: '/deals',
      }),
      notify(deal.sellerId, {
        title: due ? 'The hire has started' : 'Deal closed',
        message: due
          ? `${buyerName} has it until ${due}.${held ? ` You are holding their${held}.` : ''}`
          : `All done with ${buyerName}. Leave them a review.`,
        link: '/deals',
      }),
    ]);
    return;
  }

  await notify(deal[theirs], {
    title: `${await nameOf(deal[mine])} confirmed the deal`,
    message: 'Confirm from your side to close it.',
    link: '/deals',
  });
};

// POST /deals
const createDeal = catchAsync(async (req, res) => {
  const { listingId, finalPrice, meetupLocation } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, 'Listing not found');

  // The buyer is whoever is making the request. Taking buyerId from the body
  // let a caller open a deal in someone else's name.
  const buyerId = req.user._id;
  if (String(listing.sellerId) === String(buyerId)) {
    throw new ApiError(400, 'You cannot buy your own listing');
  }

  const deal = await Deal.create({
    listingId,
    buyerId,
    sellerId: listing.sellerId,
    finalPrice,
    meetupLocation,
    verifyCode: generateDealCode(),
  });

  return res.status(201).json(new ApiResponse(201, { deal }, 'Deal created'));
});

// Everyone below needs the same question answered: is this your deal?
// Without it any signed-in student could regenerate a stranger's code,
// mark their deal verified, or open a dispute on it.
const findDealForParticipant = async (dealId, userId) => {
  const deal = await Deal.findById(dealId);
  if (!deal) throw new ApiError(404, 'Deal not found');

  const isParticipant =
    String(deal.buyerId) === String(userId) || String(deal.sellerId) === String(userId);
  if (!isParticipant) throw new ApiError(403, 'This is not your deal');

  return deal;
};

// POST /deals/from-conversation
// The "accept offer" path. POST /deals cannot serve this: it makes the
// caller the buyer, but the person accepting an offer is the SELLER. Here
// both sides are derived from the conversation instead of being trusted
// from the request, so neither can be spoofed.
const createFromConversation = catchAsync(async (req, res) => {
  const { conversationId, finalPrice, meetupLocation, rentalPeriods } = req.body;
  if (!conversationId) throw new ApiError(400, 'A conversation is required');
  if (!(finalPrice >= 0)) throw new ApiError(400, 'An agreed price is required');

  const conversation = await Conversation.findById(conversationId).populate(
    'listingId',
    'sellerId listingType rentPeriod securityDeposit'
  );
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const isParticipant = conversation.participants.some((p) => String(p) === String(req.user._id));
  if (!isParticipant) throw new ApiError(403, 'Not a participant of this conversation');

  const listing = conversation.listingId;
  if (!listing) throw new ApiError(404, 'That listing is gone');

  const sellerId = String(listing.sellerId);
  if (sellerId !== String(req.user._id)) {
    throw new ApiError(403, 'Only the seller can accept an offer');
  }

  const buyerId = conversation.participants.map(String).find((p) => p !== sellerId);
  if (!buyerId) throw new ApiError(400, 'Could not work out who the buyer is');

  // A hire with no agreed length has no due date, and then nobody can say
  // whether it is late. The count is in the listing's own period, so "2" on
  // a per-week listing is a fortnight.
  let rentalDays;
  let securityDeposit;
  if (listing.listingType === 'rent') {
    const periods = Number(rentalPeriods);
    if (!Number.isInteger(periods) || periods < 1 || periods > 52) {
      throw new ApiError(400, 'Say how long the hire is for');
    }
    rentalDays = periods * (PERIOD_DAYS[listing.rentPeriod] || 1);
    securityDeposit = listing.securityDeposit || 0;
  }

  // Idempotent: accepting twice should land on the same deal, not open a
  // second one for the same listing and buyer.
  let deal = await Deal.findOne({
    listingId: listing._id,
    buyerId,
    sellerId,
    status: { $in: ['pending', 'verified'] },
  });

  const isNew = !deal;
  if (!deal) {
    deal = await Deal.create({
      listingId: listing._id,
      buyerId,
      sellerId,
      finalPrice,
      meetupLocation,
      rentalDays,
      securityDeposit,
      verifyCode: generateDealCode(),
    });
  }

  conversation.dealStatus = 'agreed';
  await conversation.save();

  // The point of the whole feature: until now the buyer only found out if
  // they happened to have the thread open, because `deal:agreed` goes to the
  // conversation room and nowhere else. Guarded on `isNew` so a seller
  // pressing accept twice does not notify them twice.
  if (isNew) {
    await notify(buyerId, {
      title: `${req.user.name} accepted your offer`,
      message: rentalDays
        ? `₹${finalPrice} to rent for ${rentalDays} day${rentalDays === 1 ? '' : 's'} — agree a place to meet, then get their code.`
        : `₹${finalPrice} — agree a place to meet, then get their code.`,
      link: `/chat?conversation=${conversation._id}`,
    });
  }

  return res.status(201).json(new ApiResponse(201, { deal }, 'Deal opened'));
});

// POST /deals/:id/generate-code
// Seller-only: the code is what the seller shows the buyer at the meetup, so
// only they get to mint it.
const generateCode = catchAsync(async (req, res) => {
  const deal = await findDealForParticipant(req.params.id, req.user._id);
  if (String(deal.sellerId) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the seller can generate the code');
  }

  deal.verifyCode = generateDealCode();
  await deal.save();

  return res.status(200).json(new ApiResponse(200, { verifyCode: deal.verifyCode }, 'Code generated'));
});

// POST /deals/:id/verify-code
const verifyCode = catchAsync(async (req, res) => {
  const { code } = req.body;

  const deal = await findDealForParticipant(req.params.id, req.user._id);
  if (deal.verifyCode !== code) throw new ApiError(400, 'Invalid verification code');

  deal.status = 'verified';
  await deal.save();

  const other =
    String(deal.buyerId) === String(req.user._id) ? deal.sellerId : deal.buyerId;
  await notify(other, {
    title: `${req.user.name} verified the code`,
    message: 'You met. Both of you confirm now to close it off.',
    link: '/deals',
  });

  return res.status(200).json(new ApiResponse(200, { deal }, 'Deal verified'));
});

// PATCH /deals/:id/buyer-confirm
const buyerConfirm = catchAsync(async (req, res) => {
  const deal = await Deal.findOneAndUpdate(
    { _id: req.params.id, buyerId: req.user._id },
    { buyerConfirmed: true },
    { new: true }
  );
  if (!deal) throw new ApiError(404, 'Deal not found');

  await applyConfirmation(deal, 'buyer');

  return res.status(200).json(new ApiResponse(200, { deal }, 'Buyer confirmed'));
});

// PATCH /deals/:id/seller-confirm
const sellerConfirm = catchAsync(async (req, res) => {
  const deal = await Deal.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { sellerConfirmed: true },
    { new: true }
  );
  if (!deal) throw new ApiError(404, 'Deal not found');

  await applyConfirmation(deal, 'seller');

  return res.status(200).json(new ApiResponse(200, { deal }, 'Seller confirmed'));
});

// PATCH /deals/:id/returned
//
// Owner-only, and the single action that ends a hire: it stops the clock,
// puts the item back on the page and tells the renter it is settled. Doing
// those as separate steps left the deal reading "out" long after the owner
// had relisted the thing.
const markReturned = catchAsync(async (req, res) => {
  const deal = await findDealForParticipant(req.params.id, req.user._id);

  if (String(deal.sellerId) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the owner can mark it returned');
  }
  if (!deal.dueAt) throw new ApiError(400, 'This deal is not a hire');
  if (deal.returnedAt) throw new ApiError(400, 'This one is already back');

  deal.returnedAt = new Date();
  await deal.save();

  // Only reopen a listing that this hire took off the page. If the owner
  // has since sold it, deleted it or rented it to someone else, forcing it
  // back to active would undo their decision.
  await Listing.findOneAndUpdate(
    { _id: deal.listingId, status: 'rented' },
    { status: 'active', expiresAt: new Date(Date.now() + 30 * DAY_MS) }
  );

  const late = deal.dueAt < deal.returnedAt;
  // The renter is the one owed money back, so they are told to expect it —
  // the owner is told to hand it over, on the page, next to the button.
  const deposit = deal.securityDeposit
    ? ` Ask ${req.user.name} for your ₹${deal.securityDeposit} deposit back.`
    : '';

  await notify(deal.buyerId, {
    title: 'Returned — that hire is settled',
    message:
      (late
        ? `${req.user.name} has it back. It came back after the ${formatDay(deal.dueAt)} date.`
        : `${req.user.name} has it back.`) + (deposit || ' Leave them a review.'),
    link: '/deals',
  });

  return res.status(200).json(new ApiResponse(200, { deal }, 'Marked returned'));
});

// PATCH /deals/:id/dispute
const openDispute = catchAsync(async (req, res) => {
  const deal = await findDealForParticipant(req.params.id, req.user._id);

  deal.status = 'disputed';
  await deal.save();

  return res.status(200).json(new ApiResponse(200, { deal }, 'Dispute opened'));
});

module.exports = {
  createDeal,
  createFromConversation,
  generateCode,
  verifyCode,
  buyerConfirm,
  sellerConfirm,
  markReturned,
  openDispute,
};
