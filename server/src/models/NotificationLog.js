const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  targetType: {
    type: String,
    enum: ["ALL_USERS", "CUSTOMERS", "DELIVERY_PARTNERS", "ADMINS", "SINGLE_USER"],
    required: true,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  failedCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["SENT", "FAILED", "SIMULATED"],
    default: "SENT",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
