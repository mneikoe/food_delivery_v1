import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tablet breakpoint (e.g. 7" tablets ~600dp, 10" ~768dp)
const TABLET_BREAKPOINT = 600;

export const isTablet = (): boolean => SCREEN_WIDTH >= TABLET_BREAKPOINT;

export const getDimensions = (): ScaledSize => Dimensions.get('window');

export const wp = (percentage: number): number => (SCREEN_WIDTH * percentage) / 100;
export const hp = (percentage: number): number => (SCREEN_HEIGHT * percentage) / 100;

/**
 * Scale size for different screen densities; use for spacing, icons, fixed sizes.
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  const scale = (SCREEN_WIDTH / 400) * factor + (1 - factor);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Scale horizontally; use for widths and horizontal padding.
 */
export const horizontalScale = (size: number): number => {
  return (SCREEN_WIDTH / 400) * size;
};

/**
 * Scale vertically; use for heights and vertical padding.
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / 800) * size;
};

/**
 * Max content width for tablet (centered content, readable line length).
 */
export const CONTENT_MAX_WIDTH = 640;

/**
 * Number of columns for grid on tablet (e.g. 2 for product grids).
 */
export const getGridColumns = (): number => (isTablet() ? 2 : 1);

/**
 * Scale font size: slightly larger on tablet, consistent on phone.
 */
export const fontScale = (size: number): number => {
  if (isTablet()) {
    return Math.round(size * 1.1);
  }
  return size;
};

export default {
  isTablet,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  wp,
  hp,
  moderateScale,
  horizontalScale,
  verticalScale,
  fontScale,
  CONTENT_MAX_WIDTH,
  getGridColumns,
};
