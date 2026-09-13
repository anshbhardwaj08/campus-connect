const Notification = require('../models/Notification');

let ioInstance = null;

// Called once from sockets/events.js after Socket.io server is created
const setSocketIO = (io) => {
  ioInstance = io;
};

const createNotification = async ({ userId, type, title, message, link }) => {
  const notification = await Notification.create({ userId, type, title, message, link });

  if (ioInstance) {
    ioInstance.to(String(userId)).emit('notification:new', notification);
  }

  return notification;
};

module.exports = { setSocketIO, createNotification };
