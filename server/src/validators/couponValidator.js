const Joi = require("joi");

const validateCouponSchema = Joi.object({
  code: Joi.string().required().trim().uppercase().messages({
    "any.required": "Coupon code is required"
  }),
  orderAmount: Joi.number().min(0).required().messages({
    "any.required": "Order amount is required to validate a coupon"
  })
});

const createCouponSchema = Joi.object({
  code: Joi.string().required().trim().uppercase().messages({
    "any.required": "Coupon code is required"
  }),
  discountType: Joi.string().valid("PERCENTAGE", "FIXED").required(),
  discountValue: Joi.number().min(1).required(),
  minOrderAmount: Joi.number().min(0).default(0),
  maxDiscountAmount: Joi.number().min(0).optional(),
  expiryDate: Joi.date().greater("now").required(),
  isActive: Joi.boolean().default(true)
});

const updateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().optional(),
  discountType: Joi.string().valid("PERCENTAGE", "FIXED").optional(),
  discountValue: Joi.number().min(1).optional(),
  minOrderAmount: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional(),
  expiryDate: Joi.date().greater("now").optional(),
  isActive: Joi.boolean().optional()
});

module.exports = {
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema
};
