import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
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

import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AlertProvider } from './src/contexts/AlertContext';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import ConnectionStatusBar from './src/components/common/ConnectionStatusBar';
import AnimatedSplash from './src/components/common/AnimatedSplash';
import RootNavigator from './src/navigation/RootNavigator';
import { DEEP_LINK_SCHEME, WEB_BASE_URL } from './src/constants/urls';
import { RootStackParamList } from './src/types';

// Keep native splash visible while we load fonts
SplashScreen.preventAutoHideAsync().catch(() => {});

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    `${DEEP_LINK_SCHEME}://`,
    WEB_BASE_URL,
  ],
  config: {
    screens: {
      EventDetails: 'events/:eventId',
      OrganizerProfile: 'organizers/:organizerId',
      SpeakerDetails: 'speakers/:speakerId',
      PaymentSuccess: 'payment-success/:paymentId',
      PaymentFailed: 'payment-failed/:paymentId',
      Main: {
        screens: {
          Discover: 'discover',
          Saved: 'saved',
          Tickets: 'tickets',
          Profile: 'profile',
        },
      },
    },
  },
};

function AppContent() {
  const { isDark } = useTheme();

  // Barre de navigation Android : fond semi-transparent adapté au thème
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const bg = isDark ? 'rgba(15,15,26,0.78)' : 'rgba(250,250,248,0.78)';
    NavigationBar.setPositionAsync('absolute');
    NavigationBar.setBackgroundColorAsync(bg);
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
  }, [isDark]);

  return (
    <ConnectionProvider>
      <NavigationContainer linking={linking}>
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <AlertProvider>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <ConnectionStatusBar />
                <RootNavigator />
              </AlertProvider>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </NavigationContainer>
    </ConnectionProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    FunnelDisplay_400Regular,
    FunnelDisplay_500Medium,
    FunnelDisplay_600SemiBold,
    FunnelDisplay_700Bold,
    FunnelDisplay_800ExtraBold,
  });

  const [showSplash, setShowSplash] = useState(true);

  // Once fonts are loaded, hide the native splash and show our animated one
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // While fonts load, the native splash screen stays visible (preventAutoHideAsync)
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppContent />
            {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
