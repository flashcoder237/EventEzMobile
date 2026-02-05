import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { Colors } from '../constants/theme';

// Navigators
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

// Event Screens
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import MapScreen from '../screens/events/MapScreen';

// Payment Screens
import PaymentScreen from '../screens/payment/PaymentScreen';
import PaymentSuccessScreen from '../screens/payment/PaymentSuccessScreen';
import PaymentFailedScreen from '../screens/payment/PaymentFailedScreen';

// Ticket Screens
import QRCodeScreen from '../screens/tickets/QRCodeScreen';
import TicketPurchaseScreen from '../screens/tickets/TicketPurchaseScreen';
import RegistrationDetailsScreen from '../screens/tickets/RegistrationDetailsScreen';

// Dashboard & Profile Screens
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import TermsScreen from '../screens/profile/TermsScreen';
import BecomeOrganizerScreen from '../screens/profile/BecomeOrganizerScreen';

// Messages Screens
import MessagesScreen from '../screens/messages/MessagesScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';

// Organizer Screens
import EventCreateScreen from '../screens/organizer/EventCreateScreen';
import WalletScreen from '../screens/organizer/WalletScreen';
import MyEventsScreen from '../screens/organizer/MyEventsScreen';
import QRScannerScreen from '../screens/organizer/QRScannerScreen';
import EventAnalyticsScreen from '../screens/organizer/EventAnalyticsScreen';
import EventRegistrationsScreen from '../screens/organizer/EventRegistrationsScreen';

// Moderation Screens
import ModerationScreen from '../screens/moderation/ModerationScreen';

// Payment Management Screens
import MyPaymentsScreen from '../screens/payment/MyPaymentsScreen';
import RefundRequestScreen from '../screens/payment/RefundRequestScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: 'slide_from_right',
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
            }}
          />
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              headerShown: true,
              headerTitle: 'Carte',
              headerBackTitle: 'Retour',
              headerTintColor: Colors.primary,
              headerStyle: { backgroundColor: Colors.white },
              headerShadowVisible: false,
            }}
          />

          {/* Payment Screens */}
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
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
              headerTintColor: Colors.primary,
              headerStyle: { backgroundColor: Colors.white },
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
            name="BecomeOrganizer"
            component={BecomeOrganizerScreen}
            options={{
              headerShown: false,
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
              headerTintColor: Colors.primary,
              headerStyle: { backgroundColor: Colors.white },
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
        </>
      )}
    </Stack.Navigator>
  );
}
