const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const GameSession = require("../../src/models/GameSession");
const GamePlayTracker = require("../../src/models/GamePlayTracker");
const UserStreak = require("../../src/models/UserStreak");
const RewardTier = require("../../src/models/RewardTier");
const jwt = require("jsonwebtoken");

describe("Game Endpoints Integration Tests", () => {
  let userToken;
  let userId;
  let sessionId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    const user = await User.create({
      email: `game_tester_${Date.now()}@example.com`,
      name: "Game Tester",
      role: "USER",
      isEmailVerified: true
    });
    userId = user._id;
    userToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Seed a RewardTier
    await RewardTier.create({
      title: "₹10 Off Coupon",
      coinsRequired: 100,
      couponValue: 10,
      weeklyLimit: 1,
      monthlyLimit: 4,
      isActive: true
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /game_tester_/ } });
    await GameSession.deleteMany({ userId });
    await GamePlayTracker.deleteMany({ userId });
    await UserStreak.deleteMany({ userId });
    await RewardTier.deleteMany({ title: "₹10 Off Coupon" });
    await mongoose.connection.close();
  });

  it("should start the game session securely", async () => {
    const res = await request(app)
      .post("/api/user/game/start")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("sessionId");
    sessionId = res.body.sessionId;
  });

  it("should submit game score successfully", async () => {
    const res = await request(app)
      .post("/api/user/game/submit")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        sessionId,
        score: 5,
        duration: 10,
        treatsCaught: 5
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("coinsEarned");
  });
});
