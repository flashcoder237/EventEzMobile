/**
 * Actions de notification (round 3, P4) — source unique pour iOS et Android.
 *
 * Le backend pose `categoryId` sur le push (NotificationService._push_category).
 * Les identifiants de catégorie sont un CONTRAT avec le backend : ne pas les
 * renommer. Les identifiants d'action, eux, ne vivent que dans l'app.
 *
 *  - iOS     : `registerNotificationCategories()` au démarrage
 *              (Notifications.setNotificationCategoryAsync).
 *  - Android : `androidActionsFor()` pose les boutons Notifee au rendu, et
 *              `notifee.onBackgroundEvent` (index.ts) traite marquer-lu et la
 *              réponse rapide app fermée.
 *
 * Toute navigation passe par `resolveNotificationTarget` : une action se
 * traduit en un `notification_type` que le résolveur sait déjà router.
 */
import { Linking, Platform } from 'react-native';
import i18n from '../../i18n';

/**
 * Client API chargé à la demande : ce module est aussi requis par index.ts
 * (handler Notifee d'arrière-plan) et ne doit pas tirer l'API au chargement.
 */
function loadApi(): typeof import('../../api') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../api');
}

export const NOTIFICATION_CATEGORIES = {
  ticketDay: 'ticket_day',
  reminder: 'reminder',
  message: 'message',
  live: 'live',
  seatHeld: 'seat_held',
  connection: 'connection',
} as const;
export type NotificationCategoryId = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

export type NotificationActionId =
  | 'show_ticket'
  | 'directions'
  | 'going'
  | 'reply'
  | 'mark_read'
  | 'join_live'
  | 'pay_now'
  | 'write_to';

interface ActionSpec {
  id: NotificationActionId;
  labelKey: string;
  /** Ouvre l'app (sinon : traité en arrière-plan — marquer lu, réponse rapide). */
  opensApp: boolean;
  textInput?: boolean;
}

const CATEGORY_ACTIONS: Record<NotificationCategoryId, ActionSpec[]> = {
  ticket_day: [
    { id: 'show_ticket', labelKey: 'notifications.actions.showTicket', opensApp: true },
    { id: 'directions', labelKey: 'notifications.actions.directions', opensApp: true },
  ],
  reminder: [
    { id: 'going', labelKey: 'notifications.actions.going', opensApp: true },
    { id: 'show_ticket', labelKey: 'notifications.actions.viewTicket', opensApp: true },
  ],
  message: [
    { id: 'reply', labelKey: 'notifications.actions.reply', opensApp: false, textInput: true },
    { id: 'mark_read', labelKey: 'notifications.actions.markRead', opensApp: false },
  ],
  live: [{ id: 'join_live', labelKey: 'notifications.actions.joinLive', opensApp: true }],
  seat_held: [{ id: 'pay_now', labelKey: 'notifications.actions.payNow', opensApp: true }],
  connection: [{ id: 'write_to', labelKey: 'notifications.actions.writeTo', opensApp: true }],
};

export function actionsForCategory(categoryId: string | undefined | null): ActionSpec[] {
  return (categoryId && CATEGORY_ACTIONS[categoryId as NotificationCategoryId]) || [];
}

/**
 * Catégorie d'un push. Le backend la fournit (`categoryId`, recopié dans
 * `data`) ; à défaut (vieux backend), on la déduit du type — même règle que
 * NotificationService._push_category.
 */
export function categoryForData(data: Record<string, any> | null | undefined): NotificationCategoryId | null {
  if (!data) return null;
  const explicit = data.categoryId || data.category_id;
  if (explicit && explicit in CATEGORY_ACTIONS) return explicit as NotificationCategoryId;
  switch (data.notification_type) {
    case 'event_today':
      return 'ticket_day';
    case 'event_reminder':
      if (data.reminder_kind === 'starting_soon') return 'ticket_day';
      if (data.registration_id && data.reminder_kind !== 'day_before') return 'ticket_day';
      return 'reminder';
    case 'new_message':
      return 'message';
    case 'event_live':
      return 'live';
    case 'waitlist_available':
      return data.kind === 'seat_held' ? 'seat_held' : null;
    case 'connection_arrived':
      return 'connection';
    default:
      return null;
  }
}

