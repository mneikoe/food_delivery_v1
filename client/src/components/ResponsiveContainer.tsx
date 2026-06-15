import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

type ResponsiveContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
};

/**
 * On tablet: centers content with max width for readable layout.
 * On phone: full width with optional horizontal padding.
 */
export default function ResponsiveContainer({ children, style, noPadding }: ResponsiveContainerProps) {
  const { isTablet, contentMaxWidth, horizontalPadding } = useResponsive();
  return (
    <View
      style={[
        styles.outer,
        !noPadding && { paddingHorizontal: horizontalPadding },
        isTablet && styles.outerTablet,
      ]}
    >
      <View style={[isTablet && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
  },
  outerTablet: {
    alignItems: 'center',
  },
});
