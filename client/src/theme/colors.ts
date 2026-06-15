export const colors = {
  primary: '#FF6B35', // Vibrant Food Orange
  secondary: '#FFB000', // Warm Amber
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#F8FAFC',
  gray: '#9CA3AF',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  
  light: '#F8FAFC',
  dark: '#0F172A',
  
  lightTheme: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    muted: '#9CA3AF'
  },
  darkTheme: {
    background: '#0F172A',
    surface: '#111827',
    border: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    muted: '#4B5563'
  }
};
export type ColorTheme = typeof colors.lightTheme;
