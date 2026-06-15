const AppError = require("../utils/AppError");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
  let errors = [];

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err.errors).map((error) => error.message);
    message = "Validation failed";
    errorCode = "VALIDATION_ERROR";
  }

  // Mongoose duplicate key error
  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    errorCode = "DUPLICATE_KEY_ERROR";
  }

  // JWT error
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    errorCode = "AUTH_ERROR";
  }

  // Handle Joi validation errors if forwarded here
  else if (err.isJoi) {
    statusCode = 400;
    message = "Validation failed";
    errorCode = "VALIDATION_ERROR";
    errors = err.details.map((detail) => detail.message);
  }

  // Keep compatibility with frontend error checking
  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    error: message, // Backward compatibility key
    errors: errors.length > 0 ? errors : [message]
  });
};

module.exports = errorHandler;

module.exports = errorHandler;
