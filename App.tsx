import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Clamp le font scaling global : l'accessibilite reste active (zoom jusqu'a 1.3x)
// mais pas assez pour casser les layouts sur les appareils avec reglages extremes.
// Affecte TOUS les <Text> et <TextInput> de l'app (sauf override explicite par prop).
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
// @ts-expect-error defaultProps est supporte mais absent des types RN
RNText.defaultProps = RNText.defaultProps || {};
// @ts-expect-error
RNText.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;
// @ts-expect-error
RNTextInput.defaultProps = RNTextInput.defaultProps || {};
// @ts-expect-error
RNTextInput.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;

// Police par defaut = Montserrat Regular pour tout <Text> / <TextInput> qui ne specifie pas fontFamily.
// On patch Text.render pour injecter le style AVANT le style user (donc user override possible).
// Le style injecte ne s'applique que si le style user n'a pas de fontFamily.
const DEFAULT_FONT_FAMILY = 'Montserrat_400Regular';
const patchDefaultFont = (Component: any) => {
  const orig = Component.render;
  if (!orig || Component.__fontPatched) return;
  Component.__fontPatched = true;
  Component.render = function (...args: any[]) {
    const element = orig.apply(this, args);
    if (!element || !element.props) return element;
    return React.cloneElement(element, {
      style: [{ fontFamily: DEFAULT_FONT_FAMILY }, element.props.style],
    });
  };
};
patchDefaultFont(RNText);
patchDefaultFont(RNTextInput);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
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
import { StatusProvider } from './src/contexts/StatusContext';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import MaintenanceGate from './src/components/common/MaintenanceGate';
import AnimatedSplash from './src/components/common/AnimatedSplash';
import RootNavigator from './src/navigation/RootNavigator';
import VerificationGuardModal from './src/components/auth/VerificationGuardModal';
import { DEEP_LINK_SCHEME, WEB_BASE_URL } from './src/constants/urls';
import { RootStackParamList } from './src/types';

// Services
import { initAnalytics, trackScreenView } from './src/services/analyticsService';
import './src/i18n';

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
  const routeNameRef = useRef<string | undefined>(undefined);

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Pre-charge les sons au boot pour eliminer la latence du premier play
  useEffect(() => {
    void import('./src/services/soundService').then(({ default: soundService }) => {
      soundService.initialize();
    });
  }, []);

  // Barre de navigation Android : fond semi-transparent adapté au thème
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const bg = isDark ? 'rgba(15,15,26,0.78)' : 'rgba(250,250,248,0.78)';
    NavigationBar.setPositionAsync('absolute');
    NavigationBar.setBackgroundColorAsync(bg);
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
  }, [isDark]);

  const onNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  }, []);

  const onNavigationStateChange = useCallback(() => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      trackScreenView(currentRouteName);
      routeNameRef.current = currentRouteName;
    }
  }, []);

  return (
    <ConnectionProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={onNavigationReady}
        onStateChange={onNavigationStateChange}
      >
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <AlertProvider>
                <StatusProvider>
                  <StatusBar style={isDark ? 'light' : 'dark'} />
                  <MaintenanceGate>
                    <RootNavigator />
                  </MaintenanceGate>
                  <VerificationGuardModal />
                </StatusProvider>
              </AlertProvider>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </NavigationContainer>
    </ConnectionProvider>
  );
}

function App() {
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

export default App;
