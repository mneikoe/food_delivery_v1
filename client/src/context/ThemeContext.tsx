import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { tokens } from '../theme/tokens';
import { ColorTheme } from '../theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeMode;
  isDark: boolean;
  colors: ColorTheme;
  tokens: typeof tokens;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeMode>(deviceScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (deviceScheme === 'dark' || deviceScheme === 'light') {
      setTheme(deviceScheme);
    }
  }, [deviceScheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = theme === 'dark';
  const activeColors = isDark ? tokens.colors.darkTheme : tokens.colors.lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: activeColors,
        tokens,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
