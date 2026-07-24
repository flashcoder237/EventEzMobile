import React, { useState, useEffect, useCallback, useRef, Suspense, lazy, ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingOverlay';
import BrandedSplash from '../components/ui/BrandedSplash';
import { getLocales } from 'expo-localization';
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
import RegisterOrganizerScreen from '../screens/auth/RegisterOrganizerScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import VerifyEmailTokenScreen from '../screens/auth/VerifyEmailTokenScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Event Screens
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import EventReviewsScreen from '../screens/events/EventReviewsScreen';
import EventSearchScreen from '../screens/events/EventSearchScreen';
import CitiesIndexScreen from '../screens/events/CitiesIndexScreen';
import MapScreen from '../screens/events/MapScreen';
import SessionDetailsScreen from '../screens/events/SessionDetailsScreen';
import SpeakerDetailsScreen from '../screens/events/SpeakerDetailsScreen';
import OrganizerProfileScreen from '../screens/events/OrganizerProfileScreen';

// Payment Screens
import PaymentScreen from '../screens/payment/PaymentScreen';
import PaymentSuccessScreen from '../screens/payment/PaymentSuccessScreen';
import PaymentFailedScreen from '../screens/payment/PaymentFailedScreen';

// Ticket Screens
import QRCodeScreen from '../screens/tickets/QRCodeScreen';
import TicketPurchaseScreen from '../screens/tickets/TicketPurchaseScreen';
import RegistrationDetailsScreen from '../screens/tickets/RegistrationDetailsScreen';
import PendingTransfersScreen from '../screens/tickets/PendingTransfersScreen';
import OfflineTicketsScreen from '../screens/tickets/OfflineTicketsScreen';
import TransferAcceptScreen from '../screens/tickets/TransferAcceptScreen';

// Dashboard & Profile Screens
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import BlockedUsersScreen from '../screens/profile/BlockedUsersScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import TermsScreen from '../screens/profile/TermsScreen';
import PrivacyScreen from '../screens/profile/PrivacyScreen';
import BecomeOrganizerScreen from '../screens/profile/BecomeOrganizerScreen';
import VerificationScreen from '../screens/profile/VerificationScreen';
import FollowingUsersScreen from '../screens/profile/FollowingUsersScreen';

// Messages Screens
import MessagesScreen from '../screens/messages/MessagesScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';
import MessageRequestsScreen from '../screens/messages/MessageRequestsScreen';
import ConnectionsScreen from '../screens/messages/ConnectionsScreen';
import ConnectionScannerScreen from '../screens/messages/ConnectionScannerScreen';

// Scan Screen
import ScanScreen from '../screens/scan/ScanScreen';

// Organizer Screens — frequently used (kept static)
import EventCreateScreen from '../screens/organizer/EventCreateScreen';
import DraftsListScreen from '../screens/organizer/DraftsListScreen';
import WalletScreen from '../screens/organizer/WalletScreen';
import MyEventsScreen from '../screens/organizer/MyEventsScreen';
import QRScannerScreen from '../screens/organizer/QRScannerScreen';
import LiveOpsScreen from '../screens/organizer/LiveOpsScreen';
import MemoriesScreen from '../screens/profile/MemoriesScreen';
import EventAttendeesScreen from '../screens/events/EventAttendeesScreen';
import EventPricingTiersScreen from '../screens/organizer/EventPricingTiersScreen';
import EventRegistrationsScreen from '../screens/organizer/EventRegistrationsScreen';

// Organizer Screens — rare / power-user features (lazy-loaded for TTI gain)
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

// Moderation Screens (lazy — staff only)
const ModerationScreen = withSuspense(lazy(() => import('../screens/moderation/ModerationScreen')));

// Payment Management Screens
import MyPaymentsScreen from '../screens/payment/MyPaymentsScreen';
import RefundRequestScreen from '../screens/payment/RefundRequestScreen';
import RefundsListScreen from '../screens/payment/RefundsListScreen';

// New Feature Screens — frequent (kept static)
import GamificationScreen from '../screens/profile/GamificationScreen';
import InvitationsScreen from '../screens/dashboard/InvitationsScreen';
import ReferralScreen from '../screens/dashboard/ReferralScreen';

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
import HelpScreen from '../screens/profile/HelpScreen';

// Analytics Screens (lazy — power users)
const AnalyticsDashboardScreen = withSuspense(lazy(() => import('../screens/organizer/AnalyticsDashboardScreen')));
const ReportsScreen = withSuspense(lazy(() => import('../screens/organizer/ReportsScreen')));

// Admin Screens (lazy — admins only, ~99% of users never load these)
const AdminDashboardScreen = withSuspense(lazy(() => import('../screens/admin/AdminDashboardScreen')));
const UserManagementScreen = withSuspense(lazy(() => import('../screens/admin/UserManagementScreen')));
const UserEditScreen = withSuspense(lazy(() => import('../screens/admin/UserEditScreen')));
const SubscriptionManagementScreen = withSuspense(lazy(() => import('../screens/admin/SubscriptionManagementScreen')));
const AuditLogsScreen = withSuspense(lazy(() => import('../screens/admin/AuditLogsScreen')));
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
import IncidentDetailsScreen from '../screens/status/IncidentDetailsScreen';

// Common Screens
import WebViewScreen from '../screens/common/WebViewScreen';

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
        // Pas de préférence → on dérive de la locale device (fr si device en
        // français, en sinon) et on persiste silencieusement.
        const deviceLang = getLocales()[0]?.languageCode === 'fr' ? 'fr' : 'en';
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
