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
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

interface PhoneNumberModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhoneNumberModal({ visible, onClose, onSuccess }: PhoneNumberModalProps) {
  const { user, token } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePhone = (phoneNumber: string) => {
    // Basic phone validation - 10 digits minimum
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10;
  };

  const handleSave = async () => {
    const cleanedPhone = phone.replace(/\D/g, '');
    
    if (!validatePhone(cleanedPhone)) {
      showAlert('Invalid Phone Number', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setLoading(true);
    try {
      await api.put('/user/profile', { phone: cleanedPhone });
      showAlert('Success', 'Phone number saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess();
            onClose();
            setPhone('');
          },
        },
      ]);
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to save phone number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay} />
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Phone Number</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            A phone number is required to place orders. This helps us contact you regarding your delivery.
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your phone number"
                placeholderTextColor={colors.muted}
                value={phone}
                onChangeText={(text) => {
                  // Allow digits, spaces, dashes, and plus sign
                  const cleaned = text.replace(/[^\d+\-\s()]/g, '');
                  setPhone(cleaned);
                }}
                keyboardType="phone-pad"
                style={styles.input}
                autoFocus
                maxLength={15}
              />
            </View>
            <Text style={styles.hint}>
              Example: +1 234 567 8900 or 1234567890
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { marginRight: 12 }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading || !validatePhone(phone)}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
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
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
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
    flexDirection: 'row',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
