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
import { NavigationContainer, LinkingOptions, NavigationState, getStateFromPath } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { loadNavigationState, saveNavigationState } from './src/lib/navigationPersistence';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  // Montserrat_300Light retiré : zero usage (FontFamily.light pointe vers regular)
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  FunnelDisplay_400Regular,
  // FunnelDisplay_500Medium retiré : zero usage (FontFamily.displayMedium pointe vers displayRegular)
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
import { CurrentRouteProvider } from './src/contexts/CurrentRouteContext';
import { AnnouncementsProvider } from './src/contexts/AnnouncementsContext';
import { InAppToastProvider } from './src/contexts/InAppToastContext';
import { FeatureTourProvider } from './src/components/tour';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import MaintenanceGate from './src/components/common/MaintenanceGate';
import IncidentBanner from './src/components/common/IncidentBanner';
import ForceUpdateGate from './src/components/common/ForceUpdateGate';
import AnnouncementsModal from './src/components/common/AnnouncementsModal';
import AnimatedSplash from './src/components/common/AnimatedSplash';
import RootNavigator from './src/navigation/RootNavigator';
import VerificationGuardModal from './src/components/auth/VerificationGuardModal';
import LockGate from './src/components/auth/LockGate';
import { DEEP_LINK_SCHEME, WEB_BASE_URL, stripLocalePrefix } from './src/constants/urls';
import { captureReferralFromPath } from './src/lib/referral';
import { RootStackParamList } from './src/types';

// Services
import { initAnalytics, trackScreenView } from './src/services/analyticsService';
import { initCrashReporting } from './src/services/crashReporting';
import QuickActionsBridge from './src/components/common/QuickActionsBridge';
import { i18nReady } from './src/i18n';

// Init Sentry au plus tôt — avant tout require de modules métier — pour
// capturer les erreurs lors du chargement initial. No-op si EXPO_PUBLIC_SENTRY_DSN
// n'est pas défini ou si le module natif est absent (Expo Go).
initCrashReporting();

// Hydrate le cache memoire des tokens d'acces aux events proteges par code.
// L'interceptor axios les lit synchroniquement pour injecter le header
// X-Event-Access-Token, donc on doit warm AVANT toute requete.
import('./src/lib/utils/eventAccessToken')
  .then(({ warmEventAccessTokenCache }) => warmEventAccessTokenCache())
  .catch(() => { /* silent */ });

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

// Réécrit les chemins web `/dashboard/*` (envoyés dans les emails backend)
// vers les routes mobiles équivalentes. Les liens email pointent vers l'espace
// web (/dashboard/tickets, /dashboard/registrations…) ; sur mobile ces sections
// vivent sous d'autres noms d'écran. Sans cette réécriture, un lien email
// ouvrait le navigateur au lieu de l'app même quand l'universal link est capté.
// Cf. backend apps/notifications/*, email_automation.py (FRONTEND_URL/dashboard/*).
const DASHBOARD_REWRITES: Array<[RegExp, string]> = [
  [/^\/dashboard\/tickets\/?$/, '/tickets'],
  // Les inscriptions sont regroupées avec les billets côté mobile (MyTickets).
  [/^\/dashboard\/registrations\/?$/, '/tickets'],
  [/^\/dashboard\/events\/?$/, '/my-events'],
  [/^\/dashboard\/payments\/?$/, '/my-payments'],
];

