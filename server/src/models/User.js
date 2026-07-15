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
    enum: ["USER", "ADMIN", "DELIVERY_PARTNER", "CUSTOMER"],
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
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ "fcmTokens.token": 1 });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

// Auto-generate unique referral code on creation
userSchema.pre("save", async function (next) {
  if (!this.referralCode) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let isUnique = false;
    let code;
    while (!isUnique) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.constructor.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
      }
    }
    this.referralCode = code;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
