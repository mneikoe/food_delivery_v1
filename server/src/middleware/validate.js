const validate = (schema, path = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[path], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errorMessages
      });
    }

    // Replace request payload with sanitized, validated values
    req[path] = value;
    next();
  };
};

module.exports = validate;
