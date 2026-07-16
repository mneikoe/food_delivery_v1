const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId:      { type: String, required: true, unique: true },
  status:         { type: String, enum: ['ACTIVE', 'SUBMITTED', 'EXPIRED'], default: 'ACTIVE' },
  gameType:       { type: String, default: 'NUMBER_TAP' },
  totalAttempts:  { type: Number, default: 0 },   // how many attempts user had this session
  correctClicks:  { type: Number, default: 0 },   // how many they got right
  coinsAwarded:   { type: Number, default: 0 },
  startedAt:      { type: Date, default: Date.now },
  submittedAt:    { type: Date },
});

gameSessionSchema.index({ sessionId: 1 });
gameSessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model("GameSession", gameSessionSchema);
