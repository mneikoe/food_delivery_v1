import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { api } from '../api/api';
import { useAlert } from '../context/AlertContext';

interface NameInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
  currentName?: string;
}

export default function NameInputModal({ visible, onClose, onSuccess, currentName }: NameInputModalProps) {
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentName || '');
  const [loading, setLoading] = useState(false);

  const validateName = (inputName: string) => {
    const trimmed = inputName.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!validateName(trimmedName)) {
      showAlert('Invalid Name', 'Please enter a name between 2 and 50 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put('/user/profile', { name: trimmedName });
      showAlert('Success', 'Your name has been saved!', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess(trimmedName);
            onClose();
            setName('');
          },
        },
      ]);
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to save name');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    showAlert(
      'Skip Name Entry',
      'You can update your name later from the Profile screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            onClose();
            setName('');
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay} />
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome! 👋</Text>
            <Text style={styles.subtitle}>
              Please enter your name to personalize your experience
            </Text>
          </View>

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoFocus
                maxLength={50}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
            <Text style={styles.hint}>
              This name will be displayed throughout the app
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading || !validateName(name)}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
    marginLeft: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
});
