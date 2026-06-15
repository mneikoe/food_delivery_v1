const mongoose = require("mongoose");

const gameResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  duration: { type: Number, required: true },
  treatsCaught: { type: Number, required: true },
  coinsEarned: { type: Number, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  timestamp: { type: Date, default: Date.now }
});

gameResultSchema.index({ userId: 1, date: 1 });
gameResultSchema.index({ date: 1, score: -1 });
gameResultSchema.index({ timestamp: -1 });

module.exports = mongoose.model("GameResult", gameResultSchema);
