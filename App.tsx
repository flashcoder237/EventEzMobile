import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, Text as RNText, TextInput as RNTextInput } from 'react-native';
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
import { NavigationContainer, LinkingOptions, NavigationState } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { loadNavigationState, saveNavigationState } from './src/lib/navigationPersistence';
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
import { AnnouncementsProvider } from './src/contexts/AnnouncementsContext';
import { FeatureTourProvider } from './src/components/tour';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import MaintenanceGate from './src/components/common/MaintenanceGate';
import ForceUpdateGate from './src/components/common/ForceUpdateGate';
import AnnouncementsModal from './src/components/common/AnnouncementsModal';
import AnimatedSplash from './src/components/common/AnimatedSplash';
import RootNavigator from './src/navigation/RootNavigator';
import VerificationGuardModal from './src/components/auth/VerificationGuardModal';
import LockGate from './src/components/auth/LockGate';
import { DEEP_LINK_SCHEME, WEB_BASE_URL } from './src/constants/urls';
import { RootStackParamList } from './src/types';

// Services
import { initAnalytics, trackScreenView } from './src/services/analyticsService';
import { initCrashReporting } from './src/services/crashReporting';
import './src/i18n';

// Init Sentry au plus tôt — avant tout require de modules métier — pour
// capturer les erreurs lors du chargement initial. No-op si EXPO_PUBLIC_SENTRY_DSN
// n'est pas défini ou si le module natif est absent (Expo Go).
initCrashReporting();

// Google Sign-In — configure once at module level before any component mounts.
// Lazy require + try-catch : le module natif n'existe pas dans Expo Go,
// l'instanciation du singleton crash à l'import si on utilise `import`.
// Avec require() dans un try-catch, l'app continue de fonctionner — seul
// le bouton Google sera désactivé. Le dev build inclut le module natif.
try {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin/lib/commonjs');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
    scopes: ['email', 'profile'],
  });
} catch (e) {
  if (__DEV__) {
    console.warn('[Google Sign-In] Native module unavailable (Expo Go?). Use a development build.');
  }
}

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
      // Ouverture login depuis le web (ex : après vérification email via browser).
      Login: 'login',
      // Deep link consommé après clic sur le lien email de vérification.
      // Cf. tasks.py:43 (envoi) et VerifyEmailTokenScreen (consommation).
      VerifyEmailToken: 'verify-email/:token',
      // Deep link consommé après clic sur le lien de réinitialisation mot de passe.
      ResetPassword: 'reset-password/:token',
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

  // Restauration de l'état de navigation après un cold start. Si l'OS a tué
  // l'app pendant que l'utilisateur était sur un écran profond (ex: Payment),
  // on le ramène exactement où il était. Voir `navigationPersistence.ts` pour
  // les garde-fous (TTL 30 min + blacklist auth/scan/terminaux paiement).
  const [isNavReady, setIsNavReady] = useState(false);
  const [initialNavState, setInitialNavState] = useState<NavigationState | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await loadNavigationState();
        if (!cancelled) setInitialNavState(state);
      } finally {
        if (!cancelled) setIsNavReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Re-register le push token sur retour au foreground si l'enregistrement
  // précédent date de plus de 7j. Évite qu'un token expiré silencieusement ne
  // fasse rater des notifs critiques (paiement, check-in). No-op si l'utilisateur
  // n'est pas authentifié — la fonction lit le token AsyncStorage local.
  useEffect(() => {
    let lastState: AppStateStatus = AppState.currentState;
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' && lastState !== 'active') {
        void import('./src/services/pushNotificationService').then(({ default: pushService }) => {
          pushService.refreshRegistrationIfStale();
        });
      }
      lastState = next;
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
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

  const onNavigationStateChange = useCallback((state: NavigationState | undefined) => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      trackScreenView(currentRouteName);
      routeNameRef.current = currentRouteName;
    }
    // Persiste l'état pour qu'un cold start après kill OS ramène l'utilisateur
    // exactement où il était. Best-effort, non-bloquant.
    void saveNavigationState(state);
  }, []);

  // Bloque le rendu de la stack tant qu'on n'a pas tenté de charger l'état
  // persisté — sinon NavigationContainer monte avec son état par défaut puis
  // saute à l'état restauré, ce qui crée un flash visible.
  if (!isNavReady) {
    return null;
  }

  return (
    <ConnectionProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        initialState={initialNavState}
        onReady={onNavigationReady}
        onStateChange={onNavigationStateChange}
      >
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <AlertProvider>
                <StatusProvider>
                  <AnnouncementsProvider>
                    <FeatureTourProvider>
                      <StatusBar style={isDark ? 'light' : 'dark'} />
                      {/* ORDRE des gates :
                          1. ForceUpdateGate — bloque l'app si version trop vieille
                             (passe au-dessus de Maintenance pour qu'on puisse forcer
                             une mise à jour même en cas d'incident, l'ancien client
                             ne saura pas parser le payload)
                          2. LockGate — biométrie
                          3. MaintenanceGate — incident bloquant global
                          4. RootNavigator — l'app proprement dite
                          AnnouncementsModal est rendu en sibling : il s'affiche
                          au-dessus de la stack quand il y a une annonce non-vue. */}
                      <ForceUpdateGate>
                        <LockGate>
                          <MaintenanceGate>
                            <RootNavigator />
                          </MaintenanceGate>
                        </LockGate>
                      </ForceUpdateGate>
                      <VerificationGuardModal />
                      <AnnouncementsModal />
                    </FeatureTourProvider>
                  </AnnouncementsProvider>
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
