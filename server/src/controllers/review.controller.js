const Review = require('../models/Review');
const Deal = require('../models/Deal');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// POST /reviews
//
// Everything that decides WHO is being reviewed comes from the deal, not
// from the request. Previously `revieweeId`, `listingId` and `type` were
// taken straight off the body, so anyone could post a review of anyone,
// attached to a deal they had nothing to do with — which is exactly the
// kind of thing a trust score must not be built on.
const create = catchAsync(async (req, res) => {
  const { dealId, rating, comment } = req.body;

  const deal = await Deal.findById(dealId);
  if (!deal) throw new ApiError(404, 'Deal not found');

  const isBuyer = String(deal.buyerId) === String(req.user._id);
  const isSeller = String(deal.sellerId) === String(req.user._id);
  if (!isBuyer && !isSeller) throw new ApiError(403, 'You were not part of this deal');

  // A review is a report on how the handover went, so there has to have
  // been one.
  if (deal.status !== 'completed') {
    throw new ApiError(400, 'You can review this once the deal is closed');
  }

  const existing = await Review.findOne({ dealId, reviewerId: req.user._id });
  if (existing) throw new ApiError(409, 'You have already reviewed this deal');

  const review = await Review.create({
    reviewerId: req.user._id,
    revieweeId: isBuyer ? deal.sellerId : deal.buyerId,
    listingId: deal.listingId,
    dealId,
    rating,
    comment,
    // The reviewer's own role in the deal: a buyer reviews their seller.
    type: isBuyer ? 'seller' : 'buyer',
  });

  return res.status(201).json(new ApiResponse(201, { review }, 'Review submitted'));
});

// GET /reviews/mine
// Reviews this user has WRITTEN. /users/:id/reviews returns the opposite —
// reviews written ABOUT them — and the deals page needs this direction to
// tell which closed deals it has already had a say on.
const getMine = catchAsync(async (req, res) => {
  const reviews = await Review.find({ reviewerId: req.user._id }).select('dealId rating createdAt');
  return res.status(200).json(new ApiResponse(200, { reviews }, 'Your reviews fetched'));
});

// GET /reviews/user/:id
const getForUser = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { revieweeId: req.params.id };

  const [reviews, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reviewerId', 'name avatar'),
    Review.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { reviews }, 'Reviews fetched', buildPagination(page, limit, total)));
});

// GET /reviews/listing/:id
const getForListing = catchAsync(async (req, res) => {
  const reviews = await Review.find({ listingId: req.params.id }).populate('reviewerId', 'name avatar');
  return res.status(200).json(new ApiResponse(200, { reviews }, 'Reviews fetched'));
});

module.exports = { create, getMine, getForUser, getForListing };
