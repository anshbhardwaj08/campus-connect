const Review = require('../models/Review');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// POST /reviews
const create = catchAsync(async (req, res) => {
  const review = await Review.create({ ...req.body, reviewerId: req.user._id });
  return res.status(201).json(new ApiResponse(201, { review }, 'Review submitted'));
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

module.exports = { create, getForUser, getForListing };
