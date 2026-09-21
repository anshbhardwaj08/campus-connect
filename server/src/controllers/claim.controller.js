// The community handshake: one side asks, the post's owner confirms, and the
// post updates itself. Lost & found, wanted, carpool.
//
// It lives in the conversation rather than on the post's own card on
// purpose: the two of them have just agreed in the chat, and that is the
// moment somebody is willing to press a button. Asking the owner to go back
// to the board and remember to close the post is the step that never
// happened — hence rides that had already left still showing seats.
const mongoose = require('mongoose');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getSocketIO } = require('../services/socketRegistry');
const { createNotification } = require('../services/notification.service');
const { kindConfig, findSubjectPost, validateSeats, applyClaim } = require('../utils/communityClaim');

const loadThread = async (conversationId, userId) => {
  if (!mongoose.isValidObjectId(conversationId)) throw new ApiError(404, 'Conversation not found');
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  if (!conversation.participants.some((p) => String(p) === String(userId))) {
    throw new ApiError(403, 'Not a participant of this conversation');
  }
  const config = kindConfig(conversation.subject?.kind);
  if (!config) throw new ApiError(400, 'This conversation is not about a community post');
  return { conversation, config };
};

const broadcast = (conversation, event, message) => {
  getSocketIO()?.to(`conversation:${conversation._id}`).emit(event, message);
};

const otherParticipant = (conversation, userId) =>
  conversation.participants.find((p) => String(p) !== String(userId));

// POST /chat/conversations/:id/claim
const askClaim = catchAsync(async (req, res) => {
  const { conversation, config } = await loadThread(req.params.id, req.user._id);

  const post = await findSubjectPost(conversation.subject);
  if (!post) throw new ApiError(404, 'That post is gone');
  if (String(post.userId) === String(req.user._id)) {
    throw new ApiError(403, 'This is your own post');
  }
  if (post.status !== 'open') throw new ApiError(409, 'That post is already closed');

  const { value: seats, error } = validateSeats(conversation.subject.kind, req.body?.seats ?? 1);
  if (error) throw new ApiError(400, error);
  if (config.seats && seats > post.seatsAvailable) {
    throw new ApiError(409, `Only ${post.seatsAvailable} seat(s) left`);
  }

  // One open ask per thread. Without this, tapping twice leaves the owner
  // two cards for the same seat and two chances to double-book it.
  const pending = await Message.findOne({
    conversationId: conversation._id,
    type: 'claim',
    'claim.status': 'pending',
  });
  if (pending) throw new ApiError(409, 'You already have a request waiting on them');

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: req.user._id,
    type: 'claim',
    claim: { kind: conversation.subject.kind, seats, status: 'pending' },
  });

  const summary = config.seats ? `Asked for ${seats} seat(s)` : 'Says they have it';
  conversation.lastMessage = summary;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  broadcast(conversation, 'chat:message', message);
  await createNotification({
    userId: otherParticipant(conversation, req.user._id),
    type: 'chat',
    title: `${req.user.name} ${config.askedLine}`,
    message: conversation.subject.title || '',
    link: `/chat?conversation=${conversation._id}`,
  });

  return res.status(201).json(new ApiResponse(201, { message }, 'Sent'));
});

// PATCH /chat/claims/:messageId  { action: 'confirm' | 'decline' }
const decideClaim = catchAsync(async (req, res) => {
  const { action } = req.body || {};
  if (!['confirm', 'decline'].includes(action)) throw new ApiError(400, 'Unknown action');
  if (!mongoose.isValidObjectId(req.params.messageId)) throw new ApiError(404, 'Request not found');

  const message = await Message.findById(req.params.messageId);
  if (!message || message.type !== 'claim') throw new ApiError(404, 'Request not found');
  if (message.claim.status !== 'pending') throw new ApiError(409, 'That request was already answered');

  const { conversation, config } = await loadThread(message.conversationId, req.user._id);

  const post = await findSubjectPost(conversation.subject);
  if (!post) throw new ApiError(404, 'That post is gone');
  // Only the owner decides: the asker must not be able to close someone
  // else's post, or hand themselves a seat.
  if (String(post.userId) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the person who posted this can confirm it');
  }

  let outcome = null;
  if (action === 'confirm') {
    const applied = await applyClaim({
      kind: conversation.subject.kind,
      refId: conversation.subject.refId,
      seats: message.claim.seats,
    });
    if (applied.error) throw new ApiError(409, applied.error);
    outcome = applied;
  }

  message.claim.status = action === 'confirm' ? 'confirmed' : 'declined';
  message.claim.decidedAt = new Date();
  await message.save();

  conversation.lastMessage = action === 'confirm' ? 'Confirmed' : 'Not this one';
  conversation.lastMessageAt = new Date();
  await conversation.save();

  broadcast(conversation, 'chat:claim', message);
  await createNotification({
    userId: message.senderId,
    type: 'chat',
    title: action === 'confirm' ? 'Confirmed' : 'They said no',
    message: conversation.subject.title || '',
    link: `/chat?conversation=${conversation._id}`,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        message,
        post: outcome?.post || null,
        closed: Boolean(outcome?.closed),
      },
      action === 'confirm' ? config.settledLine : 'Turned down'
    )
  );
});

module.exports = { askClaim, decideClaim };
