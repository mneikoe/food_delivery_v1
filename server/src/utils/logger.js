const sanitizeLogData = (data = {}) => {
  const sanitized = { ...data };
  const sensitiveKeys = ["otp", "otpCode", "otpHash", "token", "password", "passwordHash", "secret", "jwt", "authorization"];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  });
  return sanitized;
};

const log = (eventName, details = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = sanitizeLogData(details);
  console.log(`[${timestamp}] [${eventName}] ${JSON.stringify(sanitizedDetails)}`);
};

module.exports = {
  log,
  sanitizeLogData
};
