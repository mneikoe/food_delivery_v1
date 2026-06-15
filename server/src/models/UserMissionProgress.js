const mongoose = require("mongoose");

const userMissionProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  missionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MissionTemplate', required: true },
  progress: { type: Number, default: 0 },
  claimed: { type: Boolean, default: false }
});

// Enforce single mission progress tracker per user, date, and mission template
userMissionProgressSchema.index({ userId: 1, date: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model("UserMissionProgress", userMissionProgressSchema);