function rewriteDashboardPath(path: string): string {
  // On ne réécrit que le pathname ; on préserve la query string (ex: ?event=…).
  const [pathname, query] = path.split('?');
  for (const [pattern, replacement] of DASHBOARD_REWRITES) {
    if (pattern.test(pathname)) {
      return query ? `${replacement}?${query}` : replacement;
    }
  }
  return path;
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    `${DEEP_LINK_SCHEME}://`,
    WEB_BASE_URL,
  ],
  // Filet i18n : le web est en routing `as-needed` (FR sur `/`, EN sur `/en`).
  // Les AASA/intent-filters ne ciblent que le non préfixé, donc l'app ne devrait
  // jamais recevoir `/en/...` — mais si ça arrive (lien EN partagé, future
  // entrée AASA `/en/*`), on retire la locale avant de router pour retomber sur
  // les patterns de `config.screens`. Cf. stripLocalePrefix (constants/urls.ts).
  getStateFromPath: (path, options) => {
    // Capte le code de parrainage AVANT le routage. Un lien `?ref=CODE` qui
    // ouvre l'app court-circuitait tout le suivi : la capture n'existait que
    // côté web (ReferralCapture), donc un destinataire ayant l'app installée
    // n'était jamais attribué à son parrain.
    captureReferralFromPath(path);
    return getStateFromPath(
      rewriteDashboardPath(stripLocalePrefix(path)),
      options,
    );
  },
  config: {
    screens: {
      EventDetails: 'events/:eventId',
      // Deep link de partage "devenir benevole" pour un event. Ouvre
      // VolunteerScreen avec eventId pre-rempli.
      // Cf. eventez-frontend/src/app/events/[id]/volunteer/page.tsx (web).
      Volunteers: 'events/:eventId/volunteer',
      // Parite web /events/in : hub liste de toutes les villes.
      CitiesIndex: 'events/in',
      // Parite web /events/in/[slug] : ouvre EventSearch avec city pre-rempli.
      // Le param `city` est le slug brut ("douala", "paris") — backend filter
      // location_city__icontains match en case-insensitive, donc OK pour les
      // villes sans accents. Pour Yaoundé etc., l'autocomplete CitiesSection
      // navigue avec city.name exact (resolution cote serveur).
      EventSearch: 'events/in/:city',
      OrganizerProfile: 'organizers/:organizerId',
      SpeakerDetails: 'speakers/:speakerId',
      // ⚠️ payment-success / payment-failed sont des deep links CUSTOM SCHEME
      // uniquement (`eventez://payment-success/{id}`), consommés par
      // openAuthSessionAsync au retour du navigateur in-app (cf.
      // PaymentScreen.tsx). Ils n'ont PAS d'entrée AASA/intent-filter https :
      // les vraies pages web sont /payment/success|error/[id] et ne doivent pas
      // être interceptées comme universal links (ça casserait le retour de paiement).
      PaymentSuccess: 'payment-success/:paymentId',
      PaymentFailed: 'payment-failed/:paymentId',
      // Collecte per-participant après paiement. Parité web /register/{id}/attendees
      // (email post-paiement / fallback Mobile Money : l'app peut ne pas s'être
      // rouverte après le paiement USSD). La page invité /attendee/{token} reste
      // web-only (invité anonyme sans compte, pas besoin de l'app).
      AttendeeInfo: 'register/:registrationId/attendees',
      // Ouverture login depuis le web (ex : après vérification email via browser).
      Login: 'login',
      // Deep link consommé après clic sur le lien email de vérification.
      // Cf. tasks.py:43 (envoi) et VerifyEmailTokenScreen (consommation).
      VerifyEmailToken: 'verify-email/:token',
      // Deep link consommé après clic sur le lien de réinitialisation mot de passe.
      ResetPassword: 'reset-password/:token',
      // Deep link consommé après clic sur le lien de transfert de billet.
      // Correspond à https://eventez.online/transfer/{token}/accept|decline
      TransferAccept: 'transfer/:token/:action',
      // Deep link d'invitation d'equipe : recu par email/SMS avec un token
      // unique. Ouvre TeamInvitationAcceptScreen qui affiche les details et
      // permet d'accepter ou decliner.
      TeamInvitation: 'team-invitation/:token',
      // Mariage — RSVP par token (cf. web /invitations/accept/[token]).
      WeddingRsvp: 'invitations/accept/:token',
      // Mariage — liste de cadeaux (cf. web /events/[slug]/gift-registry).
      WeddingGiftRegistry: 'events/:slug/gift-registry',
      // Deep link de retour après souscription web (Play Billing compliance —
      // cf. SubscriptionScreen.tsx). Le web appelle eventez://subscription
      // ou https://eventez.online/dashboard/subscription a la fin du paiement,
      // ce qui ramene l'utilisateur ici. openAuthSessionAsync intercepte le
      // redirect et ferme automatiquement le navigateur in-app.
      Subscription: 'subscription',
      // Cibles des liens email /dashboard/* (réécrits par rewriteDashboardPath).
      // MyEvents/MyPayments sont des écrans du RootNavigator (organisateur).
      MyEvents: 'my-events',
      MyPayments: 'my-payments',
      Main: {
        screens: {
          Discover: 'discover',
          Saved: 'saved',
          MessagesTab: 'messages',
          // ⚠️ Le nom d'écran doit correspondre EXACTEMENT au Tab.Screen du
          // MainTabNavigator (name="MyTickets"). C'était 'Tickets' → ne routait
          // nulle part. Les liens email /dashboard/tickets sont réécrits vers
          // ce chemin par getStateFromPath (cf. stripLocalePrefix + alias).
          MyTickets: 'tickets',
          Profile: 'profile',
        },
      },
    },
  },
};

