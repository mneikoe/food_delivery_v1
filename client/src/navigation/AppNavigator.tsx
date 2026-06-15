import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
// import { StyleSheet, Text, View } from 'react-native';
// import React from 'react';

// const AppNavigator = () => {
//   return (
//     <View>
//       <Text>AppNavigator</Text>
//     </View>
//   );
// };

// export default AppNavigator;

// const styles = StyleSheet.create({});
