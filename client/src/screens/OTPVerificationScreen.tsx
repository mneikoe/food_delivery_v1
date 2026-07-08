import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/api';
import { colors } from '../theme/colors';
import { useAlert } from '../context/AlertContext';

const { width } = Dimensions.get('window');

export default function OTPVerificationScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params as { orderId: string };
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      showAlert('Error', 'Please enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/delivery/orders/${orderId}/verify-otp`, { otp });
      showAlert('Success', 'OTP verified! Order marked as delivered.');
      navigation.navigate('App' as never);
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Verify Delivery OTP</Text>
        <Text style={styles.subtitle}>
          Enter the 4-digit OTP provided by the customer to complete delivery
        </Text>

        <TextInput
          style={styles.otpInput}
          value={otp}
          onChangeText={(text) => {
            // Only allow digits and limit to 4
            const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
            setOtp(digits);
          }}
          placeholder="0000"
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading || otp.length !== 4}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.verifyButtonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(width * 0.035, 14),
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  otpInput: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: Math.min(width * 0.08, 32),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: Math.min(width * 0.02, 8),
    marginBottom: 24,
    color: colors.text,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