/** iOS : déclare les catégories (libellés dans la langue courante). Idempotent. */
export async function registerNotificationCategories(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const Notifications = await import('expo-notifications');
    const t = i18n.t.bind(i18n);
    await Promise.all(
      (Object.keys(CATEGORY_ACTIONS) as NotificationCategoryId[]).map((categoryId) =>
        Notifications.setNotificationCategoryAsync(
          categoryId,
          CATEGORY_ACTIONS[categoryId].map((a) => ({
            identifier: a.id,
            buttonTitle: t(a.labelKey),
            ...(a.textInput
              ? {
                  textInput: {
                    submitButtonTitle: t('notifications.actions.replySubmit'),
                    placeholder: t('notifications.actions.replyPlaceholder'),
                  },
                }
              : null),
            options: { opensAppToForeground: a.opensApp },
          })),
        ),
      ),
    );
  } catch (error) {
    if (__DEV__) console.warn('[NotifActions] category registration failed:', error);
  }
}

/** Android : boutons Notifee d'une catégorie (« Répondre » ne lance pas l'app). */
export function androidActionsFor(categoryId: NotificationCategoryId): any[] {
  const t = i18n.t.bind(i18n);
  return CATEGORY_ACTIONS[categoryId].map((a) => ({
    title: t(a.labelKey),
    pressAction: a.opensApp ? { id: a.id, launchActivity: 'default' } : { id: a.id },
    ...(a.textInput ? { input: { placeholder: t('notifications.actions.replyPlaceholder') } } : null),
  }));
}

/**
 * Données à router pour une action qui ouvre l'app : on réécrit le
 * `notification_type` vers celui que `resolveNotificationTarget` associe à
 * l'écran voulu (et on retire `screen`/`params` explicites du backend, qui
 * désignent l'action par défaut). `null` = rien à ouvrir.
 */
export function routeDataForAction(actionId: string, data: Record<string, any>): Record<string, any> | null {
  const base = { ...data, screen: undefined, params: undefined };
  switch (actionId) {
    case 'show_ticket':
    case 'going':
      // Billet : RegistrationDetails si l'inscription est connue, sinon onglet Billets.
      return { ...base, notification_type: 'registration_confirmation' };
    case 'join_live':
      return { ...base, notification_type: 'event_live' };
    case 'pay_now':
      // La fiche affiche la place gardée et son compte à rebours ; le paiement part de là.
      return { ...base, notification_type: 'waitlist_available', kind: 'seat_held' };
    case 'write_to':
      return { ...base, notification_type: 'connection_arrived' };
    case 'reply':
    case 'mark_read':
      // Sans saisie (ou iOS app tuée) : ouvrir la conversation.
      return { ...base, notification_type: 'new_message' };
    case 'directions':
      // Repli quand on n'a pas de lieu exploitable : la fiche de l'événement.
      return { ...base, notification_type: 'event_validated' };
    default:
      return data;
  }
}

/** URL d'itinéraire vers le lieu de l'événement, si le push en porte un. */
export function directionsUrl(data: Record<string, any>): string | null {
  const lat = parseFloat(data.latitude ?? data.lat);
  const lng = parseFloat(data.longitude ?? data.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const place = data.venue_address || data.address || data.venue_name || data.location;
  return place ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(String(place))}` : null;
}

/**
 * Effets de bord d'une action (appels API). Retourne les données à router,
 * ou `null` si l'action est terminée sans ouvrir d'écran (marquer lu,
 * réponse envoyée, itinéraire ouvert dans l'app Cartes).
 */
export async function performNotificationAction(
  actionId: string,
  data: Record<string, any>,
  userText?: string | null,
): Promise<Record<string, any> | null> {
  switch (actionId) {
    case 'mark_read': {
      if (data.notification_id) {
        const { notificationsAPI } = loadApi();
        await notificationsAPI.markAsRead(String(data.notification_id)).catch(() => {});
      }
      return null;
    }
    case 'reply': {
      const text = (userText || '').trim();
      const conversation = data.conversation_id || (data.related_object_type === 'conversation' ? data.related_object_id : null);
      if (!text || !conversation) return routeDataForAction('reply', data);
      const { messagesAPI } = loadApi();
      try {
        await messagesAPI.sendMessage({ content: text, conversation: String(conversation) });
        return null;
      } catch (error) {
        if (__DEV__) console.warn('[NotifActions] quick reply failed:', error);
        // Échec : on ouvre la conversation plutôt que de perdre la réponse en silence.
        return routeDataForAction('reply', data);
      }
    }
    case 'going': {
      if (data.registration_id) {
        const { registrationsAPI } = loadApi();
        // Backend antérieur à l'endpoint : 404 ignoré, on ouvre quand même le billet.
        await registrationsAPI.setAttendanceIntent(String(data.registration_id), 'going').catch(() => {});
      }
      return routeDataForAction('going', data);
    }
    case 'directions': {
      const url = directionsUrl(data);
      if (url) {
        try {
          await Linking.openURL(url);
          return null;
        } catch {
          /* repli sur la fiche */
        }
      }
      return routeDataForAction('directions', data);
    }
    default:
      return routeDataForAction(actionId, data);
  }
}
