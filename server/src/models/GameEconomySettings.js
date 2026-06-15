const mongoose = require("mongoose");

const gameEconomySettingsSchema = new mongoose.Schema({
  maxDailyPlays: { type: Number, default: 5 },
  coinsPerTreat: { type: Number, default: 5 },
  goldenBoneSpawnChance: { type: Number, default: 0.05 },
  goldenBoneReward: { type: Number, default: 25 },
  streakRewards: {
    type: Map,
    of: Number,
    default: { "1": 10, "2": 15, "3": 20, "4": 25, "5": 30, "6": 35, "7": 50 }
  },
  weeklyCoinRedemptionLimit: { type: Number, default: 500 },
  dailyRewardAmount: { type: Number, default: 10 },
  maxCoinsPerGame: { type: Number, default: 50 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("GameEconomySettings", gameEconomySettingsSchema);
