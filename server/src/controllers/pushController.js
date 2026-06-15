const User = require("../models/User");
const NotificationLog = require("../models/NotificationLog");
const NotificationTemplate = require("../models/NotificationTemplate");
const pushService = require("../services/pushService");
const mongoose = require("mongoose");

// Save or Update push token for multi-device support
exports.savePushToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { token, platform, appVersion } = req.body;

    if (!token || !platform) {
      return res.status(400).json({ error: "Token and platform are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Initialize array if missing
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    // Check for duplicate token
    const tokenIndex = user.fcmTokens.findIndex((t) => t.token === token);
    if (tokenIndex > -1) {
      // Update metadata
      user.fcmTokens[tokenIndex].platform = platform;
      user.fcmTokens[tokenIndex].appVersion = appVersion;
      user.fcmTokens[tokenIndex].updatedAt = new Date();
    } else {
      // Add new token
      user.fcmTokens.push({
        token,
        platform,
        appVersion,
        updatedAt: new Date(),
      });
    }

    await user.save();

    // Track analytics event simulation
    console.log(`[Analytics] Track Event: "notification_registered"`, { userId, platform });

    res.json({ success: true, message: "Push token registered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete token on logout to prevent push updates
exports.deletePushToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required for cleanup" });
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { fcmTokens: { token: token } } }
    );

    res.json({ success: true, message: "Push token unregistered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update push notification channel preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { marketing, orderUpdates, gameNotifications, couponNotifications } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.notificationSettings = {
      marketing: typeof marketing === "boolean" ? marketing : user.notificationSettings.marketing,
      orderUpdates: typeof orderUpdates === "boolean" ? orderUpdates : user.notificationSettings.orderUpdates,
      gameNotifications: typeof gameNotifications === "boolean" ? gameNotifications : user.notificationSettings.gameNotifications,
      couponNotifications: typeof couponNotifications === "boolean" ? couponNotifications : user.notificationSettings.couponNotifications,
    };

    await user.save();
    res.json({ success: true, settings: user.notificationSettings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get current push preference configs
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user.notificationSettings || {
      marketing: true,
      orderUpdates: true,
      gameNotifications: true,
      couponNotifications: true,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Preview targeted audience count before broadcasting
exports.previewAudience = async (req, res) => {
  try {
    const { targetType } = req.query; // ALL_USERS, CUSTOMERS, DELIVERY_PARTNERS, ADMINS
    
    let query = {};
    if (targetType === "CUSTOMERS") {
      query = { role: "USER" };
    } else if (targetType === "DELIVERY_PARTNERS") {
      query = { role: "DELIVERY_PARTNER" };
    } else if (targetType === "ADMINS") {
      query = { role: "ADMIN" };
    }

    const matchedUsers = await User.find(query);
    let totalDevices = 0;
    matchedUsers.forEach((u) => {
      if (u.fcmTokens) totalDevices += u.fcmTokens.length;
    });

    res.json({
      targetType,
      userCount: matchedUsers.length,
      deviceCount: totalDevices,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Admin Broadcast Push Messages
exports.broadcastPush = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { title, body, targetType, singleUserId, deepLink, isTestOnly } = req.body;

    if (!title || !body || !targetType) {
      return res.status(400).json({ error: "Title, body and targetType are required" });
    }

    let users = [];
    if (targetType === "SINGLE_USER") {
      if (!singleUserId) return res.status(400).json({ error: "singleUserId required for single targeting" });
      const user = await User.findById(singleUserId);
      if (user) users.push(user);
    } else {
      let query = {};
      if (targetType === "CUSTOMERS") {
        query = { role: "USER" };
      } else if (targetType === "DELIVERY_PARTNERS") {
        query = { role: "DELIVERY_PARTNER" };
      } else if (targetType === "ADMINS") {
        query = { role: "ADMIN" };
      }
      users = await User.find(query);
    }

    // Filter tokens by users' opt-in preferences for marketing campaigns (unless it's an order or system emergency)
    const tokens = [];
    users.forEach((u) => {
      // Check opt-in preference: if it is not custom test, filter by marketing settings
      if (u.notificationSettings && u.notificationSettings.marketing === false) {
        return; // Opted out of broadcast marketing campaigns
      }
      if (u.fcmTokens && u.fcmTokens.length > 0) {
        u.fcmTokens.forEach((t) => tokens.push(t.token));
      }
    });

    if (tokens.length === 0) {
      return res.status(400).json({ error: "No active device tokens found for target audience" });
    }

    // Dispatches FCM messages
    const payload = {
      title,
      body,
      data: {
        type: deepLink ? "DEEP_LINK" : "BROADCAST",
        destination: deepLink || "",
      },
    };

    const result = await pushService.sendPushNotification(tokens, payload);

    // Save Campaign Log
    const log = new NotificationLog({
      title,
      body,
      targetType,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      status: pushService.isFirebaseInitialized() ? "SENT" : "SIMULATED",
      createdBy: adminId,
    });
    await log.save();

    console.log(`[Analytics] Track Event: "broadcast_sent"`, {
      broadcastId: log._id,
      targetType,
      devices: tokens.length,
    });

    res.json({
      success: true,
      logId: log._id,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      status: log.status,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Admin templates management APIs
exports.getTemplates = async (req, res) => {
  try {
    const templates = await NotificationTemplate.find();
    res.json(templates);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, title, body, deepLink } = req.body;
    if (!name || !title || !body) {
      return res.status(400).json({ error: "Name, title, and body are required" });
    }

    const template = new NotificationTemplate({ name, title, body, deepLink });
    await template.save();

    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, deepLink, isActive } = req.body;

    const template = await NotificationTemplate.findById(id);
    if (!template) return res.status(404).json({ error: "Template not found" });

    template.title = title !== undefined ? title : template.title;
    template.body = body !== undefined ? body : template.body;
    template.deepLink = deepLink !== undefined ? deepLink : template.deepLink;
    template.isActive = isActive !== undefined ? isActive : template.isActive;

    await template.save();
    res.json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await NotificationTemplate.findByIdAndDelete(id);
    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get dispatch log history for dashboard analytics
exports.getHistoryLogs = async (req, res) => {
  try {
    const list = await NotificationLog.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Send single device push verification testing utility
exports.testPushSingle = async (req, res) => {
  try {
    const { token, title, body, deepLink } = req.body;
    if (!token || !title || !body) {
      return res.status(400).json({ error: "Token, title, and body are required" });
    }

    const payload = {
      title,
      body,
      data: {
        type: deepLink ? "DEEP_LINK" : "TEST",
        destination: deepLink || "",
      },
    };

    const result = await pushService.sendPushNotification([token], payload);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
