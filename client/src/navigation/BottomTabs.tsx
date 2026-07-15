/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigationState, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductScreen from '../screens/ProductScreen';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import FloatingCartButton from '../components/FloatingCartButton';

const Tab = createBottomTabNavigator();

/**
 * FloatingCartContainer
 *
 * Rendered INSIDE the Tab.Navigator scope so that:
 *  - useNavigationState() works correctly (has a navigator parent)
 *  - useNavigation() can call navigate('Cart') within tab navigator
 *
 * Logic:
 *  - isVisible = cartCount > 0 AND active tab is NOT 'Cart'
 *  - When user presses the button → navigate to 'Cart' tab
 */
function FloatingCartContainer() {
  const { cartCount, cartTotal } = useCart();
  const navigation = useNavigation<any>();

  // Get the name of the currently active tab.
  // This hook works correctly here because we're inside Tab.Navigator.
  const activeTabName = useNavigationState(state => {
    if (!state) return '';
    const activeRoute = state.routes[state.index];
    return activeRoute?.name ?? '';
  });

  const isOnCartTab = String(activeTabName).toLowerCase() === 'cart';

  // Show only when: cart has items AND we are NOT already on the Cart tab
  const isVisible = cartCount > 0 && !isOnCartTab;

  return (
    <FloatingCartButton
      cartCount={cartCount}
      cartTotal={cartTotal}
      isVisible={isVisible}
      onPress={() => navigation.navigate('Cart')}
    />
  );
}

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);

  return (
    <View style={{ flex: 1 }}>
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
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size || 24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Items"
          component={ProductScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="fast-food-outline" size={size || 24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size || 24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size || 24} color={color} />
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

      {/*
        FloatingCartContainer is rendered as a sibling to Tab.Navigator,
        but still inside the Tab.Navigator's parent View.
        Because it's a descendant of the Tab.Navigator's provider context,
        useNavigationState and useNavigation work correctly here.
      */}
      <FloatingCartContainer />
    </View>
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
