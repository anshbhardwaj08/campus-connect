const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { createNotification } = require('../services/notification.service');
const { setSocketIO } = require('../services/socketRegistry');
const { ADMIN_ROOM } = require('../services/adminFeed.service');
const { parseMessage, parseOfferAmount } = require('../utils/chatMessage');

// The conversation, if this user is in it; null otherwise. Every
// conversation event goes through this first. They used to trust whatever
// id the client sent: any signed-in student could join a stranger's room and
// read it live, post into it, or flip its deal status — and one message in
// the live database was posted into a thread by someone outside it.
const findOwnConversation = async (conversationId, userId) => {
  if (!mongoose.isValidObjectId(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, participants: userId });
};

// Everyone in the thread except the sender. A socket only receives
// `chat:message` if it has joined the conversation room, which means it is
// looking at the thread right now — so the other participant needs a
// notification to hear about it at all.
const notifyOtherParticipants = async (conversation, senderId, buildTitle, message) => {
  if (!conversation) return;
  const others = conversation.participants.filter((p) => String(p) !== String(senderId));
  if (!others.length) return;

  // "Aman Bedi" is a far more useful notification than "New message" —
  // worth one lean lookup per message.
  const sender = await User.findById(senderId).select('name').lean();
  const title = buildTitle(sender?.name || 'Someone');

  await Promise.all(
    others.map((userId) =>
      createNotification({
        userId,
        type: 'message',
        title,
        message,
        link: `/chat?conversation=${conversation._id}`,
      }).catch(() => {})
    )
  );
};

const setupSocket = (io) => {
  setSocketIO(io);

  // Authenticate the socket connection using the access token cookie/handshake auth
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split('; ')
          .find((c) => c.startsWith('accessToken='))
          ?.split('=')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // The token carries only a userId, and a socket authenticates once and
      // then lives on its own — so the role and the block check have to be
      // read here. Without the block check a suspended account keeps a live
      // socket and can go on sending chat messages through it, never
      // touching the HTTP middleware that would refuse them.
      const user = await User.findById(decoded.userId).select('role isBlocked').lean();
      if (!user) return next(new Error('Authentication required'));
      if (user.isBlocked) return next(new Error('Account suspended'));

      socket.userId = decoded.userId;
      socket.userRole = user.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId})`);

    // Personal room for direct notifications
    socket.join(String(socket.userId));

    // The dashboard's live feed. Students are never in this room, so
    // nothing emitted to it can leak to the marketplace side.
    if (socket.userRole === 'admin' || socket.userRole === 'moderator') {
      socket.join(ADMIN_ROOM);
    }

    const refuse = (message) => socket.emit('error', { message });

    // `ack` is optional: joining now waits on a database lookup, and a
    // caller that must not miss the next message can wait for { ok: true }.
    socket.on('conversation:join', async (conversationId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        if (!(await findOwnConversation(conversationId, socket.userId))) {
          reply({ ok: false });
          return refuse('Not a participant of this conversation');
        }
        socket.join(`conversation:${conversationId}`);
        reply({ ok: true });
      } catch {
        reply({ ok: false });
        refuse('Could not open that conversation');
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('chat:message', async ({ conversationId, text, imageUrl, type } = {}) => {
      try {
        const conversation = await findOwnConversation(conversationId, socket.userId);
        if (!conversation) return refuse('Not a participant of this conversation');

        const { value, error } = parseMessage({ text, imageUrl, type });
        if (error) return refuse(error);

        const message = await Message.create({
          conversationId: conversation._id,
          senderId: socket.userId,
          ...value,
        });

        conversation.lastMessage = value.type === 'text' ? value.text : `[${value.type}]`;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        io.to(`conversation:${conversation._id}`).emit('chat:message', message);
        await notifyOtherParticipants(
          conversation,
          socket.userId,
          (name) => `${name} messaged you`,
          value.type === 'text' ? value.text : 'Sent a photo'
        );
      } catch {
        refuse('Failed to send message');
      }
    });

    socket.on('chat:offer', async ({ conversationId, offerAmount } = {}) => {
      try {
        const conversation = await findOwnConversation(conversationId, socket.userId);
        if (!conversation) return refuse('Not a participant of this conversation');

        const { value: amount, error } = parseOfferAmount(offerAmount);
        if (error) return refuse(error);

        const message = await Message.create({
          conversationId: conversation._id,
          senderId: socket.userId,
          offerAmount: amount,
          type: 'offer',
        });

        conversation.lastMessage = `Offer: ₹${amount}`;
        conversation.lastMessageAt = new Date();
        conversation.dealStatus = 'offered';
        await conversation.save();

        io.to(`conversation:${conversation._id}`).emit('chat:offer', message);
        await notifyOtherParticipants(conversation, socket.userId, (name) => `${name} made an offer`, `₹${amount}`);
      } catch {
        refuse('Failed to send offer');
      }
    });

    // Only a relay. The deal itself — and dealStatus: 'agreed' — is written
    // by POST /deals/from-conversation, which checks that the caller is the
    // seller. This used to write dealStatus too, for anyone who asked.
    socket.on('deal:agreed', async ({ conversationId } = {}) => {
      try {
        if (!(await findOwnConversation(conversationId, socket.userId))) {
          return refuse('Not a participant of this conversation');
        }
        io.to(`conversation:${conversationId}`).emit('deal:agreed', { conversationId });
      } catch {
        refuse('Failed to update deal status');
      }
    });

    // `listing:priceUpdate` was removed: it rebroadcast whatever any client
    // sent to every connected socket, and nothing in either app listened.

    socket.on('admin:stats', () => {
      if (socket.rooms.has(ADMIN_ROOM)) {
        io.to(ADMIN_ROOM).emit('admin:stats', { requestedBy: socket.userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
