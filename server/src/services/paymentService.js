const Razorpay = require("razorpay");
const crypto = require("crypto");

// Validate that keys exist (warn on startup if missing)
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("[PaymentService] WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

class PaymentService {
  /**
   * Create a Razorpay order
   * @param {number} amount - Amount in INR (rupees)
   * @param {string} receipt - Order receipt (your internal orderId)
   * @param {object} notes - Optional notes object
   */
  async createRazorpayOrder(amount, receipt, notes = {}) {
    const options = {
      amount: Math.round(amount * 100), // Convert rupees → paise
      currency: "INR",
      receipt: String(receipt).slice(0, 40), // Razorpay receipt max 40 chars
      notes,
    };

    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error("[PaymentService] Razorpay createOrder failed:", error);
      throw new Error("Failed to create payment order. Please try again.");
    }
  }

  /**
   * Verify Razorpay payment signature (HMAC SHA256)
   * @param {string} razorpayOrderId
   * @param {string} razorpayPaymentId
   * @param {string} signature - From frontend
   */
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature) {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");
    return expectedSignature === signature;
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId) {
    try {
      return await razorpay.payments.fetch(paymentId);
    } catch (error) {
      console.error("[PaymentService] fetchPayment failed:", error);
      throw new Error("Failed to fetch payment details");
    }
  }
}

module.exports = new PaymentService();
