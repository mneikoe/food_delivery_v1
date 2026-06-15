import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { horizontalScale, moderateScale, isTablet } from '../theme/responsive';
import type { AlertButton } from '../context/AlertContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AppAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onHide: () => void;
};

export default function AppAlert({ visible, title, message, buttons, onHide }: AppAlertProps) {
  const handlePress = (btn: AlertButton) => {
    if (btn.onPress) btn.onPress();
    else onHide();
  };

  const isSuccess = title.toLowerCase().includes('success') || title === 'Success';
  const isError = title.toLowerCase().includes('error') || title === 'Error';

  const iconName = isSuccess ? 'checkmark-circle' : isError ? 'alert-circle' : 'information-circle';
  const iconColor = isSuccess ? colors.primary : isError ? '#DC2626' : colors.primary;

  const modalWidth = isTablet() ? Math.min(SCREEN_WIDTH * 0.5, 400) : SCREEN_WIDTH * 0.88;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onHide}
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, styles.overlayBg]}
          activeOpacity={1}
          onPress={onHide}
        />
        <View style={[styles.box, { width: modalWidth }]} pointerEvents="box-none">
          <View style={styles.iconWrap}>
            <Ionicons name={iconName} size={moderateScale(44)} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            {(buttons.length ? buttons : [{ text: 'OK' }]).map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  btn.style === 'cancel' && styles.buttonCancel,
                  btn.style === 'destructive' && styles.buttonDestructive,
                  (buttons.length || 1) === 1 && styles.buttonSingle,
                ]}
                onPress={() => handlePress(btn)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === 'cancel' && styles.buttonTextCancel,
                    btn.style === 'destructive' && styles.buttonTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: horizontalScale(16),
  },
  overlayBg: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  box: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: moderateScale(15),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  buttonCancel: {
    backgroundColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: '#DC2626',
  },
  buttonSingle: {
    minWidth: 120,
  },
  buttonText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.white,
  },
  buttonTextCancel: {
    color: colors.text,
  },
  buttonTextDestructive: {
    color: colors.white,
  },
});
