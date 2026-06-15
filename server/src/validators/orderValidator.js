const Joi = require("joi");

const createOrderSchema = Joi.object({
  addressId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid Address ID format",
    "any.required": "addressId is required to place an order"
  }),
  paymentMethod: Joi.string().valid("COD", "RAZORPAY").required().messages({
    "any.only": "Payment method must be either COD or RAZORPAY",
    "any.required": "Payment method is required"
  }),
  couponCode: Joi.string().allow("").optional(),
  redeemCoins: Joi.boolean().optional()
});

module.exports = {
  createOrderSchema
};
