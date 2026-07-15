const mongoose = require("mongoose");

const paymentEventSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    webhookLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebhookLog",
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    oldStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
    },
    processingDuration: {
      type: Number, // milliseconds
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

module.exports = mongoose.model("PaymentEvent", paymentEventSchema);
