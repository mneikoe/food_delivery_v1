const mongoose = require("mongoose");

const gameEconomySettingsSchema = new mongoose.Schema({
  // --- Number Tap Game Core Settings ---
  attemptsPerSession: { type: Number, default: 10 },   // clicks per session
  coinsPerCorrect: { type: Number, default: 2 },        // coins per correct tap
  maxSessionsPerDay: { type: Number, default: 3 },      // sessions a user can play per day
  bonusCoins: { type: Number, default: 5 },             // extra coins if ALL attempts are correct
  isActive: { type: Boolean, default: true },           // enable/disable game

  // --- Coin Redemption Settings (kept from before) ---
  weeklyCoinRedemptionLimit: { type: Number, default: 500 },
  dailyRewardAmount: { type: Number, default: 10 },
});

module.exports = mongoose.model("GameEconomySettings", gameEconomySettingsSchema);
