import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [countdown, setCountdown] = useState(0);
  
  const otpInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Countdown timer for OTP resend
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.length > 0) {
      setEmailValid(validateEmail(text));
    } else {
      setEmailValid(true);
    }
    setError('');
  };

  const sendOtp = async () => {
    if (!validateEmail(email)) {
      setEmailValid(false);
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-email-otp', { email });
      setStep('OTP');
      setCountdown(60); // 60 seconds countdown
      // Animate transition
      slideAnim.setValue(50);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-email-otp', { email });
      setCountdown(60);
    } catch (error: any) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-email-otp', {
        email,
        otp,
      });
      login(res.data.token, res.data.user);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Safe image loading with fallback
  let logoSource;
  let backgroundSource;
  try {
    logoSource = require('../assets/logoctrabw.png');
  } catch {
    logoSource = null;
  }
  try {
    backgroundSource = require('../assets/auth-bg.jpg');
  } catch {
    backgroundSource = null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {backgroundSource ? (
        <Image source={backgroundSource} style={styles.backgroundImage} blurRadius={2} />
      ) : (
        <View style={styles.backgroundGradient} />
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo and Brand Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              {logoSource ? (
                <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="restaurant" size={32} color={tokens.colors.white} />
                </View>
              )}
            </View>
            <Text style={styles.appName}>Chatora Adda</Text>
           
          </View>

          {/* Auth Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {step === 'EMAIL' ? 'Welcome Back!' : 'Enter OTP'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {step === 'EMAIL'
                  ? 'Enter your email to continue'
                  : `We've sent a 4-digit code to\n${email}`}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'EMAIL' ? (
              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[
                    styles.inputContainer,
                    !emailValid && styles.inputContainerError,
                  ]}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={emailValid ? colors.textSecondary : '#ef4444'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor={colors.muted}
                      value={email}
                      onChangeText={handleEmailChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      style={[styles.input, { color: colors.textPrimary }]}
                      editable={!loading}
                    />
                    {email.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setEmail('')}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {!emailValid && (
                    <Text style={styles.validationError}>Please enter a valid email</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={sendOtp}
                  disabled={loading || !emailValid || email.length === 0}
                >
                  {loading ? (
                    <ActivityIndicator color={tokens.colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.buttonText, { color: tokens.colors.white }]}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color={tokens.colors.white} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Enter 4-digit OTP</Text>
                  <TouchableWithoutFeedback onPress={() => otpInputRef.current?.focus()}>
                    <View style={styles.otpContainer}>
                      {[0, 1, 2, 3].map((index) => (
                        <View
                          key={index}
                          style={[
                            styles.otpDigit,
                            otp.length === index && styles.otpDigitActive,
                          ]}
                        >
                          <Text style={styles.otpDigitText}>
                            {otp[index] || ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableWithoutFeedback>
                  <TextInput
                    ref={otpInputRef}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text.replace(/[^0-9]/g, '').slice(0, 4));
                      setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.hiddenInput, { color: colors.textPrimary }]}
                    autoFocus={true}
                    editable={!loading}
                  />

                  <View style={styles.otpActions}>
                    <TouchableOpacity
                      onPress={resendOtp}
                      disabled={countdown > 0 || loading}
                      style={[
                        styles.resendButton,
                        (countdown > 0 || loading) && styles.resendButtonDisabled,
                      ]}
                    >
                      <Text style={[styles.resendText, { color: tokens.colors.primary }]}>
                        {countdown > 0
                          ? `Resend OTP in ${countdown}s`
                          : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={verifyOtp}
                  disabled={loading || otp.length !== 4}
                >
                  {loading ? (
                    <ActivityIndicator color={tokens.colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.buttonText, { color: tokens.colors.white }]}>Verify & Continue</Text>
                      <Ionicons name="checkmark-circle" size={20} color={tokens.colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setStep('EMAIL');
                    setOtp('');
                    setError('');
                    slideAnim.setValue(-50);
                    Animated.timing(slideAnim, {
                      toValue: 0,
                      duration: 400,
                      useNativeDriver: true,
                    }).start();
                  }}
                  disabled={loading}
                >
                  <Ionicons name="arrow-back" size={16} color={tokens.colors.primary} />
                  <Text style={[styles.backButtonText, { color: tokens.colors.primary }]}>Use different email</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms & Privacy */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={[styles.termsLink, { color: tokens.colors.primary }]}>Terms of Service</Text> and{' '}
              <Text style={[styles.termsLink, { color: tokens.colors.primary }]}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Bottom Illustration */}
          <View style={styles.illustrationContainer}>
            <Ionicons name="shield-checkmark" size={48} color={tokens.colors.primary + '30'} />
            <Text style={styles.secureText}>
              <Ionicons name="lock-closed" size={14} color={colors.muted} />
              {' '}Secure & Encrypted
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, tokens: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    minHeight: height,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  logoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 32,
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginLeft: 8,
    flex: 1,
  },
  form: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    height: 56,
  },
  inputContainerError: {
    borderColor: '#ef4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  validationError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 0,
    width: '100%',
    gap: 6,
  },
  otpDigit: {
    flex: 1,
    minWidth: 40,
    maxWidth: 50,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitActive: {
    borderColor: tokens.colors.primary,
    backgroundColor: colors.surface,
  },
  otpDigitText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: tokens.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  termsText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '600',
  },
  illustrationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  secureText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
  },
});