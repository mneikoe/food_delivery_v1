const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  image: String,
  isVeg: {
    type: Boolean,
    default: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  preparationTime: {
    type: Number,
    default: 15,
    min: 1,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: "65d7a9b1e4b0a1a2b3c4d5e6", // Single restaurant for Phase-1
  },
});

module.exports = mongoose.model("Product", productSchema);
