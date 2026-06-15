import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  icon,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, tokens } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontFamily: tokens.typography.fonts.semiBold,
              fontSize: tokens.typography.sizes.caption.fontSize,
              color: error ? tokens.colors.error : colors.textSecondary,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? tokens.colors.error
              : isFocused
              ? tokens.colors.primary
              : colors.border,
            borderRadius: tokens.radius.md,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              fontFamily: tokens.typography.fonts.regular,
              fontSize: tokens.typography.sizes.body.fontSize,
              color: colors.textPrimary,
            },
            inputStyle,
          ]}
          {...props}
        />
      </View>

      {error && (
        <Text
          style={[
            styles.errorText,
            {
              fontFamily: tokens.typography.fonts.medium,
              fontSize: tokens.typography.sizes.tiny.fontSize,
              color: tokens.colors.error,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    height: 52,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
