import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import { updateUserLocation } from '../api/LocationApi';
import ResponsiveContainer from '../components/ResponsiveContainer';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, token } = useAuth();
  const { location, setLocation } = useLocation();
  const { showAlert } = useAlert();
  const { colors, tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const styles = getStyles(colors, tokens, isDark);

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleOrderHistory = () => {
    if (user?.role === 'DELIVERY_PARTNER') {
      navigation.navigate('OrderHistory');
    } else {
      navigation.navigate('Orders');
    }
  };

  const handleUpdateLocation = async () => {
    if (!token) {
      showAlert('Error', 'Please log in to update your location.');
      return;
    }

    setIsUpdatingLocation(true);
    try {
      await updateUserLocation(setLocation, user?.role);
      showAlert('Success', 'Location updated successfully!');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update location';
      showAlert('Error', errorMessage);
      console.error('Location update error:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ResponsiveContainer>
      {/* Profile Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color={tokens.colors.white} />
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      {/* User Details Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="person-outline" size={20} color={tokens.colors.primary} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name</Text>
          <Text style={styles.detailValue}>{user?.name || 'Not set'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user?.email || 'Not set'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{user?.phone || 'Not set'}</Text>
        </View>
      </View>

      {/* Location Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="location-outline" size={20} color={tokens.colors.primary} />
            <Text style={styles.cardTitle}>Current Location</Text>
          </View>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateLocation}
            disabled={isUpdatingLocation}
          >
            {isUpdatingLocation ? (
              <ActivityIndicator size="small" color={tokens.colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color={tokens.colors.primary} />
                <Text style={styles.updateButtonText}>Update</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {(location?.city && location.city.trim()) || (location?.suburb && location.suburb.trim()) ? (
          <>
            {location.suburb && location.suburb.trim() && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Suburb</Text>
                <Text style={styles.detailValue}>
                  {location.suburb}
                  {location.isManual && (
                    <Text style={styles.manualBadge}> (Manual)</Text>
                  )}
                </Text>
              </View>
            )}
            {location.city && location.city.trim() && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>City</Text>
                <Text style={styles.detailValue}>
                  {location.city}
                  {location.isManual && !(location.suburb && location.suburb.trim()) && (
                    <Text style={styles.manualBadge}> (Manual)</Text>
                  )}
                </Text>
              </View>
            )}
            {location.state && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>State</Text>
                <Text style={styles.detailValue}>{location.state}</Text>
              </View>
            )}
            {location.country && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Country</Text>
                <Text style={styles.detailValue}>{location.country}</Text>
              </View>
            )}
            {location.address && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={[styles.detailValue, styles.addressText]}>
                  {location.address}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={32} color={colors.muted} />
            <Text style={styles.emptyStateText}>No location detected</Text>
            <Text style={styles.emptyStateSubtext}>
              Location will appear here once detected
            </Text>
          </View>
        )}
      </View>

      {/* Options Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="options-outline" size={20} color={tokens.colors.primary} />
            <Text style={styles.cardTitle}>Options</Text>
          </View>
        </View>

        {/* Order History */}
        {user?.role !== 'DELIVERY_PARTNER' && (
          <TouchableOpacity
            style={styles.optionItem}
            onPress={handleOrderHistory}
          >
            <View style={styles.optionLeft}>
              <Ionicons
                name="receipt-outline"
                size={22}
                color={tokens.colors.primary}
              />
              <Text style={styles.optionText}>Order History</Text>
            </View>
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={tokens.colors.white} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
      </ResponsiveContainer>
    </ScrollView>
  );
}

const getStyles = (colors: any, tokens: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: tokens.colors.primary,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDark ? colors.background : 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: tokens.colors.white,
  },
  userName: {
    fontSize: 24,
    fontFamily: tokens.typography.fonts.bold,
    fontWeight: '800',
    color: tokens.colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: tokens.typography.fonts.regular,
    color: tokens.colors.white,
    opacity: 0.9,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: isDark ? '#000000' : '#E2E8F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? colors.background : 'rgba(255, 107, 53, 0.08)',
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  updateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: tokens.typography.fonts.bold,
    color: colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: tokens.typography.fonts.medium,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: tokens.typography.fonts.semiBold,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  addressText: {
    textAlign: 'right',
    fontSize: 12,
  },
  manualBadge: {
    fontSize: 11,
    color: tokens.colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: tokens.typography.fonts.bold,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: tokens.typography.fonts.regular,
    marginTop: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: tokens.typography.fonts.medium,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: tokens.colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoutButtonText: {
    color: tokens.colors.white,
    fontSize: 16,
    fontFamily: tokens.typography.fonts.bold,
    fontWeight: '700',
  },
});

