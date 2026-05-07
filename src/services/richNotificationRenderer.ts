/**
 * services/richNotificationRenderer.ts
 *
 * Affiche une notification PUSH avec un layout enrichi via Notifee
 * (BigPictureStyle, MessagingStyle, BigTextStyle, large icon).
 *
 * Le backend enrichit `data` avec :
 *   - `style` : 'big_picture' | 'big_text' | 'messaging' | 'avatar' | 'default'
 *   - `color` : couleur d'accent (hex) pour l'icône monochrome
 *   - `big_picture_url` : URL de l'image en grand (BigPictureStyle)
 *   - `large_icon_url`  : URL avatar/logo (large icon)
 *   - `urgent` : true → channel haute priorité
 *
 * Quand l'app est OUVERTE (foreground) : on utilise ce renderer.
 * Quand l'app est FERMÉE/background : Android rend le payload Expo natif
 * (basique, mais avec `color` + channelId déjà cohérents).
 */

import notifee, {
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  AndroidColor,
  AndroidGroupAlertBehavior,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const DEFAULT_COLOR = '#4F46E5';

interface RichNotificationData {
  style?: 'big_picture' | 'big_text' | 'messaging' | 'avatar' | 'default';
  color?: string;
  big_picture_url?: string;
  large_icon_url?: string;
  urgent?: boolean;
  notification_id?: string;
  notification_type?: string;
  // Pour MessagingStyle
  sender_name?: string;
  conversation_id?: string;
  // Pour les actions
  event_id?: string;
  registration_id?: string;
  ticket_id?: string;
  related_object_id?: string;
  related_object_type?: string;
  [key: string]: any;
}

/**
 * Mappe le notification_type au channel Android (5 channels créés dans
 * pushNotificationService.ts : default, event_reminders, payments,
 * messages, urgent_actions).
 *
 * Les notifs critiques (payment_failed, event_cancelled, refund_processed,
 * verification_reminder) vont sur `urgent_actions` qui a un vibrationPattern
 * triple-beep + lightColor rouge — différencié visuellement et auditivement
 * des notifs informatives normales.
 */
const URGENT_TYPES = new Set([
  'payment_failed',
  'event_cancelled',
  'refund_processed',
  'verification_reminder',
]);

const channelForType = (type?: string): string => {
  if (!type) return 'default';
  // Urgent en premier — prend le pas sur les matchs génériques (payment, refund)
  if (URGENT_TYPES.has(type)) return 'urgent_actions';
  if (type.includes('message')) return 'messages';
  if (type.includes('payment') || type.includes('refund')) return 'payments';
  if (type.includes('event_reminder') || type.includes('session_reminder')) return 'event_reminders';
  return 'default';
};

/**
 * Affiche une notification riche via Notifee. Si Notifee n'est pas dispo
 * (Expo Go, ou indépendamment iOS), no-op silencieux et on laisse le
 * système rendre la notif basique.
 */
export async function displayRichNotification(
  title: string,
  body: string,
  data: RichNotificationData = {},
): Promise<string | null> {
  // Notifee est Android-first. Sur iOS, le rendu rich est très limité
  // (foreground = banner standard du système). On no-op iOS pour l'instant.
  if (Platform.OS !== 'android') return null;

  try {
    const color = data.color || DEFAULT_COLOR;
    const channelId = channelForType(data.notification_type);

    // Configuration commune
    const baseConfig: any = {
      title,
      body,
      data: data as any,
      android: {
        channelId,
        // Petite icône monochrome — utilise la même que l'app pour
        // l'instant. Pour différencier par type, ajouter d'autres
        // smallIcon dans res/drawable.
        smallIcon: 'ic_notification',
        color,
        // Importance/priorité — events urgents (cancel, payment_failed) en HIGH
        importance: data.urgent ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PUBLIC,
        showTimestamp: true,
        // Navigation au tap : on stocke notre data pour que le handler
        // existant (NotificationContext.handleNotificationNavigation) la
        // récupère via getInitialNotification / onForegroundEvent.
        pressAction: { id: 'default' },
      },
    };

    // Ajout du large icon si fourni (avatar / logo organizer)
    if (data.large_icon_url) {
      baseConfig.android.largeIcon = data.large_icon_url;
    }

    // Style adaptatif selon `data.style`
    switch (data.style) {
      case 'big_picture':
        if (data.big_picture_url) {
          baseConfig.android.style = {
            type: AndroidStyle.BIGPICTURE,
            picture: data.big_picture_url,
            // Quand expanded, l'image cache le large_icon — c'est OK,
            // pattern Eventbrite/Instagram.
          };
        }
        break;

      case 'big_text':
        baseConfig.android.style = {
          type: AndroidStyle.BIGTEXT,
          text: body, // Affiche le body complet quand expanded
        };
        break;

      case 'messaging': {
        // Pattern WhatsApp : avatar conversation + bulles
        const senderName = data.sender_name || title;
        baseConfig.android.style = {
          type: AndroidStyle.MESSAGING,
          person: {
            name: senderName,
            icon: data.large_icon_url,
          },
          messages: [
            {
              text: body,
              timestamp: Date.now(),
            },
          ],
          // Group conversation = pas pour 1-1, on laisse à false
          group: false,
        };
        // Actions de réponse rapide
        baseConfig.android.actions = [
          {
            title: 'Marquer comme lu',
            pressAction: { id: 'mark_read' },
          },
          {
            title: 'Répondre',
            pressAction: {
              id: 'reply',
              launchActivity: 'default',
            },
            input: {
              placeholder: 'Tapez votre message…',
              choices: [],
            },
          },
        ];
        break;
      }

      case 'avatar':
        // Pattern LinkedIn : large icon avatar + body simple
        // (déjà géré via baseConfig.android.largeIcon ci-dessus)
        break;

      case 'default':
      default:
        // Si body est long, on bascule auto en BigTextStyle pour ne pas
        // tronquer (limite Android ~40 chars sans expand).
        if (body && body.length > 50) {
          baseConfig.android.style = {
            type: AndroidStyle.BIGTEXT,
            text: body,
          };
        }
        break;
    }

    // Actions par type de notif (si pas déjà posées par messaging)
    if (!baseConfig.android.actions) {
      baseConfig.android.actions = buildActionsForType(data);
    }

    // Group summary : agrège les notifs du même type sous une seule en haut.
    // Pattern LinkedIn "3 nouvelles notifications" quand on a plusieurs notifs
    // de même type non encore consommées.
    if (data.notification_type) {
      baseConfig.android.groupId = data.notification_type;
      baseConfig.android.groupAlertBehavior = AndroidGroupAlertBehavior.CHILDREN;
    }

    const id = await notifee.displayNotification(baseConfig);
    return id;
  } catch (error) {
    if (__DEV__) console.warn('[RichNotif] Render failed:', error);
    return null;
  }
}

/**
 * Boutons d'action contextuels selon le type. Le handler des actions est
 * enregistré ailleurs (notifee.onForegroundEvent / onBackgroundEvent).
 */
function buildActionsForType(data: RichNotificationData): any[] {
  const type = data.notification_type;
  const actions: any[] = [];

  if (type === 'event_validated' || type === 'event_reminder' || type === 'event_suggestion') {
    actions.push({
      title: "Voir l'événement",
      pressAction: { id: 'view_event', launchActivity: 'default' },
    });
  }

  if (type === 'payment_confirmation' || type === 'payment_failed') {
    actions.push({
      title: 'Voir mes billets',
      pressAction: { id: 'view_tickets', launchActivity: 'default' },
    });
  }

  if (type === 'event_cancelled') {
    actions.push({
      title: 'Voir le remboursement',
      pressAction: { id: 'view_refund', launchActivity: 'default' },
    });
  }

  if (type === 'new_follower') {
    actions.push({
      title: 'Voir le profil',
      pressAction: { id: 'view_user', launchActivity: 'default' },
    });
  }

  return actions;
}

/**
 * Crée/met-à-jour les channels Android via Notifee. À appeler une fois au
 * boot (en plus de pushNotificationService qui les crée déjà via
 * expo-notifications). Notifee permet plus de granularité (importance,
 * lights, vibration pattern).
 *
 * Note : si les channels existent déjà avec la même id, Android applique
 * les changements seulement à la création — pour les modifier après,
 * il faut désinstaller l'app ou changer l'id du channel.
 */
export async function ensureNotifeeChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannels([
      {
        id: 'default',
        name: 'Notifications générales',
        importance: AndroidImportance.DEFAULT,
        vibration: true,
      },
      {
        id: 'event_reminders',
        name: "Rappels d'événements",
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
      },
      {
        id: 'payments',
        name: 'Paiements',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: AndroidColor.GREEN,
      },
      {
        id: 'messages',
        name: 'Messages',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
      },
      {
        // Doit rester aligné avec pushNotificationService.setupAndroidChannel.
        id: 'urgent_actions',
        name: 'Actions urgentes',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: AndroidColor.RED,
      },
    ]);
  } catch (error) {
    if (__DEV__) console.warn('[Notifee] channel creation failed:', error);
  }
}
