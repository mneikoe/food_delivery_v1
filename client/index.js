/**
 * @format
 */

// URL polyfill for React Native compatibility
import 'react-native-url-polyfill/auto';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

// Register background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Push Client] Background/Killed message handled:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
