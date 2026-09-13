const User = require('../models/User');
const Listing = require('../models/Listing');
const Deal = require('../models/Deal');
const Review = require('../models/Review');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /users/me
const getProfile = catchAsync(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, { user: req.user }, 'Profile fetched'));
});

// PATCH /users/me
const updateProfile = catchAsync(async (req, res) => {
  const allowedFields = ['name', 'dept', 'batch', 'hostel', 'avatar'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  return res.status(200).json(new ApiResponse(200, { user }, 'Profile updated'));
});

// GET /users/me/listings
const getMyListings = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const [listings, total] = await Promise.all([
    Listing.find({ sellerId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Listing.countDocuments({ sellerId: req.user._id }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Listings fetched', buildPagination(page, limit, total)));
});

// GET /users/me/deals
const getMyDeals = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }] };

  const [deals, total] = await Promise.all([
    Deal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Deal.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { deals }, 'Deals fetched', buildPagination(page, limit, total)));
});

// POST /users/:id/block
const blockUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, { user }, 'User blocked'));
});

// GET /users/:id/reviews
const getUserReviews = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = paginate(req.query);

  const [reviews, total] = await Promise.all([
    Review.find({ revieweeId: id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments({ revieweeId: id }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { reviews }, 'Reviews fetched', buildPagination(page, limit, total)));
});

module.exports = {
  getProfile,
  updateProfile,
  getMyListings,
  getMyDeals,
  blockUser,
  getUserReviews,
};
