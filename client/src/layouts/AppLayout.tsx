import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import BottomTabs from "../navigation/BottomTabs";
import DeliveryBottomTabs from "../navigation/DeliveryBottomTabs";
import AdminBottomTabs from "../navigation/AdminBottomTabs";
import NameInputModal from "../components/NameInputModal";

import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import { useEffect, useRef } from "react";
import { updateUserLocation } from "../api/LocationApi";
import { useTheme } from "../context/ThemeContext";

export default function AppLayout() {
  const { user, showNameModal, setShowNameModal, refreshUser } = useAuth();
  const { setLocation, location } = useLocation();
  const isDeliveryPartner = user?.role === "DELIVERY_PARTNER";
  const isAdmin = user?.role === "ADMIN";
  const locationAttempted = useRef(false);
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);

  // Auto location detection as soon as app opens (once per session when no city)
  useEffect(() => {
    if (!user || locationAttempted.current || location?.isManual || location?.city) return;
    locationAttempted.current = true;
    updateUserLocation(setLocation, user?.role).catch(() => {
      locationAttempted.current = false;
    });
  }, [user, location?.city, location?.isManual, setLocation]);


  const handleNameSuccess = async (name: string) => {
    if (refreshUser) {
      await refreshUser();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 🔝 FIXED HEADER */}
      <AppHeader brandName="Chatora Adda" />

      {/* 📱 APP CONTENT - Role-based tabs */}
      <View style={styles.content}>
        {isAdmin ? (
          <AdminBottomTabs />
        ) : isDeliveryPartner ? (
          <DeliveryBottomTabs />
        ) : (
          <BottomTabs />
        )}
      </View>

      {/* Name Input Modal */}
      <NameInputModal
        visible={showNameModal}
        onClose={() => setShowNameModal(false)}
        onSuccess={handleNameSuccess}
        currentName={user?.name}
      />


    </SafeAreaView>
  );
}

const getStyles = (colors: any, tokens: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
