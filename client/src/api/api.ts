import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const api = axios.create({
  // baseURL: 'http://localhost:8080/api', // Utilizing adb reverse tcp:8080 tcp:8080
  baseURL: 'http://192.168.29.180:8080/api', // Physical phone -> laptop Wi-Fi IP fallback
  //baseURL: 'http://10.0.2.2:8080/api',     // Emulator only
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('AUTH_TOKEN');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors including 429
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      // Rate limit exceeded
      const retryAfter = error.response.data?.retryAfter || 60;
      const minutes = Math.ceil(retryAfter / 60);

      Alert.alert(
        'Too Many Requests',
        `You've made too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} and try again.`,
        [{ text: 'OK' }]
      );

      // Optionally: implement retry logic with exponential backoff
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Unauthorized - token might be expired
      await AsyncStorage.removeItem('AUTH_TOKEN');
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [{ text: 'OK' }]
      );
    }

    return Promise.reject(error);
  }
);
