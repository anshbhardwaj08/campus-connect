const Report = require('../models/Report');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');
const { emitAdminActivity } = require('../services/adminFeed.service');

// POST /reports
// Body is allow-listed by createReportSchema — status, adminNote and
// resolvedBy are not settable from here.
const submitReport = catchAsync(async (req, res) => {
  const { targetType, targetId } = req.body;

  if (targetType === 'user' && String(targetId) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot report yourself');
  }

  // Idempotent per open case: clicking report twice, or reporting the same
  // listing again next week while the first one is still open, should not
  // put two of the same thing in front of a moderator.
  const existing = await Report.findOne({
    reporterId: req.user._id,
    targetType,
    targetId,
    status: 'open',
  });
  if (existing) {
    return res.status(200).json(new ApiResponse(200, { report: existing }, 'You have already reported this'));
  }

  const report = await Report.create({ ...req.body, reporterId: req.user._id });

  emitAdminActivity('reports');

  return res.status(201).json(new ApiResponse(201, { report }, 'Report submitted'));
});

// GET /reports/me
const getMyReports = catchAsync(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { reporterId: req.user._id };

  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { reports }, 'Reports fetched', buildPagination(page, limit, total)));
});

module.exports = { submitReport, getMyReports };
