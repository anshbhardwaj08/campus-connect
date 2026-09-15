const express = require('express');
const authController = require('../controllers/auth.controller');
const validateCollegeEmail = require('../middleware/collegeEmail');
const { verifyRefreshToken, verifyAccessToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, otpSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), validateCollegeEmail, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/send-otp', authLimiter, authController.sendOTP);
router.post('/verify-otp', authLimiter, validate(otpSchema), authController.verifyOTP);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', verifyRefreshToken, authController.refreshToken);
router.post('/logout', verifyAccessToken, authController.logout);

module.exports = router;
