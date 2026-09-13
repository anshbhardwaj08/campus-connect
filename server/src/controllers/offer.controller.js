const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// POST /offers
const sendOffer = catchAsync(async (req, res) => {
  const { conversationId, listingId, amount } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, 'Listing not found');

  const offer = await Offer.create({
    conversationId,
    listingId,
    buyerId: req.user._id,
    sellerId: listing.sellerId,
    amount,
  });

  return res.status(201).json(new ApiResponse(201, { offer }, 'Offer sent'));
});

// PATCH /offers/:id/accept
const acceptOffer = catchAsync(async (req, res) => {
  const offer = await Offer.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { status: 'accepted' },
    { new: true }
  );
  if (!offer) throw new ApiError(404, 'Offer not found');

  return res.status(200).json(new ApiResponse(200, { offer }, 'Offer accepted'));
});

// PATCH /offers/:id/reject
const rejectOffer = catchAsync(async (req, res) => {
  const offer = await Offer.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { status: 'rejected' },
    { new: true }
  );
  if (!offer) throw new ApiError(404, 'Offer not found');

  return res.status(200).json(new ApiResponse(200, { offer }, 'Offer rejected'));
});

// PATCH /offers/:id/counter
const counterOffer = catchAsync(async (req, res) => {
  const { counterAmount } = req.body;

  const offer = await Offer.findOneAndUpdate(
    { _id: req.params.id, sellerId: req.user._id },
    { status: 'countered', counterAmount },
    { new: true }
  );
  if (!offer) throw new ApiError(404, 'Offer not found');

  return res.status(200).json(new ApiResponse(200, { offer }, 'Counter offer sent'));
});

module.exports = { sendOffer, acceptOffer, rejectOffer, counterOffer };
