import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
  Animated,
  ViewStyle,
  TextStyle
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface ButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}) => {
  const { colors, tokens } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={variant === 'primary' ? '#FFF' : colors.textPrimary} />;
    }

    return (
      <Animated.View style={[styles.contentContainer, { transform: [{ scale: scaleAnim }] }]}>
        {icon && <React.Fragment>{icon}</React.Fragment>}
        <Text
          style={[
            styles.text,
            {
              fontFamily: tokens.typography.fonts.bold,
              fontSize: tokens.typography.sizes.subheading.fontSize,
              color: variant === 'primary' ? '#FFF' : colors.textPrimary,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    );
  };

  if (disabled) {
    return (
      <TouchableOpacity
        disabled
        style={[
          styles.button,
          styles.disabled,
          {
            backgroundColor: colors.border,
            borderRadius: tokens.radius.md,
          },
          style,
        ]}
      >
        <Text style={[styles.text, { color: colors.muted, fontFamily: tokens.typography.fonts.bold }]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[styles.touchableWrapper, style]}
      >
        <LinearGradient
          colors={[...tokens.gradients.food]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            {
              borderRadius: tokens.radius.md,
            },
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={[
        styles.button,
        variant === 'secondary' && {
          borderWidth: 1.5,
          borderColor: tokens.colors.primary,
          backgroundColor: 'transparent',
        },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
        },
        {
          borderRadius: tokens.radius.md,
        },
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchableWrapper: {
    width: '100%',
  },
  button: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
