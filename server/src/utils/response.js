const successResponse = (res, statusCode = 200, message = "Success", data = null) => {
  const payload = {
    success: true,
    message
  };
  if (data !== null) {
    // If data is already an object containing details or properties, we merge or keep it.
    // To preserve frontend compatibility, if data has top-level keys like token or user, 
    // we can merge them or put them inside a data object. Let's merge them for top-level keys
    // when they are expected at the root of the response, or include a data key if needed.
    if (typeof data === "object" && !Array.isArray(data)) {
      Object.assign(payload, data);
    } else {
      payload.data = data;
    }
  }
  return res.status(statusCode).json(payload);
};

const errorResponse = (res, statusCode = 500, message = "Error occurred", errorCode = "INTERNAL_SERVER_ERROR", errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    errors: Array.isArray(errors) ? errors : [errors]
  });
};

module.exports = {
  successResponse,
  errorResponse
};
