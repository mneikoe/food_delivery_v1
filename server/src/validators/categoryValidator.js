const Joi = require("joi");

const createCategorySchema = Joi.object({
  name: Joi.string().required().trim().messages({
    "any.required": "Category name is required"
  }),
  description: Joi.string().allow("").trim().optional()
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow("").trim().optional()
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
