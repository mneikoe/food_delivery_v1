const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true, // in INR
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["CREATED", "AUTHORIZED", "CAPTURED", "SUCCESS", "FAILED"],
      default: "CREATED",
      required: true,
      index: true,
    },
    history: [
      {
        status: String,
        timestamp: Date,
        details: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
