const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /notifications
const getAll = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { userId: req.user._id };

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { notifications }, 'Notifications fetched', buildPagination(page, limit, total))
    );
});

// PATCH /notifications/:id/read
const markRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');

  return res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
});

// PATCH /notifications/read-all
const markAllRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

// DELETE /notifications/:id
const deleteNotification = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!notification) throw new ApiError(404, 'Notification not found');

  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted'));
});

module.exports = { getAll, markRead, markAllRead, delete: deleteNotification };
