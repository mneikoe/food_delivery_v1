import Geolocation from "react-native-geolocation-service";
import { PermissionsAndroid, Platform, Linking, Alert } from "react-native";

export const getCurrentLocation = async () => {
  if (Platform.OS === "android") {
    // Check if permission is already granted
    const isGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    let granted: string;
    
    // If not granted, request permission with proper dialog
    if (!isGranted) {
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "This app needs access to your location to show your current city.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
    } else {
      granted = PermissionsAndroid.RESULTS.GRANTED;
    }

    // If FINE location is denied, try COARSE as fallback
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      const coarseGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: "Location Permission",
          message: "This app needs access to your approximate location to show your current city.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );

      if (coarseGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        // Show alert and offer to open settings
        Alert.alert(
          "Location Permission Required",
          "This app needs location access to show your current city. Would you like to open app settings?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open Settings",
              onPress: () => {
                Linking.openSettings().catch((err) =>
                  console.error("Failed to open settings:", err)
                );
              },
            },
          ]
        );
        throw new Error("Location permission denied. Please enable location permissions in app settings.");
      }
    }
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        // Provide more specific error messages
        if (err.code === 1) {
          // Permission denied - offer to open settings
          Alert.alert(
            "Location Permission Required",
            "This app needs location access to show your current city. Would you like to open app settings?",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Open Settings",
                onPress: () => {
                  Linking.openSettings().catch((err) =>
                    console.error("Failed to open settings:", err)
                  );
                },
              },
            ]
          );
          reject(new Error("Location permission denied. Please enable location permissions in app settings."));
        } else if (err.code === 2) {
          reject(new Error("Location unavailable. Please check your GPS settings."));
        } else if (err.code === 3) {
          reject(new Error("Location request timed out. Please try again."));
        } else {
          reject(new Error(`Failed to get location: ${err.message || "Unknown error"}`));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
};
