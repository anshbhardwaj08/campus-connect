const Report = require('../models/Report');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { paginate, buildPagination } = require('../utils/paginate');

// POST /reports
const submitReport = catchAsync(async (req, res) => {
  const report = await Report.create({ ...req.body, reporterId: req.user._id });
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
