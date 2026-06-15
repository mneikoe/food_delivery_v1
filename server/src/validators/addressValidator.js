const Joi = require("joi");

const createAddressSchema = Joi.object({
  title: Joi.string().required().trim().messages({
    "any.required": "Title is required"
  }),
  addressLine1: Joi.string().required().trim().messages({
    "any.required": "Address line 1 is required"
  }),
  addressLine2: Joi.string().allow("").trim().optional(),
  landmark: Joi.string().allow("").trim().optional(),
  city: Joi.string().required().trim().messages({
    "any.required": "City is required"
  }),
  state: Joi.string().required().trim().messages({
    "any.required": "State is required"
  }),
  pincode: Joi.string().required().trim().messages({
    "any.required": "Pincode is required"
  }),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required().messages({
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
      "any.required": "Latitude coordinate is required"
    }),
    lng: Joi.number().min(-180).max(180).required().messages({
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
      "any.required": "Longitude coordinate is required"
    })
  }).required().messages({
    "any.required": "Coordinates are required"
  }),
  isDefault: Joi.boolean().optional()
});

const updateAddressSchema = Joi.object({
  title: Joi.string().trim().optional(),
  addressLine1: Joi.string().trim().optional(),
  addressLine2: Joi.string().allow("").trim().optional(),
  landmark: Joi.string().allow("").trim().optional(),
  city: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  pincode: Joi.string().trim().optional(),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).optional(),
    lng: Joi.number().min(-180).max(180).optional()
  }).optional(),
  isDefault: Joi.boolean().optional()
});

module.exports = {
  createAddressSchema,
  updateAddressSchema
};
