const mongoose = require("mongoose");

const gamePlayTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  plays: { type: Number, default: 0 }
});

// Enforce single active tracker document per user per day
gamePlayTrackerSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("GamePlayTracker", gamePlayTrackerSchema);
