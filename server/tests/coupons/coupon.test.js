const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Coupon = require("../../src/models/Coupon");
const jwt = require("jsonwebtoken");

describe("Coupon Integration Tests", () => {
  jest.setTimeout(30000);
  let token;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    const user = await User.create({
      email: `coupon_test_${Date.now()}@example.com`,
      name: "Tester Coupon",
      role: "USER"
    });
    token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    // Create an expired coupon and a valid one
    await Coupon.create({
      code: "EXPIRED50",
      discountType: "PERCENTAGE",
      discountValue: 50,
      minOrderValue: 100,
      validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000) // expired
    });
    
    await Coupon.create({
      code: "QA20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minOrderValue: 50,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // active
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /coupon_test_/ } });
    await Coupon.deleteMany({ code: { $in: ["EXPIRED50", "QA20"] } });
    await mongoose.connection.close();
  });

  it("should validate a valid active coupon", async () => {
    const res = await request(app)
      .post("/api/user/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "QA20", orderAmount: 100 });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("valid", true);
  });

  it("should reject validation for expired coupons", async () => {
    const res = await request(app)
      .post("/api/user/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "EXPIRED50", orderAmount: 150 });
    
    expect(res.statusCode).toBe(400);
  });
});
