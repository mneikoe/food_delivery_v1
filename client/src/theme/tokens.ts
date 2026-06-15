import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { shadows } from './shadows';
import { radius } from './radius';
import { animations } from './animations';
import { elevations } from './elevations';
import { zIndex } from './zIndex';
import { layout } from './layout';

export const tokens = {
  colors,
  spacing,
  typography,
  shadows,
  radius,
  animations,
  elevations,
  zIndex,
  layout,
  gradients: {
    food: ['#FF6B35', '#FFB000'],
    premium: ['#FF6B35', '#FF8A00'],
    reward: ['#F59E0B', '#FFD700']
  }
} as const;

export type ThemeTokens = typeof tokens;
export { colors, spacing, typography, shadows, radius, animations, elevations, zIndex, layout };

