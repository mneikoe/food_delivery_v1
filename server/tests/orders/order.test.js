const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Order = require("../../src/models/Order");
const jwt = require("jsonwebtoken");

describe("Order Integration Tests", () => {
  let userToken;
  let userId;
  const addressId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    // Create a mock verified user
    const user = await User.create({
      email: `order_test_${Date.now()}@example.com`,
      name: "Tester Order",
      role: "USER",
      isEmailVerified: true
    });
    
    userId = user._id;
    userToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /order_test_/ } });
    await Order.deleteMany({ userId });
    await mongoose.connection.close();
  });

  it("should fail validation for order creation with invalid payload", async () => {
    const res = await request(app)
      .post("/api/user/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ addressId: "invalid_id", paymentMethod: "INVALID" });
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Validation failed");
  });

  it("should block unauthenticated order placement requests", async () => {
    const res = await request(app)
      .post("/api/user/orders")
      .send({ addressId, paymentMethod: "COD" });
    
    expect(res.statusCode).toBe(401);
  });
});
