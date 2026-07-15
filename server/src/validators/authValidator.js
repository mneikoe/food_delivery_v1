const Joi = require("joi");

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required"
  }),
  referralCode: Joi.string().allow("").optional()
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required"
  }),
  otp: Joi.string().pattern(/^\d{4}$/).required().messages({
    "string.pattern.base": "OTP must be a 4-digit number",
    "any.required": "OTP is required"
  }),
  referralCode: Joi.string().allow("").optional()
});


const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required"
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required"
  })
});

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema
};
