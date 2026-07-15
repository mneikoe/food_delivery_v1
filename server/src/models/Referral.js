const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // A user can only be referred once!
      index: true,
    },
    coinsEarnedReferrer: {
      type: Number,
      default: 100,
    },
    coinsEarnedReferred: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "COMPLETED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);
