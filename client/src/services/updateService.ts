import axios from 'axios';
import { APP_VERSION } from '../constants/AppVersion';

interface ApkInfo {
  version?: string;
  size?: string;
  url: string;
  available: boolean;
  uploadDate?: string;
}

// Compare version strings (e.g., "1.0.0" vs "1.0.1")
const compareVersions = (current: string, latest: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) {
      return true; // Update available
    } else if (latestPart < currentPart) {
      return false; // Current is newer
    }
  }

  return false; // Versions are equal
};

export const checkForUpdate = async (): Promise<ApkInfo | null> => {
  try {
    // Use public endpoint (no auth required)
    const response = await axios.get('https://www.chatoraadda.in/api/public/apk-info');
    const apkInfo: ApkInfo = response.data;

    if (!apkInfo.available || !apkInfo.version) {
      return null;
    }

    // Compare versions
    const updateAvailable = compareVersions(APP_VERSION, apkInfo.version);

    if (updateAvailable) {
      return apkInfo;
    }

    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
};
