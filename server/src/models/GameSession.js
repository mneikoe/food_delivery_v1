const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['ACTIVE', 'SUBMITTED', 'EXPIRED'], default: 'ACTIVE' },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  score: { type: Number, default: 0 },
  coinsAwarded: { type: Number, default: 0 }
});

gameSessionSchema.index({ sessionId: 1 });
gameSessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model("GameSession", gameSessionSchema);
