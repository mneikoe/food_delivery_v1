import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const layout = {
  window: {
    width,
    height
  },
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  headerHeight: Platform.OS === 'ios' ? 44 : 56,
  bottomTabBarHeight: 64,
  screenPadding: 16
} as const;
