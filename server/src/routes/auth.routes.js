const express = require('express');
const authController = require('../controllers/auth.controller');
const validateCollegeEmail = require('../middleware/collegeEmail');
const { verifyRefreshToken, verifyAccessToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  otpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), validateCollegeEmail, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/send-otp', authLimiter, authController.sendOTP);
router.post('/verify-otp', authLimiter, validate(otpSchema), authController.verifyOTP);
// passwordResetLimiter, not authLimiter: this one has to count successful
// requests, since "send a reset email" is abusable precisely when it works.
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', verifyRefreshToken, authController.refreshToken);
router.post('/logout', verifyAccessToken, authController.logout);

module.exports = router;
