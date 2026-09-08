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

/**
 * Reset vers un ONGLET précis de l'écran principal (Discover/MyTickets/…), en
 * EFFONDRANT toute la pile empilée au-dessus. À utiliser aux FINS DE PARCOURS
 * (paiement réussi, création d'event, check-in) : sans reset, `navigate`/`replace`
 * laissent Discover→Event→Achat empilés dessous et l'utilisateur peut y
 * re-descendre par un back involontaire.
 */
export function resetToMainTab(
  navigation: Navigation,
  screen: 'Discover' | 'Saved' | 'MessagesTab' | 'MyTickets' | 'Profile' = 'Discover',
) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen } }],
    })
  );
}

/**
 * Reset la pile à [Main, <écran>] : effondre tout ce qui était empilé et pose
 * un seul écran au-dessus de l'accueil. Le « retour » depuis cet écran ramène à
 * l'accueil, pas dans l'ancienne chaîne. Idéal après création d'event
 * (→ MyEvents) ou tout parcours qui doit finir sur un écran unique propre.
 */
export function resetToMainThen(
  navigation: Navigation,
  routeName: keyof RootStackParamList,
  params?: object,
) {
  navigation.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: routeName as string, params }],
    })
  );
}
