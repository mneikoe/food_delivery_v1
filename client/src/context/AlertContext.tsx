import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertContextType = {
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

function getToastType(title: string, buttons?: AlertButton[]): 'success' | 'error' | 'info' {
  const t = (title || '').toLowerCase();
  if (t.includes('error') || buttons?.some((b) => b.style === 'destructive')) return 'error';
  if (t.includes('success') || t.includes('done')) return 'success';
  return 'info';
}

/**
 * Uses react-native-toast-message so messages show without needing Activity (no Android alert warning).
 * Same showAlert(title, message, buttons?) API for all screens.
 */
export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [, setState] = useState({});
  const hideAlert = useCallback(() => {
    Toast.hide();
  }, []);

  const showAlert = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      const btns = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
      const type = getToastType(title, btns);
      const primaryButton = btns.find((b) => b.style !== 'cancel') || btns[btns.length - 1];
      Toast.show({
        type,
        text1: title,
        text2: message,
        visibilityTime: 4000,
        onPress: () => {
          primaryButton?.onPress?.();
        },
      });
    },
    []
  );

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
};
