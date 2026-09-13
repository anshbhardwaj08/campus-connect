const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /chat/conversations
const getConversations = catchAsync(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name avatar')
    .populate('listingId', 'title images price');

  return res.status(200).json(new ApiResponse(200, { conversations }, 'Conversations fetched'));
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

  await Message.updateMany(
    { conversationId: id, senderId: { $ne: req.user._id }, readAt: null },
    { readAt: new Date() }
  );

  return res.status(200).json(new ApiResponse(200, null, 'Messages marked as read'));
});

module.exports = { getConversations, getMessages, sendMessage, markRead };
