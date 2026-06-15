const Joi = require("joi");

const createReviewSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid Product ID format",
    "any.required": "productId is required to create a review"
  }),
  orderId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid Order ID format",
    "any.required": "orderId is required to create a review"
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Rating must be at least 1 star",
    "number.max": "Rating cannot exceed 5 stars",
    "any.required": "Rating score is required"
  }),
  comment: Joi.string().allow("").trim().max(500).optional()
});

module.exports = {
  createReviewSchema
};
