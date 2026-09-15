const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Conversation = require('../models/Conversation');
const generateDealCode = require('../utils/generateDealCode');

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
  const { conversationId, finalPrice, meetupLocation } = req.body;
  if (!conversationId) throw new ApiError(400, 'A conversation is required');
  if (!(finalPrice >= 0)) throw new ApiError(400, 'An agreed price is required');

  const conversation = await Conversation.findById(conversationId).populate('listingId', 'sellerId');
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

  // Idempotent: accepting twice should land on the same deal, not open a
  // second one for the same listing and buyer.
  let deal = await Deal.findOne({
    listingId: listing._id,
    buyerId,
    sellerId,
    status: { $in: ['pending', 'verified'] },
  });

  if (!deal) {
    deal = await Deal.create({
      listingId: listing._id,
      buyerId,
      sellerId,
      finalPrice,
      meetupLocation,
      verifyCode: generateDealCode(),
    });
  }

  conversation.dealStatus = 'agreed';
  await conversation.save();

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

  if (deal.buyerConfirmed && deal.sellerConfirmed) {
    deal.status = 'completed';
    await deal.save();
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'sold' });
    await User.findByIdAndUpdate(deal.sellerId, { $inc: { dealsCompleted: 1 } });
    await User.findByIdAndUpdate(deal.buyerId, { $inc: { dealsCompleted: 1 } });
  }

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

  if (deal.buyerConfirmed && deal.sellerConfirmed) {
    deal.status = 'completed';
    await deal.save();
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'sold' });
    await User.findByIdAndUpdate(deal.sellerId, { $inc: { dealsCompleted: 1 } });
    await User.findByIdAndUpdate(deal.buyerId, { $inc: { dealsCompleted: 1 } });
  }

  return res.status(200).json(new ApiResponse(200, { deal }, 'Seller confirmed'));
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
  openDispute,
};
