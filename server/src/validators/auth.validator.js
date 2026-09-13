const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  collegeEmail: Joi.string().email().required(),
  phone: Joi.string().trim().min(8).max(15).required(),
  password: Joi.string().min(8).max(128).required(),
  dept: Joi.string().trim().allow(''),
  batch: Joi.string().trim().allow(''),
  hostel: Joi.string().trim().allow(''),
});

const loginSchema = Joi.object({
  collegeEmail: Joi.string().email().required(),
  password: Joi.string().required(),
});

const otpSchema = Joi.object({
  phone: Joi.string().trim().min(8).max(15).required(),
  otp: Joi.string().length(6).required(),
});

module.exports = { registerSchema, loginSchema, otpSchema };
