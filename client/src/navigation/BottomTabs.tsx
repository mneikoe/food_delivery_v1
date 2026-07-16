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
// Tabs on which the floating cart button should NOT appear
const HIDE_CART_TABS = new Set(['cart', 'profile']);

function FloatingCartContainer({ bottomOffset }: { bottomOffset: number }) {
  const { cartCount, cartTotal } = useCart();
  const navigation = useNavigation<any>();

  // Get the name of the currently active tab.
  // This hook works correctly here because we're inside Tab.Navigator.
  const activeTabName = useNavigationState(state => {
    if (!state) return '';
    const activeRoute = state.routes[state.index];
    return activeRoute?.name ?? '';
  });

  const activeTabLower = String(activeTabName).toLowerCase();

  // Hide on Cart and Profile tabs — they have their own bottom actions
  const isVisible = cartCount > 0 && !HIDE_CART_TABS.has(activeTabLower);

  return (
    <FloatingCartButton
      cartCount={cartCount}
      cartTotal={cartTotal}
      isVisible={isVisible}
      bottomOffset={bottomOffset}
      onPress={() => navigation.navigate('Cart')}
    />
  );
}

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);
  const tabBarHeight = 60 + bottomPadding;
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);
  
  // Cart state for bottom tab badge
  const { cartCount, refreshCart } = useCart();

  React.useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              paddingBottom: bottomPadding,
              height: tabBarHeight,
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
            // Conditionally show tab badge if items are in the cart
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#FF9800',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 'bold',
            },
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
