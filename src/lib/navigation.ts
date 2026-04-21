/**
 * Utilitaires de navigation
 * Standardise les patterns de navigation dans l'application
 */

import { NavigationProp, CommonActions } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from '../types';

type Navigation = NavigationProp<RootStackParamList>;

/**
 * Navigue vers un onglet du MainTab avec des parametres optionnels
 */
export function navigateToMainTab<T extends keyof MainTabParamList>(
  navigation: Navigation,
  screen: T,
  params?: MainTabParamList[T]
) {
  navigation.navigate('Main', {
    screen,
    params,
  } as any);
}

/**
 * Navigue vers les details d'un evenement
 */
export function navigateToEventDetails(navigation: Navigation, eventId: string) {
  navigation.navigate('EventDetails', { eventId });
}

/**
 * Navigue vers l'achat de billets
 */
export function navigateToTicketPurchase(
  navigation: Navigation,
  eventId: string,
  options?: {
    ticketTypeId?: string;
    registrationId?: string;
    additionalTickets?: boolean;
  }
) {
  navigation.navigate('TicketPurchase', {
    eventId,
    ...options,
  });
}

/**
 * Navigue vers le paiement
 */
export function navigateToPayment(
  navigation: Navigation,
  registrationId: string,
  options?: {
    newTickets?: Array<{
      id: string;
      ticket_type_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    totalAmount?: number;
  }
) {
  navigation.navigate('Payment', {
    registrationId,
    ...options,
  });
}

/**
 * Navigue vers une conversation
 */
export function navigateToConversation(
  navigation: Navigation,
  conversationId?: string,
  userId?: string,
  userName?: string
) {
  navigation.navigate('Conversation', {
    conversationId,
    userId,
    userName,
  });
}

/**
 * Navigue vers le profil d'un organisateur
 */
export function navigateToOrganizerProfile(navigation: Navigation, organizerId: string) {
  navigation.navigate('OrganizerProfile', { organizerId });
}

/**
 * Navigue vers le profil utilisateur
 */
export function navigateToProfile(navigation: Navigation, userId?: string) {
  navigation.navigate('Profile', { userId });
}

/**
 * Navigue vers les notifications
 */
export function navigateToNotifications(navigation: Navigation) {
  navigation.navigate('Notifications');
}

/**
 * Navigue vers les messages
 */
export function navigateToMessages(navigation: Navigation) {
  navigation.navigate('Messages');
}

/**
 * Retourne a l'ecran precedent
 */
export function goBack(navigation: Navigation) {
  if (navigation.canGoBack()) {
    navigation.goBack();
  }
}

/**
 * Reset la navigation vers un ecran specifique
 */
export function resetTo(navigation: Navigation, routeName: keyof RootStackParamList) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName }],
    })
  );
}

/**
 * Reset vers l'ecran d'authentification
 */
export function resetToAuth(navigation: Navigation) {
  resetTo(navigation, 'Login');
}

/**
 * Reset vers l'ecran principal
 */
export function resetToMain(navigation: Navigation) {
  resetTo(navigation, 'Main');
}
