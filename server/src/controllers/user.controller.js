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
    Deal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('listingId', 'title images price')
      .populate('buyerId', 'name avatar')
      .populate('sellerId', 'name avatar'),
    Deal.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { deals }, 'Deals fetched', buildPagination(page, limit, total)));
});

// GET /users/:id
// The public face of a student: what a buyer sees before meeting a stranger
// at a gate. Deliberately a narrow projection — never the whole document,
// which carries phone, email, refreshToken and passwordHash.
const getPublicProfile = catchAsync(async (req, res) => {
  // A suspended account has no public face while the suspension stands —
  // 404 rather than 403, since whether they exist is not the browser's
  // business either.
  const user = await User.findOne({ _id: req.params.id, isBlocked: { $ne: true } }).select(
    'name avatar dept batch trustScore dealsCompleted isEmailVerified createdAt'
  );
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, { user }, 'Profile fetched'));
});

// GET /users/:id/listings
// Only what is still on the page — someone else's expired or rejected
// listings are not the public's business.
const getUserListings = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  // Matches getPublicProfile: nothing of a suspended seller's is public.
  const seller = await User.findOne({ _id: req.params.id, isBlocked: { $ne: true } }, '_id');
  if (!seller) throw new ApiError(404, 'User not found');

  const filter = { sellerId: req.params.id, status: { $in: ['active', 'sold'] } };

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'name avatar trustScore isEmailVerified'),
    Listing.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Listings fetched', buildPagination(page, limit, total)));
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
    Review.find({ revieweeId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewerId', 'name avatar')
      .populate('listingId', 'title'),
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
  getPublicProfile,
  getUserListings,
  blockUser,
  getUserReviews,
};
