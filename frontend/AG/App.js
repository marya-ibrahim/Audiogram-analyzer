// ============================================================
// APP.JS — Main entry point with navigation + auth context
// ============================================================
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuthContext } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { ToastProvider } from "./src/components/Toast";
import { LanguageProvider } from "./src/context/LanguageContext";

import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SelectEarScreen from "./src/screens/SelectEarScreen";
import TestScreen from "./src/screens/TestScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import AboutScreen from "./src/screens/AboutScreen";
import { ActivityIndicator, View, Platform } from "react-native";

const Stack = createStackNavigator();

const screenTransition = ({ current, layouts }) => ({
  cardStyle: {
    opacity: current.progress,
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [layouts.screen.width * 0.08, 0],
        }),
      },
    ],
  },
});
if (Platform.OS === "web") {
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overflowY = "auto";
  document.body.style.overflow = "hidden";
  document.body.style.overflowY = "auto";
}

function AppNavigator() {
  const { isLoggedIn, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0E1A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#00E5CC" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#0A0E1A" },
        cardStyleInterpolator: screenTransition,
      }}
    >
      {!isLoggedIn ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SelectEar" component={SelectEarScreen} />
          <Stack.Screen name="Test" component={TestScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <NavigationContainer>
                <StatusBar style="light" />
                <AppNavigator />
              </NavigationContainer>
            </GestureHandlerRootView>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
