const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const generateOTP = require('../utils/generateOTP');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const redisClient = require('../config/redis');
const { sendVerifyEmail, sendOTPEmail, sendPasswordResetEmail } = require('../services/email.service');
const { sendPhoneOTP } = require('../services/sms.service');
const { winstonLogger } = require('../middleware/logger');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

// POST /auth/register
const register = catchAsync(async (req, res) => {
  const { name, email, phone, password, dept, batch, hostel } = req.body;
  const collegeEmail = req.body.collegeEmail.trim().toLowerCase();

  const existing = await User.findOne({ collegeEmail });
  if (existing) throw new ApiError(409, 'An account with this college email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    collegeEmail,
    phone,
    passwordHash,
    dept,
    batch,
    hostel,
  });

  const verifyToken = jwt.sign({ userId: user._id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '1d',
  });
  const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${verifyToken}`;

  try {
    await sendVerifyEmail(collegeEmail, verifyLink);
  } catch (err) {
    winstonLogger.error(`Failed to send verification email to ${collegeEmail}: ${err.message}`);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { userId: user._id }, 'Registered. Please verify your email.'));
});

// GET /auth/verify-email?token=...
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Verification token is required');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw new ApiError(400, 'Invalid or expired verification link');
  }

  const user = await User.findByIdAndUpdate(
    decoded.userId,
    { isEmailVerified: true },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, null, 'Email verified successfully'));
});

// POST /auth/send-otp
const sendOTP = catchAsync(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, 'Phone number is required');

  const otp = generateOTP();
  await redisClient.set(`otp:${phone}`, otp, 'EX', 600);
  const result = await sendPhoneOTP(phone, otp);

  // With Twilio unconfigured the code is mocked, so hand it back to the
  // client to make the flow completable in development. sms.service refuses
  // to mock in production, so `mocked` can never be true there — but the
  // NODE_ENV check stays as a second lock on leaking a live code.
  const devOtp =
    result?.mocked && process.env.NODE_ENV !== 'production' ? { devOtp: result.otp } : null;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        devOtp,
        result?.mocked ? 'OTP generated (SMS mocked — Twilio not configured)' : 'OTP sent successfully'
      )
    );
});

// POST /auth/verify-otp
const verifyOTP = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;

  const storedOTP = await redisClient.get(`otp:${phone}`);
  if (!storedOTP || storedOTP !== otp) throw new ApiError(400, 'Invalid or expired OTP');

  await redisClient.del(`otp:${phone}`);
  await User.findOneAndUpdate({ phone }, { isPhoneVerified: true });

  return res.status(200).json(new ApiResponse(200, null, 'Phone verified successfully'));
});

// POST /auth/forgot-password
//
// Always answers the same way, whether or not the account exists. Saying
// "no account with that email" here would turn this endpoint into a way to
// find out who is registered, one address at a time.
//
// The emailed token is random and single-use; only its SHA-256 is stored,
// so a leaked database does not yield working reset links. `passwordReset`
// fields are `select: false` on the model — see User.js.
const forgotPassword = catchAsync(async (req, res) => {
  const collegeEmail = req.body.collegeEmail.trim().toLowerCase();
  const SAME_ANSWER = 'If that account exists, a reset link is on its way.';

  const user = await User.findOne({ collegeEmail });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    // updateOne rather than save(): the document was fetched without the
    // `select: false` passwordHash, and writing through the model avoids
    // any question of required-field validation on a path that was never
    // loaded.
    await User.updateOne(
      { _id: user._id },
      { passwordResetToken: hashed, passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) }
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    try {
      await sendPasswordResetEmail(collegeEmail, resetLink);
    } catch (err) {
      // The student still gets the same answer — telling them the mail
      // failed would leak that the account exists.
      winstonLogger.error(`Failed to send reset email to ${collegeEmail}: ${err.message}`);
    }
  }

  return res.status(200).json(new ApiResponse(200, null, SAME_ANSWER));
});

// POST /auth/reset-password
const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'That reset link is invalid or has already been used');

  const passwordHash = await bcrypt.hash(password, 10);

  // Clearing the token makes the link single-use. Clearing refreshToken
  // ends every other session: if someone else had got in with the old
  // password, resetting it is exactly the moment they should be thrown out.
  await User.updateOne(
    { _id: user._id },
    {
      passwordHash,
      refreshToken: null,
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    }
  );

  winstonLogger.info(`Password reset completed for ${user.collegeEmail}`);

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Password changed. Sign in with the new one.'));
});

// POST /auth/login
const login = catchAsync(async (req, res) => {
  const { password } = req.body;
  // The User schema lowercases collegeEmail on save, but that transform
  // doesn't apply to query conditions — normalize here so login isn't
  // case-sensitive.
  const collegeEmail = req.body.collegeEmail.trim().toLowerCase();

  const user = await User.findOne({ collegeEmail }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid credentials');
  // Tagged so the client can send them to the suspended screen rather than
  // printing a bare 403 under the password field.
  if (user.isBlocked) {
    throw new ApiError(403, 'This account has been suspended').withCode('ACCOUNT_BLOCKED', {
      reason: user.banReason || null,
    });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  const userSafe = user.toObject();
  delete userSafe.passwordHash;
  delete userSafe.refreshToken;

  return res.status(200).json(new ApiResponse(200, { user: userSafe }, 'Logged in successfully'));
});

// POST /auth/refresh-token
const refreshToken = catchAsync(async (req, res) => {
  const user = req.user; // set by verifyRefreshToken middleware

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save();

  res
    .cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

  return res.status(200).json(new ApiResponse(200, null, 'Token refreshed'));
});

// POST /auth/logout
const logout = catchAsync(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }

  res.clearCookie('accessToken', cookieOptions).clearCookie('refreshToken', cookieOptions);

  return res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

module.exports = {
  register,
  verifyEmail,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  login,
  refreshToken,
  logout,
};
