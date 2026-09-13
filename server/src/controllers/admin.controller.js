const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Deal = require('../models/Deal');
const Report = require('../models/Report');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// GET /admin/stats
const getDashboardStats = catchAsync(async (req, res) => {
  const [totalUsers, totalListings, totalDeals, openReports, activeListings] = await Promise.all([
    User.countDocuments(),
    Listing.countDocuments(),
    Deal.countDocuments({ status: 'completed' }),
    Report.countDocuments({ status: 'open' }),
    Listing.countDocuments({ status: 'active' }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { totalUsers, totalListings, activeListings, totalDeals, openReports },
      'Dashboard stats fetched'
    )
  );
});

// GET /admin/users
const getUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search } = req.query;
  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { collegeEmail: new RegExp(search, 'i') }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { users }, 'Users fetched', buildPagination(page, limit, total)));
});

// PATCH /admin/users/:id/ban
const banUser = catchAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, { user }, 'User banned'));
});

// PATCH /admin/users/:id/unban
const unbanUser = catchAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, { user }, 'User unbanned'));
});

// GET /admin/listings
const getListings = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status } = req.query;
  const filter = status ? { status } : {};

  const [listings, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('sellerId', 'name collegeEmail'),
    Listing.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { listings }, 'Listings fetched', buildPagination(page, limit, total)));
});

// PATCH /admin/listings/:id/approve
const approveListing = catchAsync(async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing approved'));
});

// PATCH /admin/listings/:id/reject
const rejectListing = catchAsync(async (req, res) => {
  const { rejectionReason } = req.body;
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectionReason },
    { new: true }
  );
  if (!listing) throw new ApiError(404, 'Listing not found');

  return res.status(200).json(new ApiResponse(200, { listing }, 'Listing rejected'));
});

// GET /admin/reports
const getReports = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status } = req.query;
  const filter = status ? { status } : {};

  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporterId', 'name collegeEmail'),
    Report.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { reports }, 'Reports fetched', buildPagination(page, limit, total)));
});

// PATCH /admin/reports/:id/resolve
const resolveReport = catchAsync(async (req, res) => {
  const { adminNote, status = 'resolved' } = req.body;

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status, adminNote, resolvedBy: req.user._id },
    { new: true }
  );
  if (!report) throw new ApiError(404, 'Report not found');

  return res.status(200).json(new ApiResponse(200, { report }, 'Report updated'));
});

// POST /admin/notifications/broadcast
const broadcastNotif = catchAsync(async (req, res) => {
  const { title, message, link } = req.body;

  const users = await User.find({}, '_id');
  const notifications = users.map((user) => ({
    userId: user._id,
    type: 'broadcast',
    title,
    message,
    link,
  }));

  await Notification.insertMany(notifications);

  return res.status(201).json(new ApiResponse(201, { count: notifications.length }, 'Broadcast sent'));
});

// GET /admin/logs
const getLogs = catchAsync(async (req, res) => {
  const logPath = path.join('logs', 'combined.log');
  if (!fs.existsSync(logPath)) {
    return res.status(200).json(new ApiResponse(200, { logs: [] }, 'No logs found'));
  }

  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').slice(-200);
  const logs = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return res.status(200).json(new ApiResponse(200, { logs }, 'Logs fetched'));
});

// GET /admin/categories
const getCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ order: 1 });
  return res.status(200).json(new ApiResponse(200, { categories }, 'Categories fetched'));
});

// POST /admin/categories
const createCategory = catchAsync(async (req, res) => {
  const category = await Category.create(req.body);
  return res.status(201).json(new ApiResponse(201, { category }, 'Category created'));
});

module.exports = {
  getDashboardStats,
  getUsers,
  banUser,
  unbanUser,
  getListings,
  approveListing,
  rejectListing,
  getReports,
  resolveReport,
  broadcastNotif,
  getLogs,
  getCategories,
  createCategory,
};
