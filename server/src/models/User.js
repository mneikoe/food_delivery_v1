const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    trim: true,
    sparse: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ["USER", "ADMIN", "DELIVERY_PARTNER"],
    default: "USER",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Made optional — was required when using Supabase; now custom auth
  supabaseId: {
    type: String,
  },
  // For email+password auth
  passwordHash: {
    type: String,
  },
  // For custom OTP auth (stored in DB as bcrypt hash, expires in 30 min)
  otpHash: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
  lastOtpSentAt: {
    type: Date,
  },
  otpCount: {
    type: Number,
    default: 0,
  },
  otpWindowStart: {
    type: Date,
  },
  fcmTokens: [
    {
      token: { type: String, required: true },
      platform: { type: String, required: true }, // 'android', 'ios', etc.
      appVersion: String,
      updatedAt: { type: Date, default: Date.now },
    }
  ],
  notificationSettings: {
    marketing: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    gameNotifications: { type: Boolean, default: true },
    couponNotifications: { type: Boolean, default: true },
  },
  // Location fields
  location: {
    latitude: Number,
    longitude: Number,
    suburb: String,
    city: String,
    state: String,
    country: String,
    address: String,
    updatedAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  coins: {
    type: Number,
    default: 0,
  },
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ "fcmTokens.token": 1 });

module.exports = mongoose.model("User", userSchema);
