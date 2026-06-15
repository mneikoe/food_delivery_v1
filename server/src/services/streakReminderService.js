const User = require("../models/User");
const UserStreak = require("../models/UserStreak");
const pushService = require("./pushService");

/**
 * Checks all active user streaks and sends a reminder push notification
 * to users who played yesterday but have not played yet today, 
 * to prevent their streak from breaking.
 */
async function checkAndSendStreakReminders() {
  try {
    console.log("[Streak Reminder] Starting daily streak active checks...");
    
    // Get local date strings
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Find user streaks that were active yesterday, but not played today yet
    const streaksToRemind = await UserStreak.find({
      lastPlayDate: yesterdayStr,
      currentStreak: { $gt: 0 }
    });

    console.log(`[Streak Reminder] Found ${streaksToRemind.length} active streaks to evaluate.`);
    let sentCount = 0;

    for (const streakDoc of streaksToRemind) {
      const user = await User.findById(streakDoc.userId);
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) continue;

      // Ensure user has game notifications enabled (default is true)
      const gamePref = user.notificationSettings ? user.notificationSettings.gameNotifications !== false : true;
      if (!gamePref) continue;

      const tokens = user.fcmTokens.map(t => t.token);
      const payload = {
        title: "🔥 Don't break your streak!",
        body: `Play Chatora Jump today to protect your ${streakDoc.currentStreak}-day streak and unlock premium coupons!`,
        data: {
          type: "GAME",
          launchPuppyGame: "true"
        }
      };

      await pushService.sendPushNotification(tokens, payload, user._id);
      sentCount++;
    }

    console.log(`[Streak Reminder] Dispatched reminders successfully to ${sentCount} users.`);
  } catch (err) {
    console.error("[Streak Reminder] Error running evaluation check:", err);
  }
}

/**
 * Initializes a background interval to run streak checks daily (every 24 hours).
 */
function initStreakReminderCron() {
  // Run check 1 minute after start to verify, then repeat every 24 hours
  setTimeout(() => {
    checkAndSendStreakReminders();
  }, 60000);

  // Interval check every 24 hours
  setInterval(async () => {
    await checkAndSendStreakReminders();
  }, 24 * 60 * 60 * 1000);
}

module.exports = {
  checkAndSendStreakReminders,
  initStreakReminderCron
};
