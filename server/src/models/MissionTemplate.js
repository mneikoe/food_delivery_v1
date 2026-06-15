const mongoose = require("mongoose");

const missionTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['PLAY_GAME', 'SCORE_TARGET', 'COLLECT_GOLDEN_BONE', 'COMBO_TARGET'], required: true },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], required: true },
  target: { type: Number, required: true },
  rewardCoins: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("MissionTemplate", missionTemplateSchema);
