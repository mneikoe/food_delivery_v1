import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { navigationRef } from "./navigationRef";
import { 
  requestUserPermissionAndGetToken, 
  registerDevicePushToken, 
  setupForegroundNotificationListener 
} from "../utils/pushNotificationHelper";

import LoginScreen from "../screens/LoginScreen";
import ProductDetailsScreen from "../screens/ProductDetailsScreen";
import OrderDetailsScreen from "../screens/OrderDetailsScreen";
import DeliveryOrderDetailsScreen from "../screens/DeliveryOrderDetailsScreen";
import OTPVerificationScreen from "../screens/OTPVerificationScreen";
import CategoryProductsScreen from "../screens/CategoryProductsScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import SearchScreen from "../screens/SearchScreen";
import OffersScreen from "../screens/OffersScreen";
import AppLayout from "../layouts/AppLayout";

import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, loading, user } = useAuth();

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    let unsubscribeForeground: (() => void) | undefined;

    async function initNotifications() {
      try {
        const fcmToken = await requestUserPermissionAndGetToken();
        if (fcmToken && isMounted) {
          await registerDevicePushToken(fcmToken);
        }
        
        if (isMounted) {
          unsubscribeForeground = setupForegroundNotificationListener(navigationRef);
        }
      } catch (err) {
        console.warn("[RootNavigator] Failed to initialize push messaging:", err);
      }
    }

    initNotifications();

    return () => {
      isMounted = false;
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [token]);

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {/* 🔐 AUTHENTICATED APP WITH FIXED HEADER */}
            <Stack.Screen name="App" component={AppLayout} />

            {/* 📦 USER STACK SCREENS - Always register for all authenticated users */}
            <Stack.Screen
              name="Search"
              component={SearchScreen}
            />
            <Stack.Screen
              name="Categories"
              component={CategoriesScreen}
            />
            <Stack.Screen
              name="CategoryProducts"
              component={CategoryProductsScreen}
            />
            <Stack.Screen
              name="Offers"
              component={OffersScreen}
            />
            <Stack.Screen
              name="ProductDetails"
              component={ProductDetailsScreen}
            />
            <Stack.Screen
              name="OrderDetails"
              component={OrderDetailsScreen}
            />

            {/* 🚚 DELIVERY PARTNER STACK SCREENS */}
            {user?.role === "DELIVERY_PARTNER" && (
              <>
                <Stack.Screen
                  name="DeliveryOrderDetails"
                  component={DeliveryOrderDetailsScreen}
                />
                <Stack.Screen
                  name="OTPVerification"
                  component={OTPVerificationScreen}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
