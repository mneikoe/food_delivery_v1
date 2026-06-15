import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noShadow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, noShadow = false }) => {
  const { colors, tokens } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: tokens.radius.lg,
        },
        !noShadow && tokens.shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    width: '100%',
  },
});
