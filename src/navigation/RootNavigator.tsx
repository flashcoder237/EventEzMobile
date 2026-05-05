import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingOverlay';
import { ONBOARDING_COMPLETE_KEY } from '../screens/auth/OnboardingScreen';
import { navigate } from './navigationRef';

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

// Scan Screen
import ScanScreen from '../screens/scan/ScanScreen';

// Organizer Screens
import EventCreateScreen from '../screens/organizer/EventCreateScreen';
import DraftsListScreen from '../screens/organizer/DraftsListScreen';
import WalletScreen from '../screens/organizer/WalletScreen';
import MyEventsScreen from '../screens/organizer/MyEventsScreen';
import QRScannerScreen from '../screens/organizer/QRScannerScreen';
import EventAnalyticsScreen from '../screens/organizer/EventAnalyticsScreen';
import EventRegistrationsScreen from '../screens/organizer/EventRegistrationsScreen';
import DiscountManagementScreen from '../screens/organizer/DiscountManagementScreen';
import DiscountFormScreen from '../screens/organizer/DiscountFormScreen';
import EventSessionsLinkScreen from '../screens/organizer/EventSessionsLinkScreen';

// Moderation Screens
import ModerationScreen from '../screens/moderation/ModerationScreen';

// Payment Management Screens
import MyPaymentsScreen from '../screens/payment/MyPaymentsScreen';
import RefundRequestScreen from '../screens/payment/RefundRequestScreen';
import RefundsListScreen from '../screens/payment/RefundsListScreen';

// New Feature Screens
import GamificationScreen from '../screens/profile/GamificationScreen';
import InvitationsScreen from '../screens/dashboard/InvitationsScreen';
import LiveEventScreen from '../screens/events/LiveEventScreen';
import ReferralScreen from '../screens/dashboard/ReferralScreen';
import VolunteerScreen from '../screens/organizer/VolunteerScreen';
import SubscriptionScreen from '../screens/dashboard/SubscriptionScreen';

// Help Screen
import HelpScreen from '../screens/profile/HelpScreen';

// Analytics Screens
import AnalyticsDashboardScreen from '../screens/organizer/AnalyticsDashboardScreen';
import ReportsScreen from '../screens/organizer/ReportsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import UserEditScreen from '../screens/admin/UserEditScreen';
import SubscriptionManagementScreen from '../screens/admin/SubscriptionManagementScreen';
import AuditLogsScreen from '../screens/admin/AuditLogsScreen';
import PlatformSettingsScreen from '../screens/admin/PlatformSettingsScreen';

// Treasury Screens
import TreasuryOverviewScreen from '../screens/admin/treasury/TreasuryOverviewScreen';
import TreasuryStaffScreen from '../screens/admin/treasury/TreasuryStaffScreen';
import TreasuryExpensesScreen from '../screens/admin/treasury/TreasuryExpensesScreen';
import TreasuryShareholdersScreen from '../screens/admin/treasury/TreasuryShareholdersScreen';
import TreasuryReportsScreen from '../screens/admin/treasury/TreasuryReportsScreen';

// System Status Screens
import MaintenanceScreen from '../screens/status/MaintenanceScreen';
import StatusScreen from '../screens/status/StatusScreen';
import IncidentDetailsScreen from '../screens/status/IncidentDetailsScreen';

// Common Screens
import WebViewScreen from '../screens/common/WebViewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isInitializing } = useAuth();
  const { colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const pendingLoginRef = useRef(false);

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

  if (isInitializing || checkingOnboarding) {
    return <LoadingSpinner />;
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

      {/* Auth Screens — accessible as modal from anywhere */}
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
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
      />
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
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ headerShown: false }}
      />

      {/* Organizer Screens */}
      <Stack.Screen name="EventCreate" component={EventCreateScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EventEdit" component={EventCreateScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      <Stack.Screen name="Drafts" component={DraftsListScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="EventAnalytics" component={EventAnalyticsScreen} />
      <Stack.Screen name="EventRegistrations" component={EventRegistrationsScreen} />
      <Stack.Screen name="DiscountManagement" component={DiscountManagementScreen} />
      <Stack.Screen name="DiscountForm" component={DiscountFormScreen} />
      <Stack.Screen name="EventSessionsLink" component={EventSessionsLinkScreen} />

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
