import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { AlertProvider } from './src/context/AlertContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AlertProvider>
          <ThemeProvider>
            <RootNavigator />
            <Toast />
          </ThemeProvider>
        </AlertProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
