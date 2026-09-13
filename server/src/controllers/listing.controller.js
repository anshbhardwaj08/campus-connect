const Listing = require('../models/Listing');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');
const calculateScamScore = require('../utils/scamScore');

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

  return res.status(201).json(new ApiResponse(201, { listing }, 'Listing created'));
});

// GET /listings
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { category, condition, minPrice, maxPrice } = req.query;

  const filter = { status: 'active' };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort({ isBumped: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'name avatar trustScore'),
    Listing.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Listings fetched', buildPagination(page, limit, total)));
});

// GET /listings/:id
const getById = catchAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate(
    'sellerId',
    'name avatar trustScore dealsCompleted'
  );
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
  })
    .limit(8)
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, { listings: similar }, 'Similar listings fetched'));
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
};
