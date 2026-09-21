const Event = require('../models/Event');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');
const { excludeBlocked } = require('../utils/blockedUsers');
const mongoose = require('mongoose');

// What a caller may know about an event. The attendee list itself never
// leaves the server — the board is public, and who is going to what is not
// everybody's business. Each card carries the count, and, for whoever is
// signed in, whether they are on the list.
const forViewer = (event, userId) => {
  const doc = event.toObject ? event.toObject() : event;
  const attendees = doc.attendees || [];
  const { attendees: _hidden, ...rest } = doc;
  return {
    ...rest,
    rsvpCount: attendees.length,
    spotsLeft: doc.capacity ? Math.max(doc.capacity - attendees.length, 0) : null,
    isGoing: userId ? attendees.some((a) => String(a.userId) === String(userId)) : false,
  };
};

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

  return res.status(200).json(
    new ApiResponse(
      200,
      { events: events.map((e) => forViewer(e, req.user?._id)) },
      'Events fetched',
      buildPagination(page, limit, total)
    )
  );
});

// GET /events/:id
const getById = catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizerId', 'name avatar');
  if (!event) throw new ApiError(404, 'Event not found');

  return res
    .status(200)
    .json(new ApiResponse(200, { event: forViewer(event, req.user?._id) }, 'Event fetched'));
});

// PATCH /events/:id/rsvp — "I'm going"
//
// This used to be `$inc: { rsvpCount: 1 }` on whatever id it was handed:
// nobody was recorded, tapping twice counted twice, and the number on the
// card meant nothing. Now it is one conditional update that adds the person
// to the list, refuses a full event and refuses one that has happened.
const rsvp = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Event not found');

  const going = await Event.findOneAndUpdate(
    {
      _id: id,
      date: { $gt: new Date() },
      'attendees.userId': { $ne: req.user._id },
      $expr: {
        $or: [
          { $eq: [{ $ifNull: ['$capacity', null] }, null] },
          { $lt: [{ $size: '$attendees' }, '$capacity'] },
        ],
      },
    },
    { $push: { attendees: { userId: req.user._id, at: new Date() } }, $inc: { rsvpCount: 1 } },
    { new: true }
  ).populate('organizerId', 'name avatar');

  if (going) {
    return res
      .status(200)
      .json(new ApiResponse(200, { event: forViewer(going, req.user._id) }, 'You are down as going'));
  }

  // Nothing changed: work out which of the reasons it was, so the person is
  // told something true rather than "could not do that".
  const event = await Event.findById(id).populate('organizerId', 'name avatar');
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.attendees.some((a) => String(a.userId) === String(req.user._id))) {
    // Tapping twice is not an error — they are going either way.
    return res
      .status(200)
      .json(new ApiResponse(200, { event: forViewer(event, req.user._id) }, 'You are already going'));
  }
  if (event.date <= new Date()) throw new ApiError(409, 'That one has already happened');
  throw new ApiError(409, 'That event is full');
});

// DELETE /events/:id/rsvp — "actually, I can't"
const cancelRsvp = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Event not found');

  const event = await Event.findOneAndUpdate(
    { _id: id, 'attendees.userId': req.user._id },
    { $pull: { attendees: { userId: req.user._id } }, $inc: { rsvpCount: -1 } },
    { new: true }
  ).populate('organizerId', 'name avatar');

  if (!event) {
    const exists = await Event.findById(id).populate('organizerId', 'name avatar');
    if (!exists) throw new ApiError(404, 'Event not found');
    // Cancelling something you were not going to is not worth an error.
    return res
      .status(200)
      .json(new ApiResponse(200, { event: forViewer(exists, req.user._id) }, 'You were not going'));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { event: forViewer(event, req.user._id) }, 'Taken off the list'));
});

// DELETE /events/:id
const deleteEvent = catchAsync(async (req, res) => {
  const event = await Event.findOneAndDelete({ _id: req.params.id, organizerId: req.user._id });
  if (!event) throw new ApiError(404, 'Event not found');

  return res.status(200).json(new ApiResponse(200, null, 'Event deleted'));
});

module.exports = { create, getAll, getById, rsvp, cancelRsvp, delete: deleteEvent };
