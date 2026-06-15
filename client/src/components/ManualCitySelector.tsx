import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { colors } from "../theme/colors";
import { useLocation } from "../context/LocationContext";

const POPULAR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
];

type ManualCitySelectorProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ManualCitySelector({
  visible,
  onClose,
}: ManualCitySelectorProps) {
  const { setLocation } = useLocation();
  const [customCity, setCustomCity] = useState("");

  const handleSelectCity = (city: string) => {
    setLocation({
      city,
      isManual: true,
    });
    setCustomCity("");
    onClose();
  };

  const handleCustomCity = () => {
    if (customCity.trim()) {
      handleSelectCity(customCity.trim());
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Your City</Text>
          <Text style={styles.subtitle}>
            Location permission was denied. Please select your city manually.
          </Text>

          {/* Popular Cities */}
          <Text style={styles.sectionTitle}>Popular Cities</Text>
          <View style={styles.cityGrid}>
            {POPULAR_CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.cityButton}
                onPress={() => handleSelectCity(city)}
              >
                <Text style={styles.cityButtonText}>{city}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom City Input */}
          <Text style={styles.sectionTitle}>Or Enter Custom City</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter city name"
              value={customCity}
              onChangeText={setCustomCity}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                !customCity.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleCustomCity}
              disabled={!customCity.trim()}
            >
              <Text style={styles.submitButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cityButton: {
    backgroundColor: colors.light,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityButtonText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  closeButton: {
    marginTop: 10,
    padding: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
