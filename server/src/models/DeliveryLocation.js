const mongoose = require("mongoose");

const deliveryLocationSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  location: {
    type: {
      type: String,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

deliveryLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DeliveryLocation", deliveryLocationSchema);
