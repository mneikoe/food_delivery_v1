const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend environment configuration
dotenv.config({ path: path.join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;

const GameEconomySettings = require("./src/models/GameEconomySettings");
const RewardTier = require("./src/models/RewardTier");
const MissionTemplate = require("./src/models/MissionTemplate");

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  // 1. Seed Singleton settings
  await GameEconomySettings.deleteMany({});
  const settings = new GameEconomySettings({
    maxDailyPlays: 5,
    coinsPerTreat: 5,
    goldenBoneSpawnChance: 0.05,
    goldenBoneReward: 25,
    streakRewards: { "1": 10, "2": 15, "3": 20, "4": 25, "5": 30, "6": 35, "7": 50 },
    weeklyCoinRedemptionLimit: 500,
    dailyRewardAmount: 10,
    isActive: true
  });
  await settings.save();
  console.log("Seeded GameEconomySettings singleton!");

  // 2. Seed Mission Templates
  await MissionTemplate.deleteMany({});
  const missions = [
    {
      name: "Catch 8 Treats in a single game",
      type: "SCORE_TARGET",
      difficulty: "MEDIUM",
      target: 8,
      rewardCoins: 25,
      isActive: true
    },
    {
      name: "Play 2 Games total today",
      type: "PLAY_GAME",
      difficulty: "EASY",
      target: 2,
      rewardCoins: 15,
      isActive: true
    },
    {
      name: "Catch a Golden Bone",
      type: "COLLECT_GOLDEN_BONE",
      difficulty: "HARD",
      target: 1,
      rewardCoins: 50,
      isActive: true
    }
  ];
  await MissionTemplate.insertMany(missions);
  console.log("Seeded MissionTemplates!");

  // 3. Seed Reward Tiers
  await RewardTier.deleteMany({});
  const tiers = [
    {
      title: "₹5 Off Food Coupon",
      coinsRequired: 100,
      couponValue: 5,
      weeklyLimit: 2,
      monthlyLimit: 8,
      isActive: true,
      sortOrder: 1
    },
    {
      title: "₹10 Off Food Coupon",
      coinsRequired: 200,
      couponValue: 10,
      weeklyLimit: 1,
      monthlyLimit: 4,
      isActive: true,
      sortOrder: 2
    },
    {
      title: "₹25 Off Food Coupon",
      coinsRequired: 500,
      couponValue: 25,
      weeklyLimit: 1,
      monthlyLimit: 2,
      isActive: true,
      sortOrder: 3
    }
  ];
  await RewardTier.insertMany(tiers);
  console.log("Seeded RewardTiers successfully!");

  await mongoose.connection.close();
  console.log("Seeding complete. Connection closed.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error seeding gamification database values:", err);
  process.exit(1);
});
