const mongoose = require("mongoose");

const processedWebhookSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  eventType: {
    type: String,
  },
  processedAt: {
    type: Date,
    default: Date.now,
    expires: 90 * 24 * 60 * 60, // 90 days in seconds
  },
});

module.exports = mongoose.model("ProcessedWebhook", processedWebhookSchema);
