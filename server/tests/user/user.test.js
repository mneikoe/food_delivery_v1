const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const Address = require("../../src/models/Address");
const Category = require("../../src/models/Category");
const Product = require("../../src/models/Product");
const Review = require("../../src/models/Review");
const Offer = require("../../src/models/Offer");
const Order = require("../../src/models/Order");
const jwt = require("jsonwebtoken");

describe("User Controller Integration Tests", () => {
  jest.setTimeout(30000);
  let userToken;
  let userId;
  let categoryId;
  let productId;
  let addressId;
  let reviewId;
  let offerId;
  let orderId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Create a mock user
    const user = await User.create({
      email: `user_test_${Date.now()}@example.com`,
      name: "User Tester",
      role: "USER",
      isEmailVerified: true
    });
    userId = user._id;
    userToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Create category and product
    const category = await Category.create({
      name: "Mock Category",
      description: "Mock category description",
      isActive: true,
      displayOrder: 1
    });
    categoryId = category._id;

    const product = await Product.create({
      name: "Mock Pizza",
      price: 250,
      categoryId: categoryId,
      description: "Cheese pizza description",
      isVeg: true,
      isAvailable: true
    });
    productId = product._id;

    const offer = await Offer.create({
      title: "50% OFF",
      description: "On all items",
      discountType: "PERCENTAGE",
      discountValue: 50,
      discountText: "50% OFF",
      image: "mock-image.png",
      isActive: true
    });
    offerId = offer._id;

    // Create a delivered order to review the product
    const order = await Order.create({
      userId: userId,
      items: [{ productId: productId, name: "Mock Pizza", price: 250, quantity: 1 }],
      subtotal: 250,
      totalAmount: 250,
      status: "DELIVERED",
      paymentStatus: "PAID",
      paymentMethod: "COD"
    });
    orderId = order._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /user_test_/ } });
    await Address.deleteMany({ userId });
    await Category.deleteMany({ _id: categoryId });
    await Product.deleteMany({ _id: productId });
    await Review.deleteMany({ productId });
    await Offer.deleteMany({ _id: offerId });
    await Order.deleteMany({ userId });
    await mongoose.connection.close();
  });

  describe("Profile Operations", () => {
    it("should fetch user profile", async () => {
      const res = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("email");
    });

    it("should update user profile", async () => {
      const res = await request(app)
        .put("/api/user/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "User Tester Updated", phone: "9876543210" });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("name", "User Tester Updated");
    });
  });

  describe("Address Operations", () => {
    it("should create address", async () => {
      const res = await request(app)
        .post("/api/user/addresses")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "Home",
          addressLine1: "123 Main St",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
          coordinates: {
            lat: 28.6139,
            lng: 77.2090
          }
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("_id");
      addressId = res.body._id;
    });

    it("should list addresses", async () => {
      const res = await request(app)
        .get("/api/user/addresses")
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("should update address", async () => {
      const res = await request(app)
        .put(`/api/user/addresses/${addressId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ addressLine1: "456 Main St Updated" });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("addressLine1", "456 Main St Updated");
    });

    it("should delete address", async () => {
      const res = await request(app)
        .delete(`/api/user/addresses/${addressId}`)
        .set("Authorization", `Bearer ${userToken}`);
      
      console.log("DELETE ADDRESS RESPONSE:", res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });
  });

  describe("Catalog Operations", () => {
    it("should get categories", async () => {
      const res = await request(app).get("/api/user/categories");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should get products", async () => {
      const res = await request(app)
        .get("/api/user/products")
        .query({ categoryId: categoryId.toString(), search: "Pizza" });
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Cart Operations", () => {
    it("should get cart when empty", async () => {
      const res = await request(app)
        .get("/api/user/cart")
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("items");
    });

    it("should add item to cart", async () => {
      const res = await request(app)
        .post("/api/user/cart/items")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ productId: productId.toString(), quantity: 2 });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it("should update cart item quantity", async () => {
      const res = await request(app)
        .put(`/api/user/cart/items/${productId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ quantity: 5 });
      
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Coupons & Offers", () => {
    it("should get available coupons", async () => {
      const res = await request(app)
        .get("/api/user/coupons")
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should get available offers", async () => {
      const res = await request(app)
        .get("/api/user/offers")
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Reviews", () => {
    it("should create a product review", async () => {
      const res = await request(app)
        .post("/api/user/reviews")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          orderId: orderId.toString(),
          rating: 5,
          comment: "Excellent taste!"
        });
      
      console.log("CREATE REVIEW RESPONSE:", res.body);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("rating", 5);
    });

    it("should get reviews for a product", async () => {
      const res = await request(app)
        .get(`/api/user/products/${productId}/reviews`)
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Location Tracking", () => {
    it("should update location and return geocoded city", async () => {
      const res = await request(app)
        .post("/api/user/location/update")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ latitude: 28.6139, longitude: 77.2090 });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.location).toHaveProperty("city");
    });
  });

  describe("APK Info", () => {
    it("should return APK metadata", async () => {
      const res = await request(app)
        .get("/api/user/apk-info")
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
