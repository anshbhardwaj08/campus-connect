const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const verifyAccessToken = catchAsync(async (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (!token) throw new ApiError(401, 'Access token missing');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  const user = await User.findById(decoded.userId).select('-passwordHash -refreshToken');
  if (!user) throw new ApiError(401, 'User not found');
  // Someone blocked mid-session hits this on every request. Tagging it lets
  // the client end the session and explain, instead of every page quietly
  // failing.
  if (user.isBlocked) {
    throw new ApiError(403, 'This account has been suspended').withCode('ACCOUNT_BLOCKED');
  }

  req.user = user;
  next();
});

const verifyRefreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, 'Refresh token revoked or invalid');
  }

  req.user = user;
  next();
});

module.exports = { verifyAccessToken, verifyRefreshToken };
