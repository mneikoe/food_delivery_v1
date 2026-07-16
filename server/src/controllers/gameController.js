const crypto = require("crypto");
const User = require("../models/User");
const GameEconomySettings = require("../models/GameEconomySettings");
const RewardTier = require("../models/RewardTier");
const CoinTransaction = require("../models/CoinTransaction");
const CouponRedemption = require("../models/CouponRedemption");
const GameSession = require("../models/GameSession");
const GamePlayTracker = require("../models/GamePlayTracker");
const Coupon = require("../models/Coupon");
const pushService = require("../services/pushService");

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get or create singleton economy settings */
async function getEconomySettings() {
  let settings = await GameEconomySettings.findOne({ isActive: true });
  if (!settings) {
    // No document at all — create fresh with new defaults
    settings = new GameEconomySettings({
      attemptsPerSession: 10,
      coinsPerCorrect: 2,
      maxSessionsPerDay: 3,
      bonusCoins: 5,
      weeklyCoinRedemptionLimit: 500,
      dailyRewardAmount: 10,
      isActive: true,
    });
    await settings.save();
    return settings;
  }

  // ── Migration: old document may have legacy JumpGame fields ──────────
  // If new Number Tap fields are missing/undefined, patch them in and save.
  let needsSave = false;
  const DEFAULTS = {
    attemptsPerSession: 10,
    coinsPerCorrect: 2,
    maxSessionsPerDay: 3,
    bonusCoins: 5,
    weeklyCoinRedemptionLimit: 500,
    dailyRewardAmount: 10,
  };
  for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
    if (settings[key] === undefined || settings[key] === null) {
      settings[key] = defaultVal;
      needsSave = true;
    }
  }
  if (needsSave) {
    await settings.save();
    console.log('[GameEconomy] Migrated legacy settings document to Number Tap schema.');
  }

  return settings;
}

/** Returns local date string YYYY-MM-DD */
function getLocalDateString() {
  const d = new Date();
  // Using en-CA locale forces YYYY-MM-DD output reliably in the local system timezone
  return d.toLocaleDateString('en-CA');
}

/** Logs a coin transaction and updates User.coins cache atomically */
async function recordCoinTransaction({ userId, type, coins, source, referenceId = null, metadata = {} }) {
  const transaction = new CoinTransaction({ userId, type, coins, source, referenceId, metadata });
  await transaction.save();

  const user = await User.findById(userId);
  if (user) {
    user.coins = Math.max(0, (user.coins || 0) + coins);
    await user.save();
  }
  return transaction;
}

// ─── Game Status ─────────────────────────────────────────────────────────────

/**
 * GET /user/game/status
 * Returns: settings + how many sessions user played today + coins
 */
