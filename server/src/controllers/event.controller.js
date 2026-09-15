const Event = require('../models/Event');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');
const { excludeBlocked } = require('../utils/blockedUsers');

// POST /events
const create = catchAsync(async (req, res) => {
  const imageUrl = req.file ? req.file.path : undefined;
  const event = await Event.create({ ...req.body, imageUrl, organizerId: req.user._id });
  return res.status(201).json(new ApiResponse(201, { event }, 'Event created'));
});

// GET /events
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  // A suspended organiser's events come down with the rest of their content.
  const filter = { date: { $gte: new Date() }, ...(await excludeBlocked('organizerId')) };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizerId', 'name avatar'),
    Event.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { events }, 'Events fetched', buildPagination(page, limit, total)));
});

// GET /events/:id
const getById = catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizerId', 'name avatar');
  if (!event) throw new ApiError(404, 'Event not found');

  return res.status(200).json(new ApiResponse(200, { event }, 'Event fetched'));
});

// PATCH /events/:id/rsvp
const rsvp = catchAsync(async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $inc: { rsvpCount: 1 } },
    { new: true }
  );
  if (!event) throw new ApiError(404, 'Event not found');

  return res.status(200).json(new ApiResponse(200, { event }, 'RSVP recorded'));
});

// DELETE /events/:id
const deleteEvent = catchAsync(async (req, res) => {
  const event = await Event.findOneAndDelete({ _id: req.params.id, organizerId: req.user._id });
  if (!event) throw new ApiError(404, 'Event not found');

  return res.status(200).json(new ApiResponse(200, null, 'Event deleted'));
});

module.exports = { create, getAll, getById, rsvp, delete: deleteEvent };
