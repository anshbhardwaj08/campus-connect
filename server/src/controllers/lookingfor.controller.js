const LookingFor = require('../models/LookingFor');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// POST /lookingfor
const create = catchAsync(async (req, res) => {
  const post = await LookingFor.create({ ...req.body, userId: req.user._id });
  return res.status(201).json(new ApiResponse(201, { post }, 'Request posted'));
});

// GET /lookingfor
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { category } = req.query;
  const filter = { status: 'open', ...(category && { category }) };

  const [posts, total] = await Promise.all([
    LookingFor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name avatar'),
    LookingFor.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { posts }, 'Requests fetched', buildPagination(page, limit, total)));
});

// PATCH /lookingfor/:id/fulfilled
const markFulfilled = catchAsync(async (req, res) => {
  const post = await LookingFor.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { status: 'fulfilled' },
    { new: true }
  );
  if (!post) throw new ApiError(404, 'Request not found');

  return res.status(200).json(new ApiResponse(200, { post }, 'Marked as fulfilled'));
});

module.exports = { create, getAll, markFulfilled };
