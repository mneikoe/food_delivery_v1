const mongoose = require("mongoose");

const couponRedemptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rewardTierId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardTier', required: true },
  coinsSpent: { type: Number, required: true },
  couponCode: { type: String, required: true },
  couponValue: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model("CouponRedemption", couponRedemptionSchema);
