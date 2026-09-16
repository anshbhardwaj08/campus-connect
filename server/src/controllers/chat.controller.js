const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Listing = require('../models/Listing');
const LookingFor = require('../models/LookingFor');
const Carpool = require('../models/Carpool');
const LostFound = require('../models/LostFound');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /chat/conversations
const getConversations = catchAsync(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name avatar')
    .populate('listingId', 'title images price sellerId listingType rentPeriod securityDeposit')
    .lean();

  // Unread counts come from here rather than being tracked on the client:
  // the masthead badge has to be right on a cold page load, before any
  // socket has connected.
  const counts = await Message.aggregate([
    {
      $match: {
        conversationId: { $in: conversations.map((c) => c._id) },
        senderId: { $ne: req.user._id },
        readAt: null,
      },
    },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } },
  ]);

  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  conversations.forEach((c) => {
    c.unreadCount = byId.get(String(c._id)) || 0;
  });

  return res.status(200).json(new ApiResponse(200, { conversations }, 'Conversations fetched'));
});

// Where each kind of post keeps its owner and its title, so one lookup
// serves all four.
const SUBJECTS = {
  listing: { model: Listing, owner: 'sellerId', title: 'title' },
  lookingfor: { model: LookingFor, owner: 'userId', title: 'title' },
  carpool: { model: Carpool, owner: 'userId', title: null }, // built from from/to
  lostfound: { model: LostFound, owner: 'userId', title: 'title' },
};

const describeCarpool = (ride) => `Ride: ${ride.from} to ${ride.to}`;

// POST /chat/conversations
//
// Starts a thread about a listing OR about a community post (a want, a ride,
// a lost item) and returns the existing one if there is one. Idempotent:
// clicking "message" twice lands in the same thread rather than opening a
// duplicate.
//
// Accepts either `{ listingId }` (the original shape, still used by
// "Message the seller") or `{ subjectType, subjectId }`.
const startConversation = catchAsync(async (req, res) => {
  const { listingId, subjectType, subjectId } = req.body;

  const kind = listingId ? 'listing' : subjectType;
  const refId = listingId || subjectId;

  if (!kind || !refId) throw new ApiError(400, 'Nothing to start a conversation about');

  const spec = SUBJECTS[kind];
  if (!spec) throw new ApiError(400, 'That is not something you can message about');

  const doc = await spec.model.findById(refId);
  if (!doc) throw new ApiError(404, 'That post is gone');

  const ownerId = String(doc[spec.owner]);
  const meId = String(req.user._id);
  if (ownerId === meId) throw new ApiError(400, 'That is your own post');

  // Opening a thread with a suspended account would only ever be a message
  // into a void — they cannot reply while the suspension stands. Their
  // content should already be hidden, so this is the backstop for a link
  // someone still has open.
  const owner = await User.findById(ownerId, 'isBlocked');
  if (!owner || owner.isBlocked) throw new ApiError(404, 'That post is gone');

  const title = kind === 'carpool' ? describeCarpool(doc) : doc[spec.title];

  // Match on the subject either way, so a listing thread started before
  // subjects existed is still found by its listingId.
  const match =
    kind === 'listing'
      ? { listingId: refId, participants: { $all: [meId, ownerId] } }
      : { 'subject.refId': refId, participants: { $all: [meId, ownerId] } };

  let conversation = await Conversation.findOne(match);

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [meId, ownerId],
      ...(kind === 'listing' ? { listingId: refId } : {}),
      subject: { kind, refId, title },
    });
  }

  await conversation.populate([
    { path: 'participants', select: 'name avatar' },
    { path: 'listingId', select: 'title images price sellerId listingType rentPeriod securityDeposit' },
  ]);

  return res.status(200).json(new ApiResponse(200, { conversation }, 'Conversation ready'));
});

// GET /chat/conversations/:id/messages
const getMessages = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = paginate(req.query, 1, 30);

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (!conversation.participants.some((p) => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Not a participant of this conversation');
  }

  const [messages, total] = await Promise.all([
    Message.find({ conversationId: id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments({ conversationId: id }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { messages }, 'Messages fetched', buildPagination(page, limit, total)));
});

// POST /chat/conversations/:id/messages
const sendMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { text, imageUrl, type = 'text' } = req.body;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  // Without this, anyone holding a conversation id could post into a stranger's
  // thread. getMessages already checks; sendMessage did not.
  if (!conversation.participants.some((p) => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Not a participant of this conversation');
  }

  const message = await Message.create({
    conversationId: id,
    senderId: req.user._id,
    text,
    imageUrl,
    type,
  });

  conversation.lastMessage = type === 'text' ? text : `[${type}]`;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  return res.status(201).json(new ApiResponse(201, { message }, 'Message sent'));
});

// PATCH /chat/conversations/:id/read
const markRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (!conversation.participants.some((p) => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Not a participant of this conversation');
  }

  await Message.updateMany(
    { conversationId: id, senderId: { $ne: req.user._id }, readAt: null },
    { readAt: new Date() }
  );

  return res.status(200).json(new ApiResponse(200, null, 'Messages marked as read'));
});

module.exports = { getConversations, startConversation, getMessages, sendMessage, markRead };
