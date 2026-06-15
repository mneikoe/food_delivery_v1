export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  giant: 32,
  huge: 40,
  massive: 48,
  colossal: 64
} as const;

export type SpacingKeys = keyof typeof spacing;
