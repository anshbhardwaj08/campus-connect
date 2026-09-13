const Carpool = require('../models/Carpool');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// POST /carpool
const post = catchAsync(async (req, res) => {
  const ride = await Carpool.create({ ...req.body, userId: req.user._id });
  return res.status(201).json(new ApiResponse(201, { ride }, 'Ride posted'));
});

// GET /carpool
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { from, to } = req.query;
  const filter = {
    status: 'open',
    ...(from && { from: new RegExp(from, 'i') }),
    ...(to && { to: new RegExp(to, 'i') }),
  };

  const [rides, total] = await Promise.all([
    Carpool.find(filter).sort({ departureDate: 1 }).skip(skip).limit(limit).populate('userId', 'name avatar'),
    Carpool.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { rides }, 'Rides fetched', buildPagination(page, limit, total)));
});

// DELETE /carpool/:id
const deleteRide = catchAsync(async (req, res) => {
  const ride = await Carpool.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!ride) throw new ApiError(404, 'Ride not found');

  return res.status(200).json(new ApiResponse(200, null, 'Ride deleted'));
});

module.exports = { post, getAll, delete: deleteRide };
