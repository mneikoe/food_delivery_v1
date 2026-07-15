const mongoose = require("mongoose");

const webhookLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true, // Idempotency check (prevent processing twice)
      index: true,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "DUPLICATE", "REJECTED", "INVALID_SIGNATURE"],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    stackTrace: {
      type: String,
    },
    latency: {
      type: Number, // milliseconds
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    environment: {
      type: String,
      default: "development",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WebhookLog", webhookLogSchema);
