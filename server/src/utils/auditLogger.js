const AuditLog = require("../models/AuditLog");

const sanitizeAuditMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== "object") return metadata;
  const sanitized = { ...metadata };
  const sensitiveKeys = ["otp", "otpCode", "otpHash", "token", "password", "passwordHash", "secret", "jwt", "authorization", "email_pass"];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeAuditMetadata(sanitized[key]);
    }
  });
  return sanitized;
};

const logAudit = async ({ action, actorId, entityType, entityId, metadata }) => {
  try {
    const sanitizedMetadata = sanitizeAuditMetadata(metadata);
    await AuditLog.create({
      action,
      actorId,
      entityType,
      entityId,
      metadata: sanitizedMetadata
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
};

module.exports = {
  logAudit,
  sanitizeAuditMetadata
};
