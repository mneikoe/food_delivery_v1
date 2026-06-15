const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Order = require("../../src/models/Order");
const jwt = require("jsonwebtoken");

describe("Delivery Partner Integration Tests", () => {
  jest.setTimeout(30000);
  let deliveryToken;
  let deliveryId;
  let order;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    const partner = await User.create({
      email: `delivery_partner_${Date.now()}@example.com`,
      name: "Delivery Tester",
      role: "DELIVERY_PARTNER",
      isActive: true
    });
    deliveryId = partner._id;
    deliveryToken = jwt.sign({ userId: partner._id, role: partner.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    order = await Order.create({
      userId: new mongoose.Types.ObjectId(),
      items: [],
      subtotal: 120,
      totalAmount: 120,
      status: "ASSIGNED_TO_DELIVERY",
      deliveryPartnerId: deliveryId
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /delivery_partner_/ } });
    await Order.deleteMany({ _id: order._id });
    try {
      const DeliveryLocation = require("../../src/models/DeliveryLocation");
      await DeliveryLocation.deleteMany({ orderId: order._id });
    } catch (err) {}
    await mongoose.connection.close();
  });

  it("should list assigned orders", async () => {
    const res = await request(app)
      .get("/api/delivery/assigned-orders")
      .set("Authorization", `Bearer ${deliveryToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should list delivery history", async () => {
    const res = await request(app)
      .get("/api/delivery/delivery-history")
      .set("Authorization", `Bearer ${deliveryToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should fetch delivery partner earnings", async () => {
    const res = await request(app)
      .get("/api/delivery/earnings")
      .set("Authorization", `Bearer ${deliveryToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("totalEarnings");
  });

  it("should transition order status accepted -> picked_up -> out_for_delivery -> arrived", async () => {
    // 1. Accept order (which sets it to PICKED_UP)
    const acceptRes = await request(app)
      .post(`/api/delivery/orders/${order._id}/accept`)
      .set("Authorization", `Bearer ${deliveryToken}`);
    
    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.body).toHaveProperty("status", "PICKED_UP");

    // 2. Transition to OUT_FOR_DELIVERY
    const outRes = await request(app)
      .post(`/api/delivery/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${deliveryToken}`)
      .send({ status: "OUT_FOR_DELIVERY" });
    
    expect(outRes.statusCode).toBe(200);
    expect(outRes.body).toHaveProperty("status", "OUT_FOR_DELIVERY");

    // 3. Transition to ARRIVED_AT_LOCATION
    const arrivedRes = await request(app)
      .post(`/api/delivery/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${deliveryToken}`)
      .send({ status: "ARRIVED_AT_LOCATION" });
    
    expect(arrivedRes.statusCode).toBe(200);
    expect(arrivedRes.body).toHaveProperty("status", "ARRIVED_AT_LOCATION");

    // Retrieve order to get generated delivery OTP
    const updatedOrderDb = await Order.findById(order._id);
    const generatedOtp = updatedOrderDb.deliveryOTP.code;

    // 4. Try verifying with wrong OTP
    const wrongOtpRes = await request(app)
      .post(`/api/delivery/orders/${order._id}/verify-otp`)
      .set("Authorization", `Bearer ${deliveryToken}`)
      .send({ otp: "9999" });
    
    expect(wrongOtpRes.statusCode).toBe(400);

    // 5. Verify with correct OTP
    const correctOtpRes = await request(app)
      .post(`/api/delivery/orders/${order._id}/verify-otp`)
      .set("Authorization", `Bearer ${deliveryToken}`)
      .send({ otp: generatedOtp });
    
    expect(correctOtpRes.statusCode).toBe(200);
    expect(correctOtpRes.body).toHaveProperty("success", true);
  });

  it("should update partner coordinates and store location logs", async () => {
    const res = await request(app)
      .post("/api/delivery/location/update")
      .set("Authorization", `Bearer ${deliveryToken}`)
      .send({ latitude: 28.5678, longitude: 77.1234 });
    
    console.log("LOCATION UPDATE RESPONSE:", res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("location");
  });
});
