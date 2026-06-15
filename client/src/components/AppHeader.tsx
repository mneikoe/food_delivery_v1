import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocation } from "../context/LocationContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size: number) => {
  const scaleFactor = width / 375; // iPhone 6/7/8 width
  const newSize = size * scaleFactor;
  if (Platform.OS === 'ios') {
    return Math.round(newSize);
  }
  return newSize;
};

export default function AppHeader({
  brandName = "Chatora Adda",
}) {
  const { location } = useLocation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const userName = user?.name || "User";
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);

  // Determine if it's a small screen
  const isSmallScreen = width < 375;
  const isLargeScreen = width > 414;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, scale(12)) }]}>
      {/* Top Row */}
      <View style={styles.topRow}>
        {/* Welcome & User Info */}
        <View style={styles.userSection}>
          {/* Welcome Message */}
          <Text 
            style={[
              styles.welcomeText,
              isSmallScreen && styles.welcomeTextSmall,
              isLargeScreen && styles.welcomeTextLarge
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Welcome, {userName}!
          </Text>
        </View>

        {/* Location Info */}
        <View style={styles.infoSection}>
          {/* Location with Icon */}
          <View style={styles.locationContainer}>
            <Ionicons 
              name="location-outline" 
              size={scale(14)} 
              color={colors.textSecondary} 
              style={styles.locationIcon}
            />
            {location?.suburb && location.suburb.trim() ? (
              <Text 
                style={[
                  styles.locationText,
                  isSmallScreen && styles.locationTextSmall,
                  isLargeScreen && styles.locationTextLarge
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {location.suburb}
                {location.city && location.city.trim() && location.suburb !== location.city && (
                  <Text style={styles.locationSeparator}> • {location.city}</Text>
                )}
              </Text>
            ) : location?.city && location.city.trim() ? (
              <Text 
                style={[
                  styles.locationText,
                  isSmallScreen && styles.locationTextSmall,
                  isLargeScreen && styles.locationTextLarge
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {location.city}
              </Text>
            ) : (
              <Text 
                style={[
                  styles.locationText,
                  isSmallScreen && styles.locationTextSmall,
                  isLargeScreen && styles.locationTextLarge
                ]}
              >
                Detecting location...
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Divider Line - Only visible on larger screens */}
      {isLargeScreen && <View style={styles.divider} />}
    </View>
  );
}

const getStyles = (colors: any, tokens: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    shadowColor: isDark ? "#000000" : "#E2E8F0",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: scale(12),
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
    maxWidth: width * 0.5,
  },
  locationIcon: {
    marginRight: scale(6),
  },
  locationText: {
    fontSize: scale(14),
    color: colors.textSecondary,
    fontWeight: "500",
    flexShrink: 1,
    fontFamily: tokens.typography.fontFamily,
  },
  locationTextSmall: {
    fontSize: scale(12),
  },
  locationTextLarge: {
    fontSize: scale(15),
  },
  locationSeparator: {
    fontSize: scale(12),
    color: colors.muted,
    fontWeight: "400",
    fontFamily: tokens.typography.fontFamily,
  },
  welcomeText: {
    fontSize: scale(16),
    color: colors.textPrimary,
    fontWeight: "700",
    fontFamily: tokens.typography.fontFamily,
  },
  welcomeTextSmall: {
    fontSize: scale(14),
  },
  welcomeTextLarge: {
    fontSize: scale(18),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: scale(12),
    marginHorizontal: -scale(16),
  },
});