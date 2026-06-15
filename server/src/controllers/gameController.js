const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const GameEconomySettings = require("../models/GameEconomySettings");
const RewardTier = require("../models/RewardTier");
const CoinTransaction = require("../models/CoinTransaction");
const CouponRedemption = require("../models/CouponRedemption");
const GameSession = require("../models/GameSession");
const MissionTemplate = require("../models/MissionTemplate");
const UserMissionProgress = require("../models/UserMissionProgress");
const GamePlayTracker = require("../models/GamePlayTracker");
const UserStreak = require("../models/UserStreak");
const GameResult = require("../models/GameResult");
const Coupon = require("../models/Coupon");
const pushService = require("../services/pushService");

// Helper: Get or create singleton settings
async function getEconomySettings() {
  let settings = await GameEconomySettings.findOne({ isActive: true });
  if (!settings) {
    settings = new GameEconomySettings({
      maxDailyPlays: 5,
      coinsPerTreat: 5,
      goldenBoneSpawnChance: 0.05,
      goldenBoneReward: 25,
      streakRewards: { "1": 10, "2": 15, "3": 20, "4": 25, "5": 30, "6": 35, "7": 50 },
      weeklyCoinRedemptionLimit: 500,
      dailyRewardAmount: 10,
      maxCoinsPerGame: 50,
      isActive: true
    });
    await settings.save();
  }
  return settings;
}

// Helper: Format date to local YYYY-MM-DD
function getLocalDateString() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000; // in milliseconds
  const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
  return localISOTime;
}

// Helper: Log coin transaction and update user's cached coin balance
async function recordCoinTransaction({ userId, type, coins, source, referenceId = null, metadata = {} }) {
  const transaction = new CoinTransaction({
    userId,
    type,
    coins,
    source,
    referenceId,
    metadata
  });
  await transaction.save();

  // Update User.coins directly (Double entry cache)
  const user = await User.findById(userId);
  if (user) {
    user.coins = Math.max(0, (user.coins || 0) + coins);
    await user.save();
  }
  return transaction;
}

