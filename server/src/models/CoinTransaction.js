const mongoose = require("mongoose");

const coinTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['GAME_REWARD', 'MISSION_REWARD', 'STREAK_REWARD', 'DAILY_REWARD', 'COUPON_REDEMPTION', 'ADMIN_ADJUSTMENT', 'REFERRAL_BONUS', 'REFERRAL_SIGNUP_BONUS'],
    required: true
  },
  coins: { type: Number, required: true },
 // positive for earning, negative for spend
  source: { type: String, required: true }, // e.g. 'Feed the Puppy', 'Streak Bonus'
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // Links to GameResult, UserMissionProgress, etc.
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model("CoinTransaction", coinTransactionSchema);
