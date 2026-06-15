const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const emailService = require("../../src/services/emailService");

jest.mock("../../src/services/emailService", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

describe("Authentication Integration Tests", () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const password = "password123";

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@example.com$/ } });
    await mongoose.connection.close();
  });

  describe("POST /api/auth/send-email-otp", () => {
    it("should generate and send OTP", async () => {
      const res = await request(app)
        .post("/api/auth/send-email-otp")
        .send({ email: testEmail });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });

    it("should enforce rate limiting / cooldown within 60s", async () => {
      const res = await request(app)
        .post("/api/auth/send-email-otp")
        .send({ email: testEmail });

      expect(res.statusCode).toBe(400); // 60s cooldown limit
      expect(res.body.error).toContain("60 seconds");
    });
  });

  describe("POST /api/auth/verify-email-otp", () => {
    it("should fail validation for incorrect OTP digits", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: testEmail, otp: "12" });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message", "Validation failed");
    });

    it("should fail verification for mismatched OTP", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: testEmail, otp: "999999" });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Invalid OTP");
    });
  });

  describe("POST /api/auth/register & login", () => {
    const registerEmail = `register_${Date.now()}@example.com`;

    it("should register a user with password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: registerEmail, password, name: "QA tester" });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
    });

    it("should login registered user successfully", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: registerEmail, password });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
    });

    it("should reject login with wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: registerEmail, password: "wrong_password" });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Invalid email or password");
    });
  });
});
