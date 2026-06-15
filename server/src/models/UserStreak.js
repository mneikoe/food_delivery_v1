const mongoose = require("mongoose");

const userStreakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentStreak: { type: Number, default: 0 },
  lastPlayDate: { type: String }, // 'YYYY-MM-DD'
  claimedStreakToday: { type: Boolean, default: false }
});

module.exports = mongoose.model("UserStreak", userStreakSchema);
