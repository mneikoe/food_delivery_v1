const crypto = require("crypto");
const logger = require("../utils/logger");

const observabilityMiddleware = (req, res, next) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.id = requestId;
  const startTime = process.hrtime();
  const timestamp = new Date().toISOString();

  // Log REQUEST_START
  logger.log("REQUEST_START", {
    requestId,
    method: req.method,
    route: req.originalUrl || req.url,
    timestamp
  });

  // Intercept response finish
  res.on("finish", () => {
    const diff = process.hrtime(startTime);
    const responseTimeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const statusCode = res.statusCode;

    // Log REQUEST_END
    logger.log("REQUEST_END", {
      requestId,
      method: req.method,
      route: req.originalUrl || req.url,
      statusCode,
      responseTime: `${responseTimeMs}ms`,
      timestamp: new Date().toISOString()
    });

    // Log SLOW_REQUEST
    if (parseFloat(responseTimeMs) > 1000) {
      logger.log("SLOW_REQUEST", {
        requestId,
        method: req.method,
        route: req.originalUrl || req.url,
        statusCode,
        responseTime: `${responseTimeMs}ms`,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

module.exports = observabilityMiddleware;
