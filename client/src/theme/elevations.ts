import { Platform } from 'react-native';

export const elevations = {
  none: {
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 }
    })
  },
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#1E293B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3
      }
    })
  },
  popover: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8
      }
    })
  }
} as const;
