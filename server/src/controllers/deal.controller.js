const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const generateDealCode = require('../utils/generateDealCode');

// POST /deals
const createDeal = catchAsync(async (req, res) => {
  const { listingId, buyerId, finalPrice, meetupLocation } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, 'Listing not found');

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

// POST /deals/:id/generate-code
const generateCode = catchAsync(async (req, res) => {
  const deal = await Deal.findByIdAndUpdate(
    req.params.id,
    { verifyCode: generateDealCode() },
    { new: true }
  );
  if (!deal) throw new ApiError(404, 'Deal not found');

  return res.status(200).json(new ApiResponse(200, { verifyCode: deal.verifyCode }, 'Code generated'));
});

// POST /deals/:id/verify-code
const verifyCode = catchAsync(async (req, res) => {
  const { code } = req.body;

  const deal = await Deal.findById(req.params.id);
  if (!deal) throw new ApiError(404, 'Deal not found');
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
  const deal = await Deal.findByIdAndUpdate(
    req.params.id,
    { status: 'disputed' },
    { new: true }
  );
  if (!deal) throw new ApiError(404, 'Deal not found');

  return res.status(200).json(new ApiResponse(200, { deal }, 'Dispute opened'));
});

module.exports = {
  createDeal,
  generateCode,
  verifyCode,
  buyerConfirm,
  sellerConfirm,
  openDispute,
};
