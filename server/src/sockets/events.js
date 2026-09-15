const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { setSocketIO, createNotification } = require('../services/notification.service');

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
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split('; ')
          .find((c) => c.startsWith('accessToken='))
          ?.split('=')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId})`);

    // Personal room for direct notifications
    socket.join(String(socket.userId));

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('chat:message', async ({ conversationId, text, imageUrl, type = 'text' }) => {
      try {
        const message = await Message.create({
          conversationId,
          senderId: socket.userId,
          text,
          imageUrl,
          type,
        });

        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: type === 'text' ? text : `[${type}]`,
            lastMessageAt: new Date(),
          },
          { new: true }
        );

        io.to(`conversation:${conversationId}`).emit('chat:message', message);
        await notifyOtherParticipants(
          conversation,
          socket.userId,
          (name) => `${name} messaged you`,
          type === 'text' ? text : `Sent ${type === 'image' ? 'a photo' : 'an offer'}`
        );
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:offer', async ({ conversationId, offerAmount }) => {
      try {
        const message = await Message.create({
          conversationId,
          senderId: socket.userId,
          offerAmount,
          type: 'offer',
        });

        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: `Offer: ₹${offerAmount}`,
            lastMessageAt: new Date(),
            dealStatus: 'offered',
          },
          { new: true }
        );

        io.to(`conversation:${conversationId}`).emit('chat:offer', message);
        await notifyOtherParticipants(
          conversation,
          socket.userId,
          (name) => `${name} made an offer`,
          `₹${offerAmount}`
        );
      } catch (err) {
        socket.emit('error', { message: 'Failed to send offer' });
      }
    });

    socket.on('deal:agreed', async ({ conversationId }) => {
      try {
        await Conversation.findByIdAndUpdate(conversationId, { dealStatus: 'agreed' });
        io.to(`conversation:${conversationId}`).emit('deal:agreed', { conversationId });
      } catch (err) {
        socket.emit('error', { message: 'Failed to update deal status' });
      }
    });

    socket.on('listing:priceUpdate', ({ listingId, price }) => {
      io.emit('listing:priceUpdate', { listingId, price });
    });

    socket.on('admin:stats', () => {
      if (socket.rooms.has('admins')) {
        io.to('admins').emit('admin:stats', { requestedBy: socket.userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
