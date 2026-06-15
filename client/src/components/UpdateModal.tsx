import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { useAlert } from '../context/AlertContext';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  apkInfo: {
    version?: string;
    size?: string;
    url: string;
    available: boolean;
  };
}

export default function UpdateModal({ visible, onClose, apkInfo }: UpdateModalProps) {
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleUpdate = async () => {
    if (!apkInfo.url || !apkInfo.available) {
      showAlert('Error', 'Update not available');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Construct full download URL
      const downloadUrl = apkInfo.url.startsWith('http')
        ? apkInfo.url
        : `https://www.chatoraadda.in${apkInfo.url}`;

      console.log('📥 Opening download URL:', downloadUrl);
      
      // Check if URL can be opened
      const canOpen = await Linking.canOpenURL(downloadUrl);
      
      if (canOpen) {
        await Linking.openURL(downloadUrl);
        showAlert(
          'Download Started',
          'The APK download has started. Once downloaded, tap the notification to install the update.',
          [
            {
              text: 'OK',
              onPress: () => {
                setDownloading(false);
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error('Cannot open download URL');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      showAlert(
        'Download Error',
        'Failed to start download. Please download manually from the website.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setDownloading(false) },
          {
            text: 'Open Website',
            onPress: () => {
              Linking.openURL('https://www.chatoraadda.in');
              setDownloading(false);
            },
          },
        ]
      );
    }
  };

  const handleLater = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleLater}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-download-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Update Available</Text>
            <Text style={styles.subtitle}>
              A new version of the app is available
            </Text>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            {apkInfo.version && (
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.gray} />
                <Text style={styles.infoText}>Version: {apkInfo.version}</Text>
              </View>
            )}
            {apkInfo.size && (
              <View style={styles.infoRow}>
                <Ionicons name="document-outline" size={18} color={colors.gray} />
                <Text style={styles.infoText}>Size: {apkInfo.size}</Text>
              </View>
            )}
          </View>

          {/* Progress */}
          {downloading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.progressText}>Opening download...</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color={colors.white} />
                  <Text style={styles.updateButtonText}>Update Now</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.laterButton]}
              onPress={handleLater}
              disabled={downloading}
            >
              <Text style={styles.laterButtonText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: colors.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: colors.gray,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  updateButton: {
    backgroundColor: colors.primary,
  },
  updateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    backgroundColor: colors.light,
  },
  laterButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
