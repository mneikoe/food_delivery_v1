import { getCurrentLocation } from "../utils/getCurrentLocation";
import { api } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const updateUserLocation = async (
  setLocation: (loc: any) => void,
  userRole?: string
) => {
  // Verify token exists before making request
  const token = await AsyncStorage.getItem("AUTH_TOKEN");
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  const coords = await getCurrentLocation();

  // Determine API endpoint based on user role
  const endpoint =
    userRole === "DELIVERY_PARTNER"
      ? "/delivery/location/update"
      : "/user/location/update";

  try {
    const res = await api.post(endpoint, {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    console.log("Location API response:", res.data.location);
    setLocation(res.data.location);
    return res.data.location;
  } catch (error: any) {
    // Log detailed error for debugging
    if (error.response) {
      console.error("Location update error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });

      // Re-throw with more context
      if (error.response.status === 403) {
        const errorMsg = error.response.data?.error || "Access denied";
        console.error(
          "403 Forbidden - User role may not have permission. Error:",
          errorMsg
        );
        throw new Error(
          `${errorMsg}. Please ensure you are logged in with a valid account.`
        );
      } else if (error.response.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      }
    }
    throw error;
  }
};
