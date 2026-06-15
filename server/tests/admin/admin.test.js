const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Category = require("../../src/models/Category");
const Product = require("../../src/models/Product");
const Coupon = require("../../src/models/Coupon");
const Offer = require("../../src/models/Offer");
const jwt = require("jsonwebtoken");

describe("Admin Console Integration Tests", () => {
  let adminToken;
  let adminId;
  let categoryId;
  let productId;
  let couponId;
  let offerId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    const admin = await User.create({
      email: `admin_test_${Date.now()}@example.com`,
      name: "Tester Admin",
      role: "ADMIN",
      isEmailVerified: true
    });
    adminId = admin._id;
    adminToken = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /(admin_test_|qa_delivery_)/ } });
    await Category.deleteMany({ _id: categoryId });
    await Product.deleteMany({ _id: productId });
    await Coupon.deleteMany({ _id: couponId });
    if (offerId) {
      await Offer.deleteMany({ _id: offerId });
    }
    await mongoose.connection.close();
  });

  describe("Category Management", () => {
    it("should create a category", async () => {
      const res = await request(app)
        .post("/api/admin/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "QA Fast Food", description: "Quick meals for QA tests" });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("name", "QA Fast Food");
      categoryId = res.body._id;
    });

    it("should update a category", async () => {
      const res = await request(app)
        .put(`/api/admin/categories/${categoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "QA Fast Food Updated" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("name", "QA Fast Food Updated");
    });
  });

  describe("Product Management", () => {
    it("should create a product", async () => {
      const res = await request(app)
        .post("/api/admin/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "QA Burger",
          price: 99,
          categoryId: categoryId,
          description: "Juicy mock burger for testing",
          isVeg: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("name", "QA Burger");
      productId = res.body._id;
    });

    it("should update a product", async () => {
      const res = await request(app)
        .put(`/api/admin/products/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ price: 109 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("price", 109);
    });
  });

  describe("Coupon Management", () => {
    it("should create a coupon", async () => {
      const res = await request(app)
        .post("/api/admin/coupons")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: "QATESTER",
          discountType: "PERCENTAGE",
          discountValue: 15,
          minOrderAmount: 50,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("code", "QATESTER");
      couponId = res.body._id;
    });

    it("should get all coupons", async () => {
      const res = await request(app)
        .get("/api/admin/coupons")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should update a coupon", async () => {
      const res = await request(app)
        .put(`/api/admin/coupons/${couponId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ minOrderAmount: 75 });
      
      expect(res.statusCode).toBe(200);
    });

    it("should delete a coupon", async () => {
      const res = await request(app)
        .delete(`/api/admin/coupons/${couponId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
  });

  describe("Offer Management", () => {
    it("should create an offer", async () => {
      const res = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "QA offer",
          description: "Offer for automated tests",
          image: "offer.png",
          discountText: "10% OFF"
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("title", "QA offer");
      offerId = res.body._id;
    });

    it("should get offers", async () => {
      const res = await request(app)
        .get("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should update an offer", async () => {
      const res = await request(app)
        .put(`/api/admin/offers/${offerId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ description: "Updated description for tests" });
      
      expect(res.statusCode).toBe(200);
    });

    it("should delete an offer", async () => {
      const res = await request(app)
        .delete(`/api/admin/offers/${offerId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
  });

  describe("Delivery Partner Management", () => {
    let partnerId;

    it("should create a delivery partner", async () => {
      const res = await request(app)
        .post("/api/admin/delivery-partners")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "QA Delivery Boy",
          email: `qa_delivery_${Date.now()}@example.com`,
          phone: "9876543211"
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("name", "QA Delivery Boy");
      partnerId = res.body._id;
    });

    it("should get all delivery partners", async () => {
      const res = await request(app)
        .get("/api/admin/delivery-partners")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should get available delivery partners", async () => {
      const res = await request(app)
        .get("/api/admin/delivery-partners/available")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should update delivery partner status", async () => {
      const res = await request(app)
        .patch(`/api/admin/delivery-partners/${partnerId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("isActive", false);
    });

    it("should update delivery partner details", async () => {
      const res = await request(app)
        .put(`/api/admin/delivery-partners/${partnerId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "QA Delivery Boy Updated" });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("name", "QA Delivery Boy Updated");
    });
  });

  describe("Order Window & Hero Slides", () => {
    it("should get order window status", async () => {
      const res = await request(app)
        .get("/api/admin/order-window")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
    });

    it("should update order window status", async () => {
      const res = await request(app)
        .put("/api/admin/order-window")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderWindowEnabled: true });
      
      expect(res.statusCode).toBe(200);
    });

    it("should get hero slides", async () => {
      const res = await request(app)
        .get("/api/admin/hero-slides")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
    });

    it("should update hero slides", async () => {
      const res = await request(app)
        .put("/api/admin/hero-slides")
        .set("Authorization", `Bearer ${adminToken}`)
        .send([{ image: "slide1.png", headline: "Welcome", text: "Enjoy tasty food!" }]);
      
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Order Management & Cleanup", () => {
    it("should delete categories and products", async () => {
      const deleteProductRes = await request(app)
        .delete(`/api/admin/products/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteProductRes.statusCode).toBe(200);

      const deleteCategoryRes = await request(app)
        .delete(`/api/admin/categories/${categoryId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteCategoryRes.statusCode).toBe(200);
    });

    it("should get all orders", async () => {
      const res = await request(app)
        .get("/api/admin/orders")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should get apk info", async () => {
      const res = await request(app)
        .get("/api/admin/apk-info")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
    });

    it("should delete apk info", async () => {
      const res = await request(app)
        .delete("/api/admin/apk")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
  });
});
