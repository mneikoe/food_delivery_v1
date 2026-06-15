import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocationType = {
    suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  isManual?: boolean; // Track if city was manually set
};

type LocationContextType = {
  location: LocationType | null;
  setLocation: (loc: LocationType) => void;
};

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

const STORAGE_KEY = "LAST_KNOWN_CITY";

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<LocationType | null>(null);

  // Load saved city on mount
  useEffect(() => {
    const loadSavedCity = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const savedLocation = JSON.parse(saved);
          setLocation(savedLocation);
        }
      } catch (error) {
        console.error("Failed to load saved city:", error);
      }
    };
    loadSavedCity();
  }, []);

  // Wrapper to persist location changes
  const updateLocation = async (loc: LocationType) => {
    setLocation(loc);
    // Persist city if available
    if (loc.city) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      } catch (error) {
        console.error("Failed to save city:", error);
      }
    }
  };

  return (
    <LocationContext.Provider value={{ location, setLocation: updateLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
};
