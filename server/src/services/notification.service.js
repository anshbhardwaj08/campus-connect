const Notification = require('../models/Notification');
const { getSocketIO } = require('./socketRegistry');

const createNotification = async ({ userId, type, title, message, link }) => {
  const notification = await Notification.create({ userId, type, title, message, link });

  getSocketIO()?.to(String(userId)).emit('notification:new', notification);

  return notification;
};

module.exports = { createNotification };
