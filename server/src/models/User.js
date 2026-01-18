const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    trim: true,
    sparse: true, // Allows null/undefined for unique constraint
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ["USER", "ADMIN", "DELIVERY_PARTNER"],
    default: "USER",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  supabaseId: {
    type: String,
    required: true,
  },
  fcmToken: String,
  // Location fields
  location: {
    latitude: Number,
    longitude: Number,
    suburb: String,
    city: String,
    state: String,
    country: String,
    address: String,
    updatedAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("User", userSchema);