function AppContent() {
  const { isDark } = useTheme();
  const routeNameRef = useRef<string | undefined>(undefined);
  // State exposé via CurrentRouteContext — utilisé par IncidentBanner pour
  // savoir quels services sont pertinents pour l'écran courant. Mis à jour
  // dans onNavigationStateChange ci-dessous.
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);

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
    const initialRoute = navigationRef.current?.getCurrentRoute()?.name;
    routeNameRef.current = initialRoute;
    setCurrentRouteName(initialRoute);
  }, []);

  const onNavigationStateChange = useCallback((state: NavigationState | undefined) => {
    const newRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (newRouteName && newRouteName !== routeNameRef.current) {
      trackScreenView(newRouteName);
      routeNameRef.current = newRouteName;
      // Sync au CurrentRouteContext — IncidentBanner s'en sert pour le
      // filtrage par scope service.
      setCurrentRouteName(newRouteName);
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
    <CurrentRouteProvider routeName={currentRouteName}>
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
                    <InAppToastProvider>
                      <FeatureTourProvider>
                      <StatusBar style={isDark ? 'light' : 'dark'} />
                      {/* Raccourcis d'icône (long-press) — role-aware, sans rendu */}
                      <QuickActionsBridge />
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
                      {/* Banner global d'incident — overlay top quand un 503
                          est intercepté par axios. Permet à l'utilisateur de
                          voir l'incident + cliquer "Voir l'évolution".
                          Rendu APRÈS RootNavigator pour avoir accès à la
                          navigation et passer au-dessus visuellement. */}
                      <IncidentBanner />
                      </FeatureTourProvider>
                    </InAppToastProvider>
                  </AnnouncementsProvider>
                </StatusProvider>
              </AlertProvider>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </NavigationContainer>
    </ConnectionProvider>
    </CurrentRouteProvider>
  );
}

function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    FunnelDisplay_400Regular,
    FunnelDisplay_600SemiBold,
    FunnelDisplay_700Bold,
    FunnelDisplay_800ExtraBold,
  });

  const [showSplash, setShowSplash] = useState(true);
  // Bloque le rendu jusqu'a ce que l'override AsyncStorage de la langue ait
  // ete applique. Sans ca, l'app peut afficher la device locale au cold start
  // avant de basculer ~50ms plus tard sur la preference utilisateur — pire,
  // dans certains environnements l'override silently echoue et l'app reste
  // figee sur la device locale.
  const [i18nResolved, setI18nResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    i18nReady
      .then(() => { if (!cancelled) setI18nResolved(true); })
      .catch(() => { if (!cancelled) setI18nResolved(true); });
    return () => { cancelled = true; };
  }, []);

  // Once fonts AND i18n are loaded, hide the native splash and show our animated one
  useEffect(() => {
    if (fontsLoaded && i18nResolved) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, i18nResolved]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // While fonts/i18n load, the native splash screen stays visible (preventAutoHideAsync)
  if (!fontsLoaded || !i18nResolved) {
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
