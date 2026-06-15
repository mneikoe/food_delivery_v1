import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/api';

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
};

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);

  // 🔹 App start pe token load
  useEffect(() => {
    const loadToken = async () => {
      const savedToken = await AsyncStorage.getItem('AUTH_TOKEN');
      if (savedToken) {
        setToken(savedToken);
        // Fetch user profile if token exists
        try {
          const response = await api.get('/user/profile', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          setUser(response.data);
        } catch (error) {
          // If profile fetch fails, clear token
          await AsyncStorage.removeItem('AUTH_TOKEN');
          setToken(null);
        }
      }
      setLoading(false);
    };
    loadToken();
  }, []);

  const login = async (jwt: string, userData?: User) => {
    await AsyncStorage.setItem('AUTH_TOKEN', jwt);
    setToken(jwt);
    
    // If user data provided, use it; otherwise fetch profile
    if (userData) {
      setUser(userData);
      // Check if name is default (email-based) and show modal
      if (shouldShowNameModal(userData)) {
        setShowNameModal(true);
      }
    } else {
      try {
        const response = await api.get('/user/profile', {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        setUser(response.data);
        // Check if name is default (email-based) and show modal
        if (shouldShowNameModal(response.data)) {
          setShowNameModal(true);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    }
  };

  // Helper to check if user needs to set a proper name
  const shouldShowNameModal = (userData: User) => {
    if (!userData.name || !userData.email) return false;
    // Check if name is email-based (default from backend)
    const emailUsername = userData.email.split('@')[0];
    return userData.name === emailUsername || userData.name.includes('@');
  };

  const logout = async () => {
    await AsyncStorage.removeItem('AUTH_TOKEN');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await api.get('/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, refreshUser, showNameModal, setShowNameModal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
