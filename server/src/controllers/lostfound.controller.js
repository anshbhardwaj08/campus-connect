const LostFound = require('../models/LostFound');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// POST /lostfound
const post = catchAsync(async (req, res) => {
  const images = (req.files || []).map((file) => file.path);
  const item = await LostFound.create({ ...req.body, images, userId: req.user._id });
  return res.status(201).json(new ApiResponse(201, { item }, 'Post created'));
});

// GET /lostfound
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { type } = req.query;
  const filter = { status: 'open', ...(type && { type }) };

  const [items, total] = await Promise.all([
    LostFound.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name avatar'),
    LostFound.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { items }, 'Posts fetched', buildPagination(page, limit, total)));
});

// PATCH /lostfound/:id/resolve
const markResolved = catchAsync(async (req, res) => {
  const item = await LostFound.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { status: 'resolved' },
    { new: true }
  );
  if (!item) throw new ApiError(404, 'Post not found');

  return res.status(200).json(new ApiResponse(200, { item }, 'Marked as resolved'));
});

module.exports = { post, getAll, markResolved };
