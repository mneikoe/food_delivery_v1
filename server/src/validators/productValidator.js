const Joi = require("joi");

const createProductSchema = Joi.object({
  name: Joi.string().required().trim().messages({
    "any.required": "Product name is required"
  }),
  description: Joi.string().allow("").trim().optional(),
  price: Joi.number().min(0).required().messages({
    "number.min": "Price must be a non-negative number",
    "any.required": "Price is required"
  }),
  categoryId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid Category ID format",
    "any.required": "categoryId is required"
  }),
  isVeg: Joi.boolean().default(true),
  isAvailable: Joi.boolean().default(true),
  preparationTime: Joi.number().integer().min(1).default(15)
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow("").trim().optional(),
  price: Joi.number().min(0).optional(),
  categoryId: Joi.string().hex().length(24).optional(),
  isVeg: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional(),
  preparationTime: Joi.number().integer().min(1).optional()
});

module.exports = {
  createProductSchema,
  updateProductSchema
};