// Starts a new game session
exports.startGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    // 1. Validate and Increment Daily Play Limits
    let playTracker = await GamePlayTracker.findOneAndUpdate(
      { userId, date: today },
      { $inc: { plays: 1 } },
      { new: true, upsert: true }
    );

    if (playTracker.plays > settings.maxDailyPlays) {
      // Rollback increment if it exceeds limits
      await GamePlayTracker.updateOne(
        { userId, date: today },
        { $inc: { plays: -1 } }
      );
      return res.status(403).json({ error: "Daily play limit reached. Come back tomorrow!" });
    }

    const currentPlaysCount = playTracker.plays;

    // 2. Fetch or initialize Streak
    let userStreak = await UserStreak.findOne({ userId });
    if (!userStreak) {
      userStreak = new UserStreak({ userId });
    }

    // Check if streak was missed/broken (last play date was before yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (userStreak.lastPlayDate && userStreak.lastPlayDate !== today && userStreak.lastPlayDate !== yesterdayStr) {
      userStreak.currentStreak = 0;
      userStreak.claimedStreakToday = false;
      await userStreak.save();
    }

    // 3. Generate secure game session ID
    const sessionId = crypto.randomBytes(16).toString("hex");
    const session = new GameSession({
      userId,
      sessionId,
      status: "ACTIVE",
      startedAt: new Date()
    });
    await session.save();

    // 4. Initialize Active Daily Missions for user
    const activeTemplates = await MissionTemplate.find({ isActive: true });
    const activeMissions = [];
    for (const temp of activeTemplates) {
      let progressDoc = await UserMissionProgress.findOne({
        userId,
        date: today,
        missionId: temp._id
      });
      if (!progressDoc) {
        progressDoc = new UserMissionProgress({
          userId,
          date: today,
          missionId: temp._id,
          progress: 0,
          claimed: false
        });
        try {
          await progressDoc.save();
        } catch (e) {
          // unique compound key handling in race conditions
          progressDoc = await UserMissionProgress.findOne({
            userId,
            date: today,
            missionId: temp._id
          });
        }
      }
      activeMissions.push({
        _id: progressDoc._id,
        name: temp.name,
        type: temp.type,
        target: temp.target,
        difficulty: temp.difficulty,
        rewardCoins: temp.rewardCoins,
        progress: progressDoc.progress,
        claimed: progressDoc.claimed
      });
    }

    // 5. Get next Reward Tier progress helper
    const user = await User.findById(userId);
    const userCoins = user ? (user.coins || 0) : 0;
    const nextRewardTier = await RewardTier.findOne({
      isActive: true,
      coinsRequired: { $gt: userCoins }
    }).sort({ coinsRequired: 1 });

    let nextReward = null;
    if (nextRewardTier) {
      nextReward = {
        title: nextRewardTier.title,
        coinsNeeded: nextRewardTier.coinsRequired - userCoins,
        coinsRequired: nextRewardTier.coinsRequired,
        couponValue: nextRewardTier.couponValue
      };
    }

    res.json({
      sessionId,
      currentStreak: userStreak.currentStreak,
      remainingPlays: Math.max(0, settings.maxDailyPlays - currentPlaysCount),
      activeMissions,
      nextReward
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Submits the game score and rewards the user authoritative coins
exports.submitGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId, score, duration, treatsCaught } = req.body;
    const today = getLocalDateString();

    if (!sessionId || typeof score !== 'number' || typeof duration !== 'number' || typeof treatsCaught !== 'number') {
      return res.status(400).json({ error: "Invalid payload parameters" });
    }

    // 1. Verify Active Session
    const session = await GameSession.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Game session not found" });
    }
    if (session.status !== "ACTIVE") {
      return res.status(403).json({ error: "Session has already been processed or expired" });
    }

    // Session duration timeout verification (e.g. max 5 minutes)
    const elapsedMinutes = (new Date() - session.startedAt) / 60000;
    if (elapsedMinutes > 5) {
      session.status = "EXPIRED";
      await session.save();
      return res.status(403).json({ error: "Game session expired (timeout)" });
    }

    // 2. Telemetry and Score Plausibility check
    const normalizedDuration = Math.max(1, duration);
    const maxPossibleCatches = Math.floor(normalizedDuration * 4) + 5;
    if (treatsCaught > maxPossibleCatches) {
      return res.status(400).json({ error: "Suspicious score submission flagged" });
    }

    const settings = await getEconomySettings();

    // 3. Roll Server Golden Bone Spawn Chance (5%)
    let goldenBoneCollected = false;
    let goldenBoneCoins = 0;
    if (treatsCaught > 0) {
      const roll = Math.random();
      if (roll < settings.goldenBoneSpawnChance) {
        goldenBoneCollected = true;
        goldenBoneCoins = settings.goldenBoneReward;
      }
    }

    // 4. Calculate Coins
    const baseCoins = treatsCaught * settings.coinsPerTreat;
    let totalCoinsEarned = baseCoins + goldenBoneCoins;

    // Cap maximum coins earned per game session
    const maxCoinsPerGame = settings.maxCoinsPerGame || 50;
    if (totalCoinsEarned > maxCoinsPerGame) {
      totalCoinsEarned = maxCoinsPerGame;
    }

    // 5. Play Limits checked and incremented in startGame to prevent session creation bypass
    // No increment here to prevent double-counting.

    // 6. Update Streak Date
    let userStreak = await UserStreak.findOne({ userId });
    if (!userStreak) {
      userStreak = new UserStreak({ userId });
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let streakIncremented = false;
    if (userStreak.lastPlayDate === yesterdayStr) {
      userStreak.currentStreak += 1;
      userStreak.claimedStreakToday = false;
      streakIncremented = true;
    } else if (userStreak.lastPlayDate !== today) {
      userStreak.currentStreak = 1;
      userStreak.claimedStreakToday = false;
      streakIncremented = true;
    }
    userStreak.lastPlayDate = today;
    await userStreak.save();

    // 7. Save Game Result record (with indexing support)
    const gameResult = new GameResult({
      userId,
      score,
      duration,
      treatsCaught,
      coinsEarned: totalCoinsEarned,
      date: today
    });
    await gameResult.save();

    // 8. Update Session document
    session.status = "SUBMITTED";
    session.submittedAt = new Date();
    session.score = score;
    session.coinsAwarded = totalCoinsEarned;
    await session.save();

    // 9. Record Coin Transaction (GAME_REWARD type)
    if (totalCoinsEarned > 0) {
      await recordCoinTransaction({
        userId,
        type: "GAME_REWARD",
        coins: totalCoinsEarned,
        source: "Feed the Puppy Gameplay",
        referenceId: gameResult._id,
        metadata: { score, treatsCaught, goldenBoneCollected }
      });

      // Dispatch automated coins earned push notification
      try {
        const user = await User.findById(userId);
        if (user && user.fcmTokens && user.fcmTokens.length > 0) {
          const gamePref = user.notificationSettings ? user.notificationSettings.gameNotifications !== false : true;
          if (gamePref) {
            await pushService.sendPushNotification(
              user.fcmTokens.map(t => t.token),
              {
                title: "🪙 Coins Earned! Good Job!",
                body: `You jumped over ${score} barriers and earned +🪙${totalCoinsEarned} Chatora Coins!`,
                data: { type: "GAME" }
              },
              userId
            );
          }
        }
      } catch (err) {
        console.error("[Game Push Alert] Failed to dispatch gameplay alert:", err.message);
      }
    }

    // 10. Increment Active Missions Progress
    await UserMissionProgress.updateMany(
      { userId, date: today, claimed: false },
      { $inc: { progress: 1 } },
      { multi: true } // Handles PLAY_GAME types dynamically
    );
    // Fetch and check other missions progress
    const activeProgresses = await UserMissionProgress.find({ userId, date: today, claimed: false }).populate("missionId");
    for (const prog of activeProgresses) {
      const template = prog.missionId;
      if (!template) continue;
      
      let updatedProgress = prog.progress;
      if (template.type === 'PLAY_GAME') {
        // Increment handled above
      } else if (template.type === 'SCORE_TARGET') {
        if (score >= template.target) {
          updatedProgress = template.target;
        }
      } else if (template.type === 'COLLECT_GOLDEN_BONE') {
        if (goldenBoneCollected) {
          updatedProgress = Math.min(template.target, prog.progress + 1);
        }
      } else if (template.type === 'COMBO_TARGET') {
        // Estimate combo achievability based on score multiplier ratios
        const ratio = score / (treatsCaught || 1);
        if (ratio >= 1.5 && score >= template.target) {
          updatedProgress = Math.min(template.target, prog.progress + 1);
        }
      }

      if (updatedProgress !== prog.progress) {
        prog.progress = updatedProgress;
        await prog.save();
      }
    }

    const updatedUser = await User.findById(userId);
    res.json({
      coinsEarned: totalCoinsEarned,
      goldenBoneCollected,
      streakUpdated: userStreak.currentStreak,
      score,
      newBalance: updatedUser ? (updatedUser.coins || 0) : 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Claims the daily free reward check-in
exports.claimDailyReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    // Check if duplicate daily claim exists
    const existingTransaction = await CoinTransaction.findOne({
      userId,
      type: "DAILY_REWARD",
      createdAt: {
        $gte: new Date(today + "T00:00:00.000Z"),
        $lte: new Date(today + "T23:59:59.999Z")
      }
    });

    if (existingTransaction) {
      return res.status(403).json({ error: "Daily free reward already claimed today!" });
    }

    // Award daily coins
    const transaction = await recordCoinTransaction({
      userId,
      type: "DAILY_REWARD",
      coins: settings.dailyRewardAmount,
      source: "Daily Check-In Reward"
    });

    const user = await User.findById(userId);

    // Dispatch check-in alert push notification
    try {
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        const gamePref = user.notificationSettings ? user.notificationSettings.gameNotifications !== false : true;
        if (gamePref) {
          await pushService.sendPushNotification(
            user.fcmTokens.map(t => t.token),
            {
              title: "🎁 Daily Reward Claimed!",
              body: `Success! You claimed +🪙${settings.dailyRewardAmount} Chatora Coins! Play today to keep your streak active.`,
              data: { type: "COUPON" }
            },
            userId
          );
        }
      }
    } catch (err) {
      console.error("[Daily Reward Push Alert] Failed to send check-in push:", err.message);
    }

    res.json({
      success: true,
      coinsClaimed: settings.dailyRewardAmount,
      newBalance: user ? (user.coins || 0) : 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Claims completed mission reward coins
exports.claimMissionReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const { missionProgressId } = req.body;

    const progress = await UserMissionProgress.findOne({ _id: missionProgressId, userId }).populate("missionId");
    if (!progress) {
      return res.status(404).json({ error: "Mission progress record not found" });
    }
    if (progress.claimed) {
      return res.status(400).json({ error: "Mission reward has already been claimed" });
    }
    const template = progress.missionId;
    if (!template || progress.progress < template.target) {
      return res.status(400).json({ error: "Mission goals not met yet" });
    }

    // Update to claimed
    progress.claimed = true;
    await progress.save();

    // Award coins and log transaction
    await recordCoinTransaction({
      userId,
      type: "MISSION_REWARD",
      coins: template.rewardCoins,
      source: `Daily Mission: ${template.name}`,
      referenceId: progress._id
    });

    const user = await User.findById(userId);
    res.json({
      success: true,
      coinsClaimed: template.rewardCoins,
      newBalance: user ? (user.coins || 0) : 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Claims Daily Streak Milestone rewards
exports.claimStreakReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const userStreak = await UserStreak.findOne({ userId });
    if (!userStreak || userStreak.currentStreak === 0) {
      return res.status(400).json({ error: "No active streak found" });
    }
    if (userStreak.claimedStreakToday) {
      return res.status(403).json({ error: "Streak reward already claimed today!" });
    }

    const settings = await getEconomySettings();
    const streakDayKey = String(userStreak.currentStreak % 7 || 7);
    const rewardCoins = settings.streakRewards.get(streakDayKey) || 10;

    userStreak.claimedStreakToday = true;
    await userStreak.save();

    await recordCoinTransaction({
      userId,
      type: "STREAK_REWARD",
      coins: rewardCoins,
      source: `Day ${userStreak.currentStreak} Streak Reward`
    });

    const user = await User.findById(userId);

    // Dispatch streak reward alert push notification
    try {
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        const gamePref = user.notificationSettings ? user.notificationSettings.gameNotifications !== false : true;
        if (gamePref) {
          await pushService.sendPushNotification(
            user.fcmTokens.map(t => t.token),
            {
              title: "🔥 Streak Bonus Claimed!",
              body: `Fantastic! You claimed your Day ${userStreak.currentStreak} Streak reward of +🪙${rewardCoins} Chatora Coins!`,
              data: { type: "GAME" }
            },
            userId
          );
        }
      }
    } catch (err) {
      console.error("[Streak Push Alert] Failed to dispatch streak reward alert:", err.message);
    }

    res.json({
      success: true,
      coinsClaimed: rewardCoins,
      newBalance: user ? (user.coins || 0) : 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Dynamic Daily / Weekly Leaderboard rankings generated from GameResult records
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'DAILY' } = req.query; // 'DAILY' or 'WEEKLY'
    const today = getLocalDateString();
    
    let matchQuery = {};
    if (type === 'DAILY') {
      matchQuery.date = today;
    } else {
      // Last 7 days
      const cutOff = new Date();
      cutOff.setDate(cutOff.getDate() - 7);
      matchQuery.timestamp = { $gte: cutOff };
    }

    // Aggregate highest score per user
    const rankings = await GameResult.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$userId", maxScore: { $max: "$score" } } },
      { $sort: { maxScore: -1 } },
      { $limit: 20 },
      // Lookup username
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          maxScore: 1,
          username: "$user.name"
        }
      }
    ]);

    res.json(rankings.map((item, idx) => ({
      rank: idx + 1,
      userId: item._id,
      username: item.username,
      score: item.maxScore
    })));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Fetches the game dashboard summary stats
exports.getDashboardInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    // 1. Load User Coins
    const user = await User.findById(userId);
    const userCoins = user ? (user.coins || 0) : 0;

    // 2. Load Streak
    let userStreak = await UserStreak.findOne({ userId });
    if (!userStreak) {
      userStreak = new UserStreak({ userId, currentStreak: 0, claimedStreakToday: false });
    }

    // 3. Load daily reward claim state
    const todayClaimTransaction = await CoinTransaction.findOne({
      userId,
      type: "DAILY_REWARD",
      createdAt: {
        $gte: new Date(today + "T00:00:00.000Z"),
        $lte: new Date(today + "T23:59:59.999Z")
      }
    });

    // 4. Load Active Missions
    const activeTemplates = await MissionTemplate.find({ isActive: true });
    const missions = [];
    let completedCount = 0;
    for (const temp of activeTemplates) {
      const progressDoc = await UserMissionProgress.findOne({ userId, date: today, missionId: temp._id });
      const progressVal = progressDoc ? progressDoc.progress : 0;
      const claimedVal = progressDoc ? progressDoc.claimed : false;
      if (progressVal >= temp.target) completedCount++;
      missions.push({
        progressId: progressDoc ? progressDoc._id : null,
        name: temp.name,
        type: temp.type,
        target: temp.target,
        progress: progressVal,
        claimed: claimedVal,
        rewardCoins: temp.rewardCoins
      });
    }

    // 5. Get Today's Best Score
    const bestResult = await GameResult.findOne({ userId, date: today }).sort({ score: -1 });

    // 6. Next reward progress info
    const nextRewardTier = await RewardTier.findOne({
      isActive: true,
      coinsRequired: { $gt: userCoins }
    }).sort({ coinsRequired: 1 });

    let nextReward = null;
    if (nextRewardTier) {
      nextReward = {
        title: nextRewardTier.title,
        coinsNeeded: nextRewardTier.coinsRequired - userCoins,
        coinsRequired: nextRewardTier.coinsRequired,
        couponValue: nextRewardTier.couponValue
      };
    }

    // 7. Get user's today rank
    let rankStr = "N/A";
    const dailyRankings = await GameResult.aggregate([
      { $match: { date: today } },
      { $group: { _id: "$userId", maxScore: { $max: "$score" } } },
      { $sort: { maxScore: -1 } }
    ]);
    const userRankIdx = dailyRankings.findIndex(r => r._id.toString() === userId.toString());
    if (userRankIdx !== -1) {
      rankStr = `#${userRankIdx + 1}`;
    }

    res.json({
      coins: userCoins,
      currentStreak: userStreak.currentStreak,
      claimedStreakToday: userStreak.claimedStreakToday,
      claimedDailyRewardToday: !!todayClaimTransaction,
      dailyRewardAmount: settings.dailyRewardAmount,
      coinsPerTreat: settings.coinsPerTreat,
      maxCoinsPerGame: settings.maxCoinsPerGame || 50,
      rank: rankStr,
      nextReward,
      bestScore: bestResult ? bestResult.score : 0,
      missions,
      missionsCompletedSummary: `${completedCount}/${activeTemplates.length}`
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Redeems coins for a specific reward tier coupon
exports.redeemReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const { rewardTierId } = req.body;

    const rewardTier = await RewardTier.findOne({ _id: rewardTierId, isActive: true });
    if (!rewardTier) {
      return res.status(404).json({ error: "Reward tier option not found" });
    }

    const user = await User.findById(userId);
    if (!user || (user.coins || 0) < rewardTier.coinsRequired) {
      return res.status(400).json({ error: "Insufficient coin balance for redemption" });
    }

    // 1. Verify Weekly / Monthly Limits
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const weeklyRedemptionsCount = await CouponRedemption.countDocuments({
      userId,
      rewardTierId,
      redeemedAt: { $gte: startOfWeek }
    });
    if (weeklyRedemptionsCount >= rewardTier.weeklyLimit) {
      return res.status(400).json({ error: `Weekly redemption limit reached for this reward (${rewardTier.weeklyLimit} time)` });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    const monthlyRedemptionsCount = await CouponRedemption.countDocuments({
      userId,
      rewardTierId,
      redeemedAt: { $gte: startOfMonth }
    });
    if (monthlyRedemptionsCount >= rewardTier.monthlyLimit) {
      return res.status(400).json({ error: `Monthly redemption limit reached for this reward (${rewardTier.monthlyLimit} times)` });
    }

    // 2. Generate Coupon code prefix PUPPY
    const codeSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    const couponCode = `PUPPY-${rewardTier.couponValue}-${codeSuffix}`;

    // Create entry in standard Coupon model
    const newCoupon = new Coupon({
      code: couponCode,
      discountType: "FLAT",
      discountValue: rewardTier.couponValue,
      minOrderValue: 0,
      isActive: true,
      usageLimit: 1, // single-use coupon
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // valid for 30 days
      isGameReward: true
    });
    await newCoupon.save();

    // 3. Deduct coins and log transaction
    await recordCoinTransaction({
      userId,
      type: "COUPON_REDEMPTION",
      coins: -rewardTier.coinsRequired,
      source: `Redeemed ${rewardTier.title}`,
      metadata: { couponCode, rewardTierId: rewardTier._id }
    });

    // 4. Save CouponRedemption log
    const redemption = new CouponRedemption({
      userId,
      rewardTierId: rewardTier._id,
      coinsSpent: rewardTier.coinsRequired,
      couponCode,
      couponValue: rewardTier.couponValue
    });
    await redemption.save();

    const updatedUser = await User.findById(userId);
    res.json({
      success: true,
      couponCode,
      newBalance: updatedUser ? (updatedUser.coins || 0) : 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Gets the list of available reward tiers
exports.getRewardTiers = async (req, res) => {
  try {
    const list = await RewardTier.find({ isActive: true }).sort({ sortOrder: 1, coinsRequired: 1 });
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