exports.getGameStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    const tracker = await GamePlayTracker.findOne({ userId, date: today });
    const sessionsPlayedToday = tracker ? tracker.plays : 0;

    const user = await User.findById(userId);
    const userCoins = user ? (user.coins || 0) : 0;

    // Next reward tier progress
    const nextRewardTier = await RewardTier.findOne({
      isActive: true,
      coinsRequired: { $gt: userCoins },
    }).sort({ coinsRequired: 1 });

    let nextReward = null;
    if (nextRewardTier) {
      nextReward = {
        title: nextRewardTier.title,
        coinsNeeded: nextRewardTier.coinsRequired - userCoins,
        coinsRequired: nextRewardTier.coinsRequired,
        couponValue: nextRewardTier.couponValue,
      };
    }

    res.json({
      isActive: settings.isActive,
      attemptsPerSession: settings.attemptsPerSession,
      coinsPerCorrect: settings.coinsPerCorrect,
      maxSessionsPerDay: settings.maxSessionsPerDay,
      bonusCoins: settings.bonusCoins,
      sessionsPlayedToday,
      sessionsRemaining: Math.max(0, settings.maxSessionsPerDay - sessionsPlayedToday),
      coins: userCoins,
      nextReward,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Start Game Session ───────────────────────────────────────────────────────

/**
 * POST /user/game/start
 * Creates a new ACTIVE session. Enforces maxSessionsPerDay limit.
 * Returns sessionId + settings so client knows how many attempts to give.
 */
exports.startGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    if (!settings.isActive) {
      return res.status(403).json({ error: "Game is currently disabled by admin." });
    }

    // Check + increment daily session count atomically
    let tracker = await GamePlayTracker.findOneAndUpdate(
      { userId, date: today },
      { $inc: { plays: 1 } },
      { new: true, upsert: true }
    );

    if (tracker.plays > settings.maxSessionsPerDay) {
      // Roll back the increment
      await GamePlayTracker.updateOne({ userId, date: today }, { $inc: { plays: -1 } });
      return res.status(403).json({
        error: `Daily session limit reached (${settings.maxSessionsPerDay} sessions/day). Come back tomorrow!`,
      });
    }

    // Create new session
    const sessionId = crypto.randomBytes(16).toString("hex");
    const session = new GameSession({
      userId,
      sessionId,
      status: "ACTIVE",
      gameType: "NUMBER_TAP",
      totalAttempts: settings.attemptsPerSession,
      startedAt: new Date(),
    });
    await session.save();

    res.json({
      sessionId,
      attemptsPerSession: settings.attemptsPerSession,
      coinsPerCorrect: settings.coinsPerCorrect,
      bonusCoins: settings.bonusCoins,
      sessionsRemaining: Math.max(0, settings.maxSessionsPerDay - tracker.plays),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── End Game Session ─────────────────────────────────────────────────────────

/**
 * POST /user/game/end
 * Body: { sessionId, correctClicks, totalAttempts }
 *
 * Server validates:
 *  - Session exists and belongs to this user
 *  - Session is ACTIVE (not already submitted / expired)
 *  - Session started within allowed timeout (10 min)
 *  - correctClicks <= totalAttempts (plausibility)
 *  - totalAttempts matches what server issued (anti-cheat)
 *
 * Coin calculation:
 *  coins = correctClicks * coinsPerCorrect
 *  + bonusCoins (only if correctClicks === totalAttempts, i.e. perfect session)
 */
exports.endGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId, correctClicks, totalAttempts } = req.body;

    // Basic payload validation
    if (
      !sessionId ||
      typeof correctClicks !== "number" ||
      typeof totalAttempts !== "number" ||
      correctClicks < 0 ||
      totalAttempts < 1
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Fetch session
    const session = await GameSession.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Game session not found" });
    }
    if (session.status !== "ACTIVE") {
      return res.status(403).json({ error: "Session already processed or expired" });
    }

    // Timeout check: session must be submitted within 10 minutes
    const elapsedMin = (Date.now() - session.startedAt.getTime()) / 60000;
    if (elapsedMin > 10) {
      session.status = "EXPIRED";
      await session.save();
      return res.status(403).json({ error: "Session expired (10 minute timeout)" });
    }

    const settings = await getEconomySettings();

    // Anti-cheat: totalAttempts from client must match what server issued
    if (totalAttempts !== session.totalAttempts) {
      return res.status(400).json({ error: "Suspicious payload — attempts mismatch" });
    }

    // Anti-cheat: can't have more correct clicks than total attempts
    const safeCorrect = Math.min(correctClicks, session.totalAttempts);

    // Coin calculation
    const earnedFromClicks = safeCorrect * settings.coinsPerCorrect;
    const isPerfect = safeCorrect === session.totalAttempts;
    const bonus = isPerfect ? settings.bonusCoins : 0;
    const totalCoins = earnedFromClicks + bonus;

    // Update and close session
    session.status = "SUBMITTED";
    session.submittedAt = new Date();
    session.correctClicks = safeCorrect;
    session.coinsAwarded = totalCoins;
    await session.save();

    // Record coin transaction and update User.coins
    if (totalCoins > 0) {
      await recordCoinTransaction({
        userId,
        type: "GAME_REWARD",
        coins: totalCoins,
        source: "Number Tap Game",
        referenceId: session._id,
        metadata: {
          correctClicks: safeCorrect,
          totalAttempts: session.totalAttempts,
          isPerfect,
          bonusCoins: bonus,
        },
      });

      // Push notification
      try {
        const user = await User.findById(userId);
        if (user && user.fcmTokens && user.fcmTokens.length > 0) {
          const gamePref =
            user.notificationSettings
              ? user.notificationSettings.gameNotifications !== false
              : true;
          if (gamePref) {
            const msg = isPerfect
              ? `Perfect game! 🎯 ${safeCorrect}/${session.totalAttempts} correct. You earned +🪙${totalCoins} (includes ${bonus} bonus)!`
              : `Good job! 🎯 ${safeCorrect}/${session.totalAttempts} correct. You earned +🪙${totalCoins} Chatora Coins!`;
            await pushService.sendPushNotification(
              user.fcmTokens.map((t) => t.token),
              {
                title: "🪙 Coins Earned!",
                body: msg,
                data: { type: "GAME" },
              },
              userId
            );
          }
        }
      } catch (err) {
        console.error("[Game Push] Failed to send notification:", err.message);
      }
    }

    const updatedUser = await User.findById(userId);
    res.json({
      coinsEarned: totalCoins,
      correctClicks: safeCorrect,
      totalAttempts: session.totalAttempts,
      isPerfect,
      bonusCoins: bonus,
      newBalance: updatedUser ? updatedUser.coins || 0 : 0,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Daily Reward ─────────────────────────────────────────────────────────────

/**
 * POST /user/game/daily-reward/claim
 * Free daily coin check-in (independent of game plays)
 */
exports.claimDailyReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    const alreadyClaimed = await CoinTransaction.findOne({
      userId,
      type: "DAILY_REWARD",
      createdAt: {
        $gte: new Date(today + "T00:00:00.000Z"),
        $lte: new Date(today + "T23:59:59.999Z"),
      },
    });
    if (alreadyClaimed) {
      return res.status(403).json({ error: "Daily reward already claimed today!" });
    }

    await recordCoinTransaction({
      userId,
      type: "DAILY_REWARD",
      coins: settings.dailyRewardAmount,
      source: "Daily Check-In Reward",
    });

    const user = await User.findById(userId);

    try {
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        await pushService.sendPushNotification(
          user.fcmTokens.map((t) => t.token),
          {
            title: "🎁 Daily Reward Claimed!",
            body: `You claimed +🪙${settings.dailyRewardAmount} Chatora Coins! Play the Number Tap game to earn more.`,
            data: { type: "COUPON" },
          },
          userId
        );
      }
    } catch (err) {
      console.error("[Daily Reward Push] Failed:", err.message);
    }

    res.json({
      success: true,
      coinsClaimed: settings.dailyRewardAmount,
      newBalance: user ? user.coins || 0 : 0,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * GET /user/game/leaderboard?type=DAILY|WEEKLY
 * Top 20 users by coins earned from game sessions
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = "DAILY" } = req.query;
    const today = getLocalDateString();

    let matchQuery = { status: "SUBMITTED", gameType: "NUMBER_TAP" };
    if (type === "DAILY") {
      const start = new Date(today + "T00:00:00.000Z");
      const end = new Date(today + "T23:59:59.999Z");
      matchQuery.submittedAt = { $gte: start, $lte: end };
    } else {
      const cutOff = new Date();
      cutOff.setDate(cutOff.getDate() - 7);
      matchQuery.submittedAt = { $gte: cutOff };
    }

    const rankings = await GameSession.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$userId", totalCoins: { $sum: "$coinsAwarded" } } },
      { $sort: { totalCoins: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalCoins: 1,
          username: "$user.name",
        },
      },
    ]);

    res.json(
      rankings.map((item, idx) => ({
        rank: idx + 1,
        userId: item._id,
        username: item.username,
        coinsEarned: item.totalCoins,
      }))
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Dashboard Info ───────────────────────────────────────────────────────────

/**
 * GET /user/game/dashboard
 * Summary for the game screen header
 */
exports.getDashboardInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getLocalDateString();
    const settings = await getEconomySettings();

    const user = await User.findById(userId);
    const userCoins = user ? user.coins || 0 : 0;

    const tracker = await GamePlayTracker.findOne({ userId, date: today });
    const sessionsPlayedToday = tracker ? tracker.plays : 0;

    const todayClaim = await CoinTransaction.findOne({
      userId,
      type: "DAILY_REWARD",
      createdAt: {
        $gte: new Date(today + "T00:00:00.000Z"),
        $lte: new Date(today + "T23:59:59.999Z"),
      },
    });

    const nextRewardTier = await RewardTier.findOne({
      isActive: true,
      coinsRequired: { $gt: userCoins },
    }).sort({ coinsRequired: 1 });

    let nextReward = null;
    if (nextRewardTier) {
      nextReward = {
        title: nextRewardTier.title,
        coinsNeeded: nextRewardTier.coinsRequired - userCoins,
        coinsRequired: nextRewardTier.coinsRequired,
        couponValue: nextRewardTier.couponValue,
      };
    }

    // Best session today
    const bestSession = await GameSession.findOne({
      userId,
      gameType: "NUMBER_TAP",
      status: "SUBMITTED",
      submittedAt: {
        $gte: new Date(today + "T00:00:00.000Z"),
        $lte: new Date(today + "T23:59:59.999Z"),
      },
    }).sort({ coinsAwarded: -1 });

    res.json({
      coins: userCoins,
      isActive: settings.isActive,
      attemptsPerSession: settings.attemptsPerSession,
      coinsPerCorrect: settings.coinsPerCorrect,
      maxSessionsPerDay: settings.maxSessionsPerDay,
      bonusCoins: settings.bonusCoins,
      dailyRewardAmount: settings.dailyRewardAmount,
      sessionsPlayedToday,
      sessionsRemaining: Math.max(0, settings.maxSessionsPerDay - sessionsPlayedToday),
      claimedDailyRewardToday: !!todayClaim,
      nextReward,
      bestSessionCoins: bestSession ? bestSession.coinsAwarded : 0,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Reward Tiers ─────────────────────────────────────────────────────────────

exports.getRewardTiers = async (req, res) => {
  try {
    const list = await RewardTier.find({ isActive: true }).sort({ sortOrder: 1, coinsRequired: 1 });
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Redeem Coins for Coupon ──────────────────────────────────────────────────

exports.redeemReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const { rewardTierId } = req.body;

    const rewardTier = await RewardTier.findOne({ _id: rewardTierId, isActive: true });
    if (!rewardTier) {
      return res.status(404).json({ error: "Reward tier not found" });
    }

    const user = await User.findById(userId);
    if (!user || (user.coins || 0) < rewardTier.coinsRequired) {
      return res.status(400).json({ error: "Insufficient coins for redemption" });
    }

    // Weekly limit
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const weeklyCount = await CouponRedemption.countDocuments({
      userId,
      rewardTierId,
      redeemedAt: { $gte: startOfWeek },
    });
    if (weeklyCount >= rewardTier.weeklyLimit) {
      return res.status(400).json({
        error: `Weekly redemption limit reached for this reward (${rewardTier.weeklyLimit} times)`,
      });
    }

    // Monthly limit
    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    const monthlyCount = await CouponRedemption.countDocuments({
      userId,
      rewardTierId,
      redeemedAt: { $gte: startOfMonth },
    });
    if (monthlyCount >= rewardTier.monthlyLimit) {
      return res.status(400).json({
        error: `Monthly redemption limit reached for this reward (${rewardTier.monthlyLimit} times)`,
      });
    }

    const codeSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    const couponCode = `CHATORA-${rewardTier.couponValue}-${codeSuffix}`;

    const newCoupon = new Coupon({
      code: couponCode,
      discountType: "FLAT",
      discountValue: rewardTier.couponValue,
      minOrderValue: 0,
      isActive: true,
      usageLimit: 1,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isGameReward: true,
    });
    await newCoupon.save();

    await recordCoinTransaction({
      userId,
      type: "COUPON_REDEMPTION",
      coins: -rewardTier.coinsRequired,
      source: `Redeemed ${rewardTier.title}`,
      metadata: { couponCode, rewardTierId: rewardTier._id },
    });

    const redemption = new CouponRedemption({
      userId,
      rewardTierId: rewardTier._id,
      coinsSpent: rewardTier.coinsRequired,
      couponCode,
      couponValue: rewardTier.couponValue,
    });
    await redemption.save();

    const updatedUser = await User.findById(userId);
    res.json({
      success: true,
      couponCode,
      newBalance: updatedUser ? updatedUser.coins || 0 : 0,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Legacy stubs (kept so old routes don't 500) ──────────────────────────────

exports.submitGame = exports.endGame; // route alias
exports.claimMissionReward = async (req, res) => res.status(410).json({ error: "Missions removed in this version" });
exports.claimStreakReward = async (req, res) => res.status(410).json({ error: "Streaks removed in this version" });
