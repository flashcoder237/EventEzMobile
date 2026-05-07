/**
 * Mapping route → services backend concernés.
 *
 * Permet à `IncidentBanner` de filtrer les incidents selon l'écran courant.
 * Si un incident touche `messaging` mais l'utilisateur est sur une page
 * de paiement, on ne le notifie pas (pas pertinent pour son contexte).
 *
 * Service keys = celles du backend (apps/system_status/services.py).
 *
 * Règles :
 * - Incident scope=global → toujours pertinent (affiché partout).
 * - Incident scope=service → affiché si AU MOINS un service touché ∈
 *   services pertinents de l'écran courant.
 * - Si la route n'a pas de mapping → on n'affiche QUE les global (silence
 *   par défaut pour les services spécifiques).
 *
 * Pour ajouter un mapping, ajouter ici. Une route peut concerner plusieurs
 * services (ex. l'achat de billet utilise `registrations` ET `payments.notchpay`).
 */

const ROUTE_TO_SERVICES: Record<string, string[]> = {
  // === Messagerie ===
  Messages: ['messaging'],
  MessagesTab: ['messaging'],
  Conversation: ['messaging'],
  NewConversation: ['messaging'],
  ConversationSettings: ['messaging'],
  GroupMembers: ['messaging'],

  // === Paiement & billets ===
  Payment: ['payments.notchpay', 'registrations'],
  PaymentSuccess: ['payments.notchpay'],
  PaymentFailed: ['payments.notchpay'],
  MyPayments: ['payments.notchpay'],
  RefundRequest: ['payments.notchpay'],
  RefundsList: ['payments.notchpay'],
  TicketPurchase: ['payments.notchpay', 'registrations'],
  MyTickets: ['registrations'],
  TicketDetails: ['registrations'],
  TicketTransfer: ['registrations'],

  // === Événements (consultation + création) ===
  Discover: ['core.events'],
  Home: ['core.events'],
  EventDetails: ['core.events', 'registrations'],
  EventCreate: ['core.events', 'ai.assist'],
  EventEdit: ['core.events'],
  MyEvents: ['core.events'],
  EventRegistrations: ['core.events', 'registrations'],
  Following: ['core.events'],
  FollowingEvents: ['core.events'],

  // === Sessions & agenda ===
  EventSessions: ['core.events'],
  SessionDetails: ['core.events'],
  EventSessionsLink: ['core.events'],

  // === Auth ===
  Login: ['core.auth'],
  Register: ['core.auth'],
  ForgotPassword: ['core.auth'],
  ResetPassword: ['core.auth'],
  VerifyEmail: ['core.auth'],
  VerifyEmailToken: ['core.auth'],

  // === Notifications ===
  Notifications: ['notifications.push', 'notifications.email'],

  // === Analytics organizer ===
  EventAnalytics: ['analytics'],
  Analytics: ['analytics'],
  AnalyticsDashboard: ['analytics'],

  // === Wallet / Payouts ===
  Wallet: ['payments.payouts'],
  Payouts: ['payments.payouts'],
  PayoutRequest: ['payments.payouts'],

  // === IA ===
  AIAssist: ['ai.assist'],

  // === Geo / search ===
  Map: ['geocoding'],
  EventSearch: ['geocoding', 'core.events'],

  // === Modération admin ===
  Moderation: ['moderation'],
  ModerationFlags: ['moderation'],

  // === Profile / Settings (peu d'impact service direct) ===
  Profile: [],
  Settings: [],
  EditProfile: ['core.auth'],
  BecomeOrganizer: ['core.auth'],

  // === Status pages — toujours autoriser pour qu'on puisse les voir ===
  SystemStatus: [],
  IncidentDetails: [],
  Maintenance: [],
};

/**
 * Retourne les services pertinents pour la route courante.
 * Liste vide = on n'affichera que les incidents scope=global.
 * Route inconnue = liste vide aussi (silence par défaut).
 */
export function getServicesForRoute(routeName: string | undefined): string[] {
  if (!routeName) return [];
  return ROUTE_TO_SERVICES[routeName] || [];
}

/**
 * Décide si un incident doit être affiché à l'utilisateur sur l'écran courant.
 *
 * @param incident l'incident reçu (scope global ou service)
 * @param routeName nom de la route active
 * @returns true si pertinent à afficher
 */
export function shouldShowIncidentForRoute(
  incident: { scope: 'global' | 'service'; affected_services?: string[] } | null | undefined,
  routeName: string | undefined,
): boolean {
  if (!incident) return false;
  // Global : toujours pertinent
  if (incident.scope === 'global') return true;
  // Service : intersection avec les services de l'écran courant
  const relevantServices = getServicesForRoute(routeName);
  if (relevantServices.length === 0) return false;
  const affected = incident.affected_services || [];
  return affected.some((s) => relevantServices.includes(s));
}
