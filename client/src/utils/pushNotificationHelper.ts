import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/api';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';

const FCM_TOKEN_KEY = '@fcm_token_registered';

/**
 * Request notification permission from user and return FCM device token.
 */
export async function requestUserPermissionAndGetToken(): Promise<string | null> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('[Push Client] Notification permission status:', authStatus);
      const token = await messaging().getToken();
      if (token) {
        console.log('[Push Client] Retrieved FCM Token:', token);
        return token;
      }
    } else {
      console.log('[Push Client] Permission denied for push notifications.');
    }
  } catch (error) {
    console.warn('[Push Client] Error requesting notification permission:', error);
  }
  return null;
}

/**
 * Registers local device token with Node.js push server endpoint.
 * Deduplicates and captures current platform details and application version metadata.
 * 
 * @param {string} token FCM token retrieved from native client listeners
 * @returns {Promise<boolean>} Success state
 */
export async function registerDevicePushToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    // Fetch user token configuration from local storage to verify session auth state
    const authSession = await AsyncStorage.getItem('AUTH_TOKEN');
    
    // Skip remote api call if token is already registered to avoid overhead
    if (cachedToken === token) {
      console.log('[Push Client] Token already synced with push server.');
      return true;
    }

    // Delay registration if user session is not initialized
    if (!authSession) {
      console.log('[Push Client] Auth session missing. Postponing registration.');
      return false;
    }

    await api.post('/push/push-token', {
      token: token,
      platform: Platform.OS, // 'android' | 'ios'
      appVersion: '1.0.0',
    });

    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    console.log('[Push Client] Device Token registered successfully with push server.');
    return true;
  } catch (error: any) {
    console.warn('[Push Client] Failed to register device push token:', error.message);
    return false;
  }
}

/**
 * Handles cleanup of token on user logout to prevent device from receiving notification updates.
 */
export async function cleanPushTokenOnLogout(): Promise<void> {
  try {
    const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (cachedToken) {
      await api.delete('/push/push-token', { data: { token: cachedToken } });
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      console.log('[Push Client] Local push token cleaned up successfully.');
    }
  } catch (error: any) {
    console.warn('[Push Client] Failed to clean token on logout:', error.message);
  }
}

/**
 * Sets up foreground push listener to display a top banner Toast notification when app is active.
 */
export function setupForegroundNotificationListener(navigationRef: any): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    console.log('[Push Client] Foreground message received:', remoteMessage);
    
    // Display custom visual toast banner on screen
    Toast.show({
      type: 'info',
      text1: remoteMessage.notification?.title || 'Chatora Adda Alert 🔔',
      text2: remoteMessage.notification?.body || '',
      onPress: () => {
        if (remoteMessage.data) {
          handlePushNotificationDeepLink(remoteMessage.data, navigationRef);
        }
      }
    });
  });
}

/**
 * Maps push notification data payloads to deep links navigation actions.
 * 
 * @param {object} notificationPayload FCM message data
 * @param {any} navigation React navigation navigator reference object
 */
export function handlePushNotificationDeepLink(notificationPayload: any, navigation: any): void {
  if (!notificationPayload || !navigation) return;
  
  console.log('[Push Client] Processing Deep Link Target:', notificationPayload);
  
  const type = notificationPayload.type;
  const orderId = notificationPayload.orderId;

  if (type === 'ORDER' && orderId) {
    // Navigates directly to tracking view
    navigation.navigate('DeliveryOrderDetails', { orderId: orderId });
  } else if (type === 'GAME') {
    // Navigates user to Home feed where puppy game modal is available
    navigation.navigate('Home', { launchPuppyGame: true });
  } else if (type === 'COUPON') {
    navigation.navigate('Offers');
  } else if (notificationPayload.destination) {
    // Handle specific custom route navigations
    try {
      navigation.navigate(notificationPayload.destination);
    } catch (_) {
      console.warn(`[Push Client] Destination route ${notificationPayload.destination} not found.`);
    }
  }
}
