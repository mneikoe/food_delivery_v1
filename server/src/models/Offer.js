const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    required: true,
  },
  discountText: {
    type: String,
    required: true, // e.g., "25% OFF", "Flat ₹100 OFF"
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0, // Higher priority shows first
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Offer", offerSchema);
