import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import {
  useFonts,
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  FunnelDisplay_400Regular,
  FunnelDisplay_500Medium,
  FunnelDisplay_600SemiBold,
  FunnelDisplay_700Bold,
  FunnelDisplay_800ExtraBold,
} from '@expo-google-fonts/funnel-display';

import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/constants/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    // Montserrat - Body text
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    // Funnel Display - Headings
    FunnelDisplay_400Regular,
    FunnelDisplay_500Medium,
    FunnelDisplay_600SemiBold,
    FunnelDisplay_700Bold,
    FunnelDisplay_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
});
