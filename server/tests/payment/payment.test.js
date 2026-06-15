const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Order = require("../../src/models/Order");
const ProcessedWebhook = require("../../src/models/ProcessedWebhook");
const jwt = require("jsonwebtoken");
const paymentService = require("../../src/services/paymentService");

jest.mock("../../src/services/paymentService", () => ({
  createRazorpayOrder: jest.fn().mockResolvedValue({
    id: "order_test_mock_1",
    amount: 10000,
    currency: "INR"
  }),
  verifyPaymentSignature: jest.fn().mockReturnValue(true)
}));

describe("Payment Integration Tests", () => {
  let token;
  let order;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    const user = await User.create({
      email: `payment_test_${Date.now()}@example.com`,
      name: "Tester Payment",
      role: "USER"
    });
    token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    order = await Order.create({
      userId: user._id,
      items: [],
      subtotal: 100,
      totalAmount: 100,
      paymentStatus: "PENDING"
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /payment_test_/ } });
    await Order.deleteMany({ _id: order._id });
    await ProcessedWebhook.deleteMany({});
    await mongoose.connection.close();
  });

  it("should create a Razorpay transaction order and acquire the lock", async () => {
    const res = await request(app)
      .post("/api/payment/create-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: order._id.toString() });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("razorpayOrderId", "order_test_mock_1");
  });

  it("should verify payment and mark order PAID", async () => {
    const res = await request(app)
      .post("/api/payment/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        razorpayOrderId: "order_test_mock_1",
        razorpayPaymentId: "pay_test_123",
        razorpaySignature: "mock_signature"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.order).toHaveProperty("paymentStatus", "PAID");
  });
});
