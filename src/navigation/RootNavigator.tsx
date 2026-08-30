import React, { useState, useEffect, useCallback, useRef, Suspense, lazy, ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingOverlay';
import BrandedSplash from '../components/ui/BrandedSplash';
import { getLocales } from 'expo-localization';
import * as Linking from 'expo-linking';
import { ONBOARDING_COMPLETE_KEY } from '../screens/auth/OnboardingScreen';
import { LANGUAGE_STORAGE_KEY, changeLanguage } from '../i18n';
import { navigate } from './navigationRef';

// Helper : wrap un composant lazy dans un Suspense pour qu'il soit utilisable
// directement comme `component={...}` d'un Stack.Screen sans changer la signature.
// Le fallback est volontairement minimal (LoadingSpinner) — ces écrans rarement
// visités économisent ~3-5s de TTI au cold start en évitant de parser leur code.
function withSuspense<P extends object>(LazyComp: ComponentType<P>): ComponentType<P> {
  const Wrapped = (props: P) => (
    <Suspense fallback={<LoadingSpinner />}>
      <LazyComp {...props} />
    </Suspense>
  );
  Wrapped.displayName = `Suspended(${(LazyComp as any).displayName || 'LazyScreen'})`;
  return Wrapped;
}

// Navigators
import MainTabNavigator from './MainTabNavigator';

// Auth Screens (accessible from anywhere)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Event Screens
import EventDetailsScreen from '../screens/events/EventDetailsScreen';

// Payment Screens

// Ticket Screens

// Dashboard & Profile Screens

// Messages Screens

// Scan Screen

// Organizer Screens — frequently used (kept static)

// Organizer Screens — rare / power-user features (lazy-loaded for TTI gain)
// Écrans LOURDS hors chemin de démarrage : le cold start ouvre Discover
// (MainTabNavigator), jamais ceux-ci. Les charger en dur faisait parser
// ~9 400 lignes avant le premier rendu — d'où l'alerte « vitesse » de
// Play Console. Chargés à la première navigation.
const ConversationScreen = withSuspense(lazy(() => import('../screens/messages/ConversationScreen')));
const MessagesScreen = withSuspense(lazy(() => import('../screens/messages/MessagesScreen')));
const MessageRequestsScreen = withSuspense(lazy(() => import('../screens/messages/MessageRequestsScreen')));
const ConnectionsScreen = withSuspense(lazy(() => import('../screens/messages/ConnectionsScreen')));
const ConnectionScannerScreen = withSuspense(lazy(() => import('../screens/messages/ConnectionScannerScreen')));
const WalletScreen = withSuspense(lazy(() => import('../screens/organizer/WalletScreen')));
const MyEventsScreen = withSuspense(lazy(() => import('../screens/organizer/MyEventsScreen')));
const QRScannerScreen = withSuspense(lazy(() => import('../screens/organizer/QRScannerScreen')));
const LiveOpsScreen = withSuspense(lazy(() => import('../screens/organizer/LiveOpsScreen')));
const EventCreateScreen = withSuspense(lazy(() => import('../screens/organizer/EventCreateScreen')));
const DraftsListScreen = withSuspense(lazy(() => import('../screens/organizer/DraftsListScreen')));
const EventPricingTiersScreen = withSuspense(lazy(() => import('../screens/organizer/EventPricingTiersScreen')));
const EventRegistrationsScreen = withSuspense(lazy(() => import('../screens/organizer/EventRegistrationsScreen')));
const ScanScreen = withSuspense(lazy(() => import('../screens/scan/ScanScreen')));
const SettingsScreen = withSuspense(lazy(() => import('../screens/profile/SettingsScreen')));
const BecomeOrganizerScreen = withSuspense(lazy(() => import('../screens/profile/BecomeOrganizerScreen')));
const VerificationScreen = withSuspense(lazy(() => import('../screens/profile/VerificationScreen')));
const BlockedUsersScreen = withSuspense(lazy(() => import('../screens/profile/BlockedUsersScreen')));
const EditProfileScreen = withSuspense(lazy(() => import('../screens/profile/EditProfileScreen')));
const FollowingUsersScreen = withSuspense(lazy(() => import('../screens/profile/FollowingUsersScreen')));
const MemoriesScreen = withSuspense(lazy(() => import('../screens/profile/MemoriesScreen')));
const TermsScreen = withSuspense(lazy(() => import('../screens/profile/TermsScreen')));
const PrivacyScreen = withSuspense(lazy(() => import('../screens/profile/PrivacyScreen')));
const NotificationsScreen = withSuspense(lazy(() => import('../screens/dashboard/NotificationsScreen')));
const EventAttendeesScreen = withSuspense(lazy(() => import('../screens/events/EventAttendeesScreen')));
const PendingTransfersScreen = withSuspense(lazy(() => import('../screens/tickets/PendingTransfersScreen')));
const OfflineTicketsScreen = withSuspense(lazy(() => import('../screens/tickets/OfflineTicketsScreen')));
const TransferAcceptScreen = withSuspense(lazy(() => import('../screens/tickets/TransferAcceptScreen')));
const DashboardScreen = withSuspense(lazy(() => import('../screens/dashboard/DashboardScreen')));
const MyPaymentsScreen = withSuspense(lazy(() => import('../screens/payment/MyPaymentsScreen')));
const RefundRequestScreen = withSuspense(lazy(() => import('../screens/payment/RefundRequestScreen')));
const RefundsListScreen = withSuspense(lazy(() => import('../screens/payment/RefundsListScreen')));
const InvitationsScreen = withSuspense(lazy(() => import('../screens/dashboard/InvitationsScreen')));
const ReferralScreen = withSuspense(lazy(() => import('../screens/dashboard/ReferralScreen')));
const HelpScreen = withSuspense(lazy(() => import('../screens/profile/HelpScreen')));
const IncidentDetailsScreen = withSuspense(lazy(() => import('../screens/status/IncidentDetailsScreen')));
const WebViewScreen = withSuspense(lazy(() => import('../screens/common/WebViewScreen')));
const MapScreen = withSuspense(lazy(() => import('../screens/events/MapScreen')));
const EventReviewsScreen = withSuspense(lazy(() => import('../screens/events/EventReviewsScreen')));
const EventSearchScreen = withSuspense(lazy(() => import('../screens/events/EventSearchScreen')));
const CitiesIndexScreen = withSuspense(lazy(() => import('../screens/events/CitiesIndexScreen')));
const SessionDetailsScreen = withSuspense(lazy(() => import('../screens/events/SessionDetailsScreen')));
const SpeakerDetailsScreen = withSuspense(lazy(() => import('../screens/events/SpeakerDetailsScreen')));
const OrganizerProfileScreen = withSuspense(lazy(() => import('../screens/events/OrganizerProfileScreen')));
const PaymentScreen = withSuspense(lazy(() => import('../screens/payment/PaymentScreen')));
const PaymentSuccessScreen = withSuspense(lazy(() => import('../screens/payment/PaymentSuccessScreen')));
const PaymentFailedScreen = withSuspense(lazy(() => import('../screens/payment/PaymentFailedScreen')));
const QRCodeScreen = withSuspense(lazy(() => import('../screens/tickets/QRCodeScreen')));
const AttendeeInfoScreen = withSuspense(lazy(() => import('../screens/tickets/AttendeeInfoScreen')));
const TicketPurchaseScreen = withSuspense(lazy(() => import('../screens/tickets/TicketPurchaseScreen')));
const RegistrationDetailsScreen = withSuspense(lazy(() => import('../screens/tickets/RegistrationDetailsScreen')));
const RegisterOrganizerScreen = withSuspense(lazy(() => import('../screens/auth/RegisterOrganizerScreen')));
const ResetPasswordScreen = withSuspense(lazy(() => import('../screens/auth/ResetPasswordScreen')));
const VerifyEmailTokenScreen = withSuspense(lazy(() => import('../screens/auth/VerifyEmailTokenScreen')));
const CompleteProfileScreen = withSuspense(lazy(() => import('../screens/auth/CompleteProfileScreen')));

const EventAnalyticsScreen = withSuspense(lazy(() => import('../screens/organizer/EventAnalyticsScreen')));
const DiscountManagementScreen = withSuspense(lazy(() => import('../screens/organizer/DiscountManagementScreen')));
const DiscountFormScreen = withSuspense(lazy(() => import('../screens/organizer/DiscountFormScreen')));
const EventSessionsLinkScreen = withSuspense(lazy(() => import('../screens/organizer/EventSessionsLinkScreen')));
const SponsorManagementScreen = withSuspense(lazy(() => import('../screens/organizer/SponsorManagementScreen')));
const WebhooksScreen = withSuspense(lazy(() => import('../screens/organizer/WebhooksScreen')));
const NewslettersScreen = withSuspense(lazy(() => import('../screens/organizer/NewslettersScreen')));
const DashboardsScreen = withSuspense(lazy(() => import('../screens/organizer/DashboardsScreen')));
const DashboardDetailsScreen = withSuspense(lazy(() => import('../screens/organizer/DashboardDetailsScreen')));
const SeatingPlansScreen = withSuspense(lazy(() => import('../screens/organizer/SeatingPlansScreen')));
const SeatingPlanEditorScreen = withSuspense(lazy(() => import('../screens/organizer/SeatingPlanEditorScreen')));
const BoothManagementScreen = withSuspense(lazy(() => import('../screens/organizer/BoothManagementScreen')));
const BoothPlanEditorScreen = withSuspense(lazy(() => import('../screens/organizer/BoothPlanEditorScreen')));
const MyBoothScreen = withSuspense(lazy(() => import('../screens/exhibitor/MyBoothScreen')));
const ExhibitApplyScreen = withSuspense(lazy(() => import('../screens/exhibitor/ExhibitApplyScreen')));

// Moderation Screens (lazy — staff only)
const ModerationScreen = withSuspense(lazy(() => import('../screens/moderation/ModerationScreen')));

// Payment Management Screens

// New Feature Screens — frequent (kept static)
import GamificationScreen from '../screens/profile/GamificationScreen';

// New Feature Screens — rare (lazy)
const LiveEventScreen = withSuspense(lazy(() => import('../screens/events/LiveEventScreen')));
const VolunteerScreen = withSuspense(lazy(() => import('../screens/organizer/VolunteerScreen')));
const TeamManagementScreen = withSuspense(lazy(() => import('../screens/organizer/TeamManagementScreen')));
const TeamInvitationAcceptScreen = withSuspense(lazy(() => import('../screens/events/TeamInvitationAcceptScreen')));
const WeddingRsvpScreen = withSuspense(lazy(() => import('../screens/events/WeddingRsvpScreen')));
const WeddingGiftRegistryScreen = withSuspense(lazy(() => import('../screens/events/WeddingGiftRegistryScreen')));
const MyTeamEventsScreen = withSuspense(lazy(() => import('../screens/dashboard/MyTeamEventsScreen')));
const SubscriptionScreen = withSuspense(lazy(() => import('../screens/dashboard/SubscriptionScreen')));

// Help Screen

// Analytics Screens (lazy — power users)
const AnalyticsDashboardScreen = withSuspense(lazy(() => import('../screens/organizer/AnalyticsDashboardScreen')));
const ReportsScreen = withSuspense(lazy(() => import('../screens/organizer/ReportsScreen')));

// Admin Screens (lazy — admins only, ~99% of users never load these)
const AdminDashboardScreen = withSuspense(lazy(() => import('../screens/admin/AdminDashboardScreen')));
const UserManagementScreen = withSuspense(lazy(() => import('../screens/admin/UserManagementScreen')));
const UserEditScreen = withSuspense(lazy(() => import('../screens/admin/UserEditScreen')));
const SubscriptionManagementScreen = withSuspense(lazy(() => import('../screens/admin/SubscriptionManagementScreen')));
const AuditLogsScreen = withSuspense(lazy(() => import('../screens/admin/AuditLogsScreen')));
const AuditLogDetailScreen = withSuspense(lazy(() => import('../screens/admin/AuditLogDetailScreen')));
const VerificationRequestsAdminScreen = withSuspense(lazy(() => import('../screens/admin/VerificationRequestsAdminScreen')));
const PlatformSettingsScreen = withSuspense(lazy(() => import('../screens/admin/PlatformSettingsScreen')));
const AnnouncementsAdminScreen = withSuspense(lazy(() => import('../screens/admin/AnnouncementsAdminScreen')));
const AnnouncementFormScreen = withSuspense(lazy(() => import('../screens/admin/AnnouncementFormScreen')));
const ClientReleaseAdminScreen = withSuspense(lazy(() => import('../screens/admin/ClientReleaseAdminScreen')));
const AdminAdsScreen = withSuspense(lazy(() => import('../screens/admin/AdminAdsScreen')));
const AdminAdFormScreen = withSuspense(lazy(() => import('../screens/admin/AdminAdFormScreen')));

// Treasury Screens (lazy — staff/admin only, very niche)
const TreasuryOverviewScreen = withSuspense(lazy(() => import('../screens/admin/treasury/TreasuryOverviewScreen')));
const TreasuryStaffScreen = withSuspense(lazy(() => import('../screens/admin/treasury/TreasuryStaffScreen')));
const TreasuryExpensesScreen = withSuspense(lazy(() => import('../screens/admin/treasury/TreasuryExpensesScreen')));
const TreasuryShareholdersScreen = withSuspense(lazy(() => import('../screens/admin/treasury/TreasuryShareholdersScreen')));
const TreasuryReportsScreen = withSuspense(lazy(() => import('../screens/admin/treasury/TreasuryReportsScreen')));

// System Status Screens
import MaintenanceScreen from '../screens/status/MaintenanceScreen';
import StatusScreen from '../screens/status/StatusScreen';

// Common Screens

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isInitializing, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [languagePicked, setLanguagePicked] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const pendingLoginRef = useRef(false);

  // Résolution de la langue au premier launch. Plutôt que d'imposer un écran
  // de choix (gate plein écran), on auto-détecte la langue depuis la locale du
  // device. L'utilisateur peut toujours la changer dans Paramètres.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'fr' || stored === 'en') {
          if (!cancelled) setLanguagePicked(true);
          return;
        }
        // Pas de préférence → on dérive de la locale device et on persiste
        // silencieusement. Défaut FRANÇAIS (aligné backend DEFAULT_LANG='fr') :
        // seul un device explicitement en anglais bascule en EN. Doit rester
        // cohérent avec src/i18n/index.ts.
        const deviceLang = getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLang);
        await changeLanguage(deviceLang);
        if (!cancelled) setLanguagePicked(true);
      } catch (error) {
        if (__DEV__) console.error('[RootNavigator] Error resolving language pref:', error);
        // En cas d'erreur, on ne bloque pas : i18n a déjà un fallback EN au boot.
        if (!cancelled) setLanguagePicked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Un deeplink d'ouverture est une intention EXPLICITE : il doit primer
        // sur l'écran d'onboarding. Sinon `showOnboarding` remplaçait tout le
        // Stack au boot → la cible du lien n'était jamais montée et le lien
        // était "avalé" (cause principale des deeplinks qui n'ouvraient rien,
        // iOS ET Android, même pour un utilisateur qui n'a jamais vu l'app).
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && !cancelled) {
          setShowOnboarding(false);
          return;
        }
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!cancelled) setShowOnboarding(completed !== 'true');
      } catch (error) {
        if (__DEV__) console.error('[RootNavigator] Error checking onboarding status:', error);
        if (!cancelled) setShowOnboarding(false);
      } finally {
        if (!cancelled) setCheckingOnboarding(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleOnboardingComplete = useCallback((goToLogin?: boolean) => {
    pendingLoginRef.current = !!goToLogin;
    setShowOnboarding(false);
  }, []);

  // After onboarding unmounts and Stack mounts, dispatch pending login navigation
  useEffect(() => {
    if (showOnboarding === false && pendingLoginRef.current) {
      pendingLoginRef.current = false;
      const t = setTimeout(() => navigate('Login' as any), 0);
      return () => clearTimeout(t);
    }
  }, [showOnboarding]);

  // languagePicked passe de null → true une fois la langue résolue (auto-
  // détectée depuis la locale device). On attend cette résolution avant de
  // monter la stack pour que l'onboarding s'affiche dans la bonne langue.
  if (isInitializing || checkingOnboarding || languagePicked === null) {
    return <BrandedSplash />;
  }

  // First-launch welcome — shown to ALL users (guest & authenticated) until completed
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 320,
        freezeOnBlur: true,
      }}
    >
      {/* Main tabs — always accessible (guest & authenticated) */}
      <Stack.Screen name="Main" component={MainTabNavigator} />

      {/* Auth Screens — réservés aux visiteurs non connectés. Un utilisateur
          authentifié n'a aucune raison d'atteindre connexion / inscription /
          réinitialisation de mot de passe : on retire ces écrans du navigateur
          tant qu'il est connecté. Les deep links vers ces routes deviennent
          alors inopérants quand le user est connecté — comportement voulu. */}
      {!isAuthenticated && (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen name="RegisterOrganizer" component={RegisterOrganizerScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}

      {/* Vérification d'email — accessible même connecté : un compte peut être
          authentifié mais non vérifié. */}
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
      />
      {/* Complétion de profil après 1re inscription social — accessible une fois
          connecté (comme VerifyEmail). */}
      <Stack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
      />
      {/* Collecte per-participant après paiement. Cible du deep link
          eventez://registrations/{id}/attendees (fallback Mobile Money : l'app
          peut ne jamais s'être rouverte après le paiement USSD). */}
      <Stack.Screen
        name="AttendeeInfo"
        component={AttendeeInfoScreen}
      />
      {/* VerifyEmailToken : ouverte par le deep link
          https://eventez.online/verify-email/{token} (Universal Link).
          Browsable sans auth car le user est souvent juste après inscription
          et n'est pas encore connecté. */}
      <Stack.Screen
        name="VerifyEmailToken"
        component={VerifyEmailTokenScreen}
      />

      {/* Event Screens (public — browsable without auth) */}
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerShown: true,
          headerTitle: 'Carte',
          headerBackTitle: 'Retour',
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} />
      <Stack.Screen name="SpeakerDetails" component={SpeakerDetailsScreen} />
      <Stack.Screen name="OrganizerProfile" component={OrganizerProfileScreen} />
      <Stack.Screen name="EventReviews" component={EventReviewsScreen} />
      <Stack.Screen
        name="EventSearch"
        component={EventSearchScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="CitiesIndex"
        component={CitiesIndexScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Payment Screens */}
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ gestureEnabled: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="PaymentFailed" component={PaymentFailedScreen} />

      {/* Ticket Screens */}
      <Stack.Screen name="TicketPurchase" component={TicketPurchaseScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="RegistrationDetails" component={RegistrationDetailsScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="PendingTransfers" component={PendingTransfersScreen} />
      <Stack.Screen name="OfflineTickets" component={OfflineTicketsScreen} />
      {/* TransferAccept : ouvert par deep link https://eventez.online/transfer/{token}/accept */}
      <Stack.Screen name="TransferAccept" component={TransferAcceptScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />

      {/* Dashboard & Profile Screens */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="UserDashboard" component={DashboardScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="BecomeOrganizer" component={BecomeOrganizerScreen} />
      <Stack.Screen
        name="Verification"
        component={VerificationScreen}
      />
      <Stack.Screen name="FollowingUsers" component={FollowingUsersScreen} />

      {/* Messages Screens */}
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="MessageRequests" component={MessageRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Connections" component={ConnectionsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ConnectionScanner" component={ConnectionScannerScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ headerShown: false }}
        // getId : chaque conversationId est une instance distincte. Sans ça,
        // naviguer depuis une notification vers une AUTRE conversation alors
        // qu'une est déjà ouverte ne créait pas une nouvelle instance — React
        // Navigation se contentait de merger les params, mais useMessageState
        // gardait son state initialisé sur l'ancien conversationId → écran vide.
        // Le fallback "new" couvre le cas {userId, userName} (DM jamais créée).
        getId={({ params }: { params?: { conversationId?: string; userId?: string } }) =>
          params?.conversationId || (params?.userId ? `new:${params.userId}` : 'new')
        }
      />

      {/* Organizer Screens */}
      <Stack.Screen name="EventCreate" component={EventCreateScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EventEdit" component={EventCreateScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      <Stack.Screen name="Drafts" component={DraftsListScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="LiveOps" component={LiveOpsScreen} />
      <Stack.Screen name="Memories" component={MemoriesScreen} />
      <Stack.Screen name="EventAttendees" component={EventAttendeesScreen} />
      <Stack.Screen name="EventPricingTiers" component={EventPricingTiersScreen} />
      <Stack.Screen name="EventAnalytics" component={EventAnalyticsScreen} />
      <Stack.Screen name="EventRegistrations" component={EventRegistrationsScreen} />
      <Stack.Screen name="DiscountManagement" component={DiscountManagementScreen} />
      <Stack.Screen name="DiscountForm" component={DiscountFormScreen} />
      <Stack.Screen name="EventSessionsLink" component={EventSessionsLinkScreen} />
      <Stack.Screen name="SponsorManagement" component={SponsorManagementScreen} />
      <Stack.Screen name="Webhooks" component={WebhooksScreen} />
      <Stack.Screen name="Newsletters" component={NewslettersScreen} />
      <Stack.Screen name="Dashboards" component={DashboardsScreen} />
      <Stack.Screen name="DashboardDetails" component={DashboardDetailsScreen} />
      <Stack.Screen name="SeatingPlans" component={SeatingPlansScreen} />
      <Stack.Screen name="BoothManagement" component={BoothManagementScreen} />
      <Stack.Screen name="BoothPlanEditor" component={BoothPlanEditorScreen} />
      <Stack.Screen name="MyBooth" component={MyBoothScreen} />
      <Stack.Screen name="ExhibitApply" component={ExhibitApplyScreen} />
      <Stack.Screen name="SeatingPlanEditor" component={SeatingPlanEditorScreen} />

      {/* Moderation Screens */}
      <Stack.Screen name="Moderation" component={ModerationScreen} />

      {/* Payment Management Screens */}
      <Stack.Screen name="MyPayments" component={MyPaymentsScreen} />
      <Stack.Screen name="RefundRequest" component={RefundRequestScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="RefundsList" component={RefundsListScreen} />

      {/* New Feature Screens */}
      <Stack.Screen name="Gamification" component={GamificationScreen} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} />
      <Stack.Screen name="LiveEvent" component={LiveEventScreen} />
      <Stack.Screen name="Referrals" component={ReferralScreen} />
      <Stack.Screen name="Volunteers" component={VolunteerScreen} />
      {/* Equipe d'event : gestion organisateur + ecran d'acceptation invitation */}
      <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
      <Stack.Screen name="TeamInvitation" component={TeamInvitationAcceptScreen} />
      <Stack.Screen name="WeddingRsvp" component={WeddingRsvpScreen} />
      <Stack.Screen name="WeddingGiftRegistry" component={WeddingGiftRegistryScreen} />
      <Stack.Screen name="MyTeamEvents" component={MyTeamEventsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />

      {/* Help Screen */}
      <Stack.Screen name="Help" component={HelpScreen} />

      {/* Analytics Screens */}
      <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />

      {/* Admin Screens */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="UserEdit" component={UserEditScreen} />
      <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
      <Stack.Screen name="AuditLogs" component={AuditLogsScreen} />
      <Stack.Screen name="AuditLogDetail" component={AuditLogDetailScreen} />
      <Stack.Screen name="VerificationRequestsAdmin" component={VerificationRequestsAdminScreen} />
      <Stack.Screen name="PlatformSettings" component={PlatformSettingsScreen} />
      <Stack.Screen name="AnnouncementsAdmin" component={AnnouncementsAdminScreen} />
      <Stack.Screen name="AnnouncementForm" component={AnnouncementFormScreen} />
      <Stack.Screen name="ClientReleaseAdmin" component={ClientReleaseAdminScreen} />
      <Stack.Screen name="AdminAds" component={AdminAdsScreen} />
      <Stack.Screen name="AdminAdForm" component={AdminAdFormScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />

      {/* Treasury Screens */}
      <Stack.Screen name="TreasuryOverview" component={TreasuryOverviewScreen} />
      <Stack.Screen name="TreasuryStaff" component={TreasuryStaffScreen} />
      <Stack.Screen name="TreasuryExpenses" component={TreasuryExpensesScreen} />
      <Stack.Screen name="TreasuryShareholders" component={TreasuryShareholdersScreen} />
      <Stack.Screen name="TreasuryReports" component={TreasuryReportsScreen} />

      {/* System Status */}
      <Stack.Screen name="SystemStatus" component={StatusScreen} />
      <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ presentation: 'fullScreenModal' }} />

      {/* In-app browser */}
      <Stack.Screen name="Browser" component={WebViewScreen} />
    </Stack.Navigator>
  );
}
