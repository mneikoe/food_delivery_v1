import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

const TABLET_BREAKPOINT = 600;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const isTablet = width >= TABLET_BREAKPOINT;
    const contentMaxWidth = 640;
    const horizontalPadding = isTablet ? 24 : 16;
    const cardPadding = isTablet ? 20 : 14;
    const titleSize = isTablet ? 22 : 18;
    const bodySize = isTablet ? 16 : 14;
    return {
      width,
      height,
      isTablet,
      contentMaxWidth,
      horizontalPadding,
      cardPadding,
      titleSize,
      bodySize,
    };
  }, [width, height]);
}
