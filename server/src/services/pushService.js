const admin = require("firebase-admin");
const User = require("../models/User");

// Initialize Firebase Admin SDK
let isFirebaseInitialized = false;

try {
  // Look for Firebase credentials configuration. Can be configured via environment variables.
  // E.g. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
    
    // In firebase-admin, cert and applicationDefault are exported directly at root level
    const cert = admin.cert || (admin.default && admin.default.cert);
    if (!cert) {
      throw new Error("Firebase cert helper could not be resolved from import module.");
    }
    
    admin.initializeApp({
      credential: cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    console.log("✔ Firebase Admin initialized successfully using service account parameters.");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const appDefault = admin.applicationDefault || (admin.default && admin.default.applicationDefault);
    admin.initializeApp({
      credential: appDefault(),
    });
    isFirebaseInitialized = true;
    console.log("✔ Firebase Admin initialized successfully via GOOGLE_APPLICATION_CREDENTIALS.");
  } else {
    console.warn("⚠️ Firebase Admin credentials missing. Push notifications will run in SIMULATION mode.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
  console.warn("⚠️ Switching to push notification SIMULATION fallback.");
}

/**
 * Resolves Firebase Messaging service instance dynamically based on SDK version and bundling type.
 */
function getMessagingInstance() {
  if (typeof admin.messaging === "function") {
    return admin.messaging();
  }
  try {
    const { getMessaging } = require("firebase-admin/messaging");
    return getMessaging();
  } catch (err) {
    const fallbackMsg = admin.default && admin.default.messaging;
    if (typeof fallbackMsg === "function") {
      return fallbackMsg();
    }
    throw new Error("Firebase Messaging service could not be resolved from admin SDK imports.");
  }
}

/**
 * Sends a push notification payload to targeted registration tokens.
 * Handles invalid tokens automatically by removing them from database records.
 *
 * @param {string[]} tokens Registration tokens
 * @param {object} messagePayload Payload object containing title, body, and optional data parameters
 * @param {string} userId Context userId for token logging updates (optional)
 * @returns {Promise<{ sentCount: number, failedCount: number }>} Dispatch metrics
 */
async function sendPushNotification(tokens, messagePayload, userId = null) {
  if (!tokens || tokens.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  const payload = {
    notification: {
      title: messagePayload.title,
      body: messagePayload.body,
    },
    data: messagePayload.data || {},
  };

  // Safe fallback if Firebase Admin is not initialized
  if (!isFirebaseInitialized) {
    console.log(`[Push Simulation] Dispatched to user ${userId || "Bulk"}:`, JSON.stringify(payload, null, 2));
    console.log(`[Push Simulation] Targets (${tokens.length} devices):`, tokens);
    return { sentCount: tokens.length, failedCount: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;

  // Firebase Admin messaging dispatch
  try {
    const messagingInstance = getMessagingInstance();
    const response = await messagingInstance.sendEachForMulticast({
      tokens: tokens,
      notification: payload.notification,
      data: payload.data,
    });

    sentCount = response.successCount;
    failedCount = response.failureCount;

    // Handle token cleanup if FCM indicates tokens are invalid
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((res, index) => {
        if (!res.success) {
          const errorCode = res.error ? res.error.code : "";
          const token = tokens[index];
          // Check for classic Firebase registration/unregistered error formats
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/authentication-error"
          ) {
            tokensToRemove.push(token);
          }
          console.warn(`[Push Service] Delivery failure to device token [${token.substring(0, 15)}...]: ${errorCode} - ${res.error?.message}`);
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(`[Push Service] Initiating database cleanup for ${tokensToRemove.length} stale/invalid tokens.`);
        await User.updateMany(
          {},
          { $pull: { fcmTokens: { token: { $in: tokensToRemove } } } }
        );
      }
    }
  } catch (error) {
    console.error("❌ Failed to broadcast push multicast payload:", error);
    failedCount = tokens.length;
  }

  return { sentCount, failedCount };
}

module.exports = {
  sendPushNotification,
  isFirebaseInitialized: () => isFirebaseInitialized,
};
