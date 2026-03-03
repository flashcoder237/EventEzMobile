import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingOverlay';
import { ONBOARDING_COMPLETE_KEY } from '../screens/auth/OnboardingScreen';

// Navigators
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

// Event Screens
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
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
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import TermsScreen from '../screens/profile/TermsScreen';
import PrivacyScreen from '../screens/profile/PrivacyScreen';
import BecomeOrganizerScreen from '../screens/profile/BecomeOrganizerScreen';
import VerificationScreen from '../screens/profile/VerificationScreen';

// Messages Screens
import MessagesScreen from '../screens/messages/MessagesScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';

// Scan Screen
import ScanScreen from '../screens/scan/ScanScreen';

// Organizer Screens
import EventCreateScreen from '../screens/organizer/EventCreateScreen';
import WalletScreen from '../screens/organizer/WalletScreen';
import MyEventsScreen from '../screens/organizer/MyEventsScreen';
import QRScannerScreen from '../screens/organizer/QRScannerScreen';
import EventAnalyticsScreen from '../screens/organizer/EventAnalyticsScreen';
import EventRegistrationsScreen from '../screens/organizer/EventRegistrationsScreen';
import DiscountManagementScreen from '../screens/organizer/DiscountManagementScreen';
import DiscountFormScreen from '../screens/organizer/DiscountFormScreen';

// Moderation Screens
import ModerationScreen from '../screens/moderation/ModerationScreen';

// Payment Management Screens
import MyPaymentsScreen from '../screens/payment/MyPaymentsScreen';
import RefundRequestScreen from '../screens/payment/RefundRequestScreen';

// New Feature Screens
import GamificationScreen from '../screens/profile/GamificationScreen';
import InvitationsScreen from '../screens/dashboard/InvitationsScreen';
import LiveEventScreen from '../screens/events/LiveEventScreen';
import ReferralScreen from '../screens/dashboard/ReferralScreen';
import VolunteerScreen from '../screens/organizer/VolunteerScreen';
import SubscriptionScreen from '../screens/dashboard/SubscriptionScreen';

// Onboarding Screen
import OnboardingScreen from '../screens/auth/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [isAuthenticated]);

  const checkOnboardingStatus = async () => {
    if (!isAuthenticated) {
      setCheckingOnboarding(false);
      setShowOnboarding(false);
      return;
    }
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      setShowOnboarding(completed !== 'true');
    } catch (error) {
      console.error('[RootNavigator] Error checking onboarding status:', error);
      setShowOnboarding(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  if (isLoading || checkingOnboarding) {
    return (
<LoadingSpinner />
    );
  }

  // Show onboarding as a full-screen overlay for first-time users
  if (isAuthenticated && showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade_from_bottom',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />

          {/* Event Screens */}
          <Stack.Screen
            name="EventDetails"
            component={EventDetailsScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
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
          <Stack.Screen
            name="SessionDetails"
            component={SessionDetailsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SpeakerDetails"
            component={SpeakerDetailsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrganizerProfile"
            component={OrganizerProfileScreen}
            options={{ headerShown: false }}
          />

          {/* Payment Screens */}
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="PaymentSuccess"
            component={PaymentSuccessScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="PaymentFailed"
            component={PaymentFailedScreen}
            options={{
              headerShown: false,
            }}
          />

          {/* Ticket Screens */}
          <Stack.Screen
            name="TicketPurchase"
            component={TicketPurchaseScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="QRCode"
            component={QRCodeScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="RegistrationDetails"
            component={RegistrationDetailsScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="PendingTransfers"
            component={PendingTransfersScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="OfflineTickets"
            component={OfflineTicketsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Scan"
            component={ScanScreen}
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
            }}
          />

          {/* Dashboard & Profile Screens */}
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="UserDashboard"
            component={DashboardScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              headerShown: true,
              headerTitle: 'Modifier le profil',
              headerBackTitle: 'Retour',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="BecomeOrganizer"
            component={BecomeOrganizerScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Verification"
            component={VerificationScreen}
            options={{
              headerShown: true,
              headerTitle: 'Vérification',
              headerBackTitle: 'Retour',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          />

          {/* Messages Screens */}
          <Stack.Screen
            name="Messages"
            component={MessagesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Conversation"
            component={ConversationScreen}
            options={{
              headerShown: true,
              headerTitle: '',
              headerBackTitle: 'Retour',
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          />

          {/* Organizer Screens */}
          <Stack.Screen
            name="EventCreate"
            component={EventCreateScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MyEvents"
            component={MyEventsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="EventAnalytics"
            component={EventAnalyticsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="EventRegistrations"
            component={EventRegistrationsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="DiscountManagement"
            component={DiscountManagementScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="DiscountForm"
            component={DiscountFormScreen}
            options={{
              headerShown: false,
            }}
          />

          {/* Moderation Screens */}
          <Stack.Screen
            name="Moderation"
            component={ModerationScreen}
            options={{
              headerShown: false,
            }}
          />

          {/* Payment Management Screens */}
          <Stack.Screen
            name="MyPayments"
            component={MyPaymentsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="RefundRequest"
            component={RefundRequestScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />

          {/* New Feature Screens */}
          <Stack.Screen
            name="Gamification"
            component={GamificationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Invitations"
            component={InvitationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LiveEvent"
            component={LiveEventScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Referrals"
            component={ReferralScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Volunteers"
            component={VolunteerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
