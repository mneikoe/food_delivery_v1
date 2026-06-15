const Joi = require("joi");

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).optional().messages({
    "string.min": "Name must be at least 2 characters long"
  }),
  phone: Joi.string().pattern(/^\d{10}$/).optional().messages({
    "string.pattern.base": "Phone number must be exactly 10 digits"
  })
});

module.exports = {
  updateProfileSchema
};
