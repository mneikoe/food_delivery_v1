const mongoose = require("mongoose");

const rewardTierSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "₹5 Off Coupon"
  coinsRequired: { type: Number, required: true }, // e.g. 100
  couponValue: { type: Number, required: true }, // e.g. 5
  weeklyLimit: { type: Number, default: 1 },
  monthlyLimit: { type: Number, default: 4 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
});

module.exports = mongoose.model("RewardTier", rewardTierSchema);
