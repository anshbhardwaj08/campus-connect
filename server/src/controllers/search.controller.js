const Listing = require('../models/Listing');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /search?q=...
const fullTextSearch = catchAsync(async (req, res) => {
  const { q } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = { status: 'active', ...(q && { $text: { $search: q } }) };

  const [listings, total] = await Promise.all([
    Listing.find(filter, q ? { score: { $meta: 'textScore' } } : {})
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Listing.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Search results fetched', buildPagination(page, limit, total)));
});

// GET /search/filter
const filterListings = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { category, condition, minPrice, maxPrice, isFree, isNegotiable } = req.query;

  const filter = { status: 'active' };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (isFree !== undefined) filter.isFree = isFree === 'true';
  if (isNegotiable !== undefined) filter.isNegotiable = isNegotiable === 'true';
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const [listings, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Listing.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Filtered listings fetched', buildPagination(page, limit, total)));
});

// GET /search/trending
const trending = catchAsync(async (req, res) => {
  const listings = await Listing.find({ status: 'active' })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(10);

  return res.status(200).json(new ApiResponse(200, { listings }, 'Trending listings fetched'));
});

module.exports = { fullTextSearch, filterListings, trending };
