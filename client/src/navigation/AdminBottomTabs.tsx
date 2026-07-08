/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminOrdersScreen from '../screens/AdminOrdersScreen';
import AdminOrderHistoryScreen from '../screens/AdminOrderHistoryScreen';
import AdminDeliveryPartnersScreen from '../screens/AdminDeliveryPartnersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function AdminBottomTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: bottomPadding,
            height: 60 + bottomPadding,
          },
        ],
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 2,
          fontFamily: tokens.typography.fonts.medium,
        },
      }}
    >
      <Tab.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
        options={{
          title: 'Active Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminOrderHistory"
        component={AdminOrderHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminRiders"
        component={AdminDeliveryPartnersScreen}
        options={{
          title: 'Riders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const getStyles = (colors: any, tokens: any, isDark: boolean) => StyleSheet.create({
  tabBar: {
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 8,
    shadowColor: isDark ? '#000000' : '#E2E8F0',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 8,
  },
});
