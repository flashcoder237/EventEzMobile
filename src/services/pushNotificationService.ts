// src/services/pushNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from '../api';

const PUSH_TOKEN_KEY = '@eventez_push_token';
const PUSH_REGISTERED_AT_KEY = '@eventez_push_registered_at';
// Dernier token effectivement enregistré côté backend. Utilisé pour skip
// l'API call si on tente de ré-enregistrer le même token (déduplication).
const LAST_REGISTERED_TOKEN_KEY = '@eventez_last_registered_token';
// Doit rester aligné avec NotificationContext.LAST_HANDLED_RESPONSE_ID_KEY.
// Stocké ici aussi pour que le listener "warm tap" puisse marquer une notif
// comme déjà consommée — sans ça, au prochain cold start
// `getLastNotificationResponseAsync()` la renvoie et on re-navigue.
const LAST_HANDLED_RESPONSE_ID_KEY = '@eventez_last_handled_notif_response_id';
const MAX_REGISTER_RETRIES = 3;
// Au-delà de cette durée, on force un re-register côté backend pour rafraîchir
// l'enregistrement (le serveur peut dropper un token inactif). 7 jours est un
// compromis sain : suffisamment long pour ne pas spammer, court pour rester
// au-dessus de l'éviction Expo Push (qui peut révoquer un token dormant).
const PUSH_RE_REGISTER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// Get project ID from app config
const getProjectId = (): string => {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? '';
};

// Configure how notifications are handled when app is in foreground.
// Quand une notif arrive et que l'app est ouverte :
//   - On NE laisse PAS le système afficher la notif basique Expo
//     (shouldShowBanner: false / shouldShowAlert: false)
//   - On rend nous-mêmes via Notifee avec un layout riche (BigPictureStyle,
//     MessagingStyle selon le type) → cf. addNotificationReceivedListener
//     plus bas dans pushNotificationService.initialize()
// Si Notifee ne peut pas rendre (iOS, ou erreur), Expo reprend la main :
// shouldShowList=true garde au moins l'entrée dans le centre de notifs.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isAndroid = Platform.OS === 'android';
    const data = notification.request.content.data as any;
    const hasRichStyle = isAndroid && data?.style && data.style !== 'default';

    if (hasRichStyle) {
      // On va render via Notifee → masquer la version Expo native
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      };
    }

    // Fallback standard
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export interface PushNotificationData {
  type?: string;
  notification_type?: string;
  notification_id?: string;
  event_id?: string;
  registration_id?: string;
  ticket_id?: string;
  conversation_id?: string;
  message_id?: string;
  url?: string;
  // Backend can send explicit screen + params for navigation
  screen?: string;
  params?: Record<string, any>;
  // Related object fields from backend
  related_object_type?: string;
  related_object_id?: string;
}

class PushNotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private navigationCallback: ((data: PushNotificationData) => void) | null = null;

  /**
   * Initialize push notifications
   * Should be called when app starts
   */
  async initialize(): Promise<string | null> {
    // Check if running on physical device
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Must use physical device for push notifications');
      return null;
    }

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      if (__DEV__) console.log('[Push] Permission not granted');
      return null;
    }

    // Init des channels Notifee (Android-only) — sont créés idempotemment.
    // Channels Expo et Notifee partagent les mêmes IDs ("default", "messages",
    // "event_reminders", "payments") donc le système les fusionne.
    try {
      const { ensureNotifeeChannels } = await import('./richNotificationRenderer');
      await ensureNotifeeChannels();
    } catch (error) {
      if (__DEV__) console.warn('[Push] Notifee channel init failed:', error);
    }

    // Notifee event handlers — pour les actions custom des notifs riches
    // (Marquer comme lu, Voir l'événement, etc.)
    this.setupNotifeeHandlers();

    // Get push token
    try {
      const token = await this.getPushToken();
      if (token) {
        await this.registerTokenWithBackend(token);
        // Setup notification listeners
        this.setupListeners();
        return token;
      }
    } catch (error) {
      if (__DEV__) console.warn('[Push] Firebase not configured, push notifications disabled:', error);
      // Continue without push notifications - app still works
    }

    return null;
  }

  /**
   * Setup handlers Notifee pour les pressActions des notifs riches.
   * Foreground et background — le handler est appelé quand l'utilisateur
   * tape une action (ex. "Voir l'événement", "Marquer comme lu").
   */
  private setupNotifeeHandlers(): void {
    if (Platform.OS !== 'android') return;

    import('@notifee/react-native')
      .then(({ default: notifee, EventType }) => {
        // Foreground : déjà handled via setNotificationHandler/listener Expo,
        // mais on ajoute Notifee pour les pressActions custom (Marquer lu, etc.)
        notifee.onForegroundEvent(async ({ type, detail }) => {
          if (type === EventType.PRESS) {
            // Tap sur la notif elle-même → délègue au callback existant
            const data = detail.notification?.data as any;
            if (data) this.handleNotificationTap(data);
          } else if (type === EventType.ACTION_PRESS) {
            const data = detail.notification?.data as any;
            const actionId = detail.pressAction?.id;
            await this.handleActionPress(actionId, data, detail);
          }
        });
      })
      .catch((error) => {
        if (__DEV__) console.warn('[Push] Notifee setup failed:', error);
      });
  }

  /**
   * Gère les actions custom posées sur les notifs riches.
   * Exemples : "Marquer comme lu" → appelle l'API, "Répondre" → ouvre la
   * conversation avec le texte pré-rempli, "Voir l'événement" → navigue.
   */
  private async handleActionPress(actionId: string | undefined, data: any, detail: any): Promise<void> {
    if (!actionId) return;
    try {
      switch (actionId) {
        case 'mark_read': {
          const notifId = data?.notification_id;
          if (notifId) {
            const { notificationsAPI } = await import('../api');
            await notificationsAPI.markAsRead(notifId);
          }
          break;
        }
        case 'reply': {
          // Si l'utilisateur a tapé un texte dans le quick reply
          const replyText = detail?.input;
          if (replyText && data?.conversation_id) {
            const { messagesAPI } = await import('../api');
            try {
              await messagesAPI.sendMessage({
                content: replyText,
                conversation: data.conversation_id,
              });
            } catch (error) {
              if (__DEV__) console.warn('[Push] reply send failed:', error);
            }
          }
          break;
        }
        case 'view_event':
        case 'view_user':
        case 'view_tickets':
        case 'view_refund':
        case 'default':
          // Navigation gérée par le callback existant (via data.event_id, etc.)
          this.handleNotificationTap(data);
          break;
      }
    } catch (error) {
      if (__DEV__) console.warn('[Push] action handler failed:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[Push] Failed to get push token - permission denied');
        return false;
      }

      // Android specific: Create notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      return true;
    } catch (error) {
      if (__DEV__) console.error('[Push] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EventEz Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });

    // Channel for event reminders
    await Notifications.setNotificationChannelAsync('event_reminders', {
      name: 'Rappels d\'événements',
      description: 'Notifications de rappel pour vos événements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
    });

    // Channel for payment confirmations
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Paiements',
      description: 'Confirmations et mises à jour de paiement',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    // Channel for messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Nouveaux messages et conversations',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  /**
   * Get Expo push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      const projectId = getProjectId();

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      const token = tokenData.data;
      if (__DEV__) console.log('[Push] Expo push token:', token);

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      return token;
    } catch (error) {
      if (__DEV__) console.error('[Push] Error getting push token:', error);
      // Try without projectId for development builds
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (__DEV__) console.log('[Push] Expo push token (fallback):', token);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        return token;
      } catch (fallbackError) {
        if (__DEV__) console.error('[Push] Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Get native FCM/APNs device token. Distinct du token Expo (qui est un
   * wrapper ExponentPushToken[xxx]). Le backend l'utilise pour envoyer via
   * Firebase Admin SDK direct → permet BigPictureStyle/MessagingStyle EN
   * BACKGROUND (impossible avec Expo Push).
   *
   * Sur Android : token FCM brut.
   * Sur iOS     : device token APNs (hex).
   * Si Firebase n'est pas configuré (Expo Go ou config manquante) → null,
   * et le backend fallback sur Expo Push pour ce device.
   */
  async getNativeDeviceToken(): Promise<string | null> {
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const token = tokenData?.data;
      if (typeof token !== 'string' || !token) return null;
      if (__DEV__) console.log('[Push] Native device token (FCM/APNs):', token.substring(0, 30) + '...');
      return token;
    } catch (error) {
      if (__DEV__) console.warn('[Push] Native device token unavailable (Expo Go ou Firebase non configuré):', error);
      return null;
    }
  }

  /**
   * Register device with retry logic and exponential backoff
   */
  private async registerDeviceWithRetry(deviceInfo: {
    push_token: string;
    fcm_token?: string;
    device_type: 'ios' | 'android' | 'web';
    device_name: string;
    app_version: string;
  }): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_REGISTER_RETRIES; attempt++) {
      try {
        await notificationsAPI.registerDevice(deviceInfo);
        if (__DEV__) console.log('[Push] Device registered successfully');
        return true;
      } catch (error) {
        if (__DEV__) console.warn(`[Push] Device registration failed (attempt ${attempt + 1}/${MAX_REGISTER_RETRIES}):`, error);
        if (attempt < MAX_REGISTER_RETRIES - 1) {
          const delay = 2000 * Math.pow(2, attempt);
          if (__DEV__) console.log(`[Push] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    if (__DEV__) console.error('[Push] Device registration failed after all retries');
    return false;
  }

  /**
   * Register push token with backend
   *
   * Déduplication : si le token == lastRegisteredToken stocké, on skip l'API
   * call. `force=true` permet de forcer un re-register (utilisé par le refresh
   * périodique `refreshRegistrationIfStale`).
   */
  async registerTokenWithBackend(token: string, force = false): Promise<boolean> {
    if (!force) {
      try {
        const lastRegistered = await AsyncStorage.getItem(LAST_REGISTERED_TOKEN_KEY);
        if (lastRegistered === token) {
          if (__DEV__) console.log('[Push] Token already registered — skipping API call');
          return true;
        }
      } catch { /* ignore — on retombera sur l'API call */ }
    }

    // Récupère aussi le token natif FCM (Android) / APNs (iOS) si disponible.
    // Permet au backend d'envoyer via Firebase Admin SDK direct pour les
    // notifs riches en background. Optionnel — backend retombe sur Expo si
    // fcm_token absent.
    const fcmToken = await this.getNativeDeviceToken();

    const deviceInfo = {
      push_token: token,
      ...(fcmToken ? { fcm_token: fcmToken } : {}),
      device_type: Platform.OS as 'ios' | 'android' | 'web',
      device_name: Device.deviceName || `${Platform.OS} device`,
      app_version: '1.0.0',
    };

    const ok = await this.registerDeviceWithRetry(deviceInfo);
    if (ok) {
      try {
        await AsyncStorage.setItem(PUSH_REGISTERED_AT_KEY, String(Date.now()));
        await AsyncStorage.setItem(LAST_REGISTERED_TOKEN_KEY, token);
      } catch { /* ignore */ }
    }
    return ok;
  }

  /**
   * Re-register le device si l'enregistrement précédent date de plus de
   * PUSH_RE_REGISTER_INTERVAL_MS. Appelé depuis App.tsx sur AppState=active
   * pour rafraîchir l'enregistrement et éviter qu'un token expiré silencieusement
   * ne fasse rater des notifs critiques (paiements, check-in).
   *
   * No-op si l'utilisateur n'est pas authentifié (pas de token stocké).
   */
  async refreshRegistrationIfStale(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (!token) return;
      const lastStr = await AsyncStorage.getItem(PUSH_REGISTERED_AT_KEY);
      const last = lastStr ? Number(lastStr) : 0;
      if (Number.isFinite(last) && Date.now() - last < PUSH_RE_REGISTER_INTERVAL_MS) return;
      if (__DEV__) console.log('[Push] Token registration stale — refreshing');
      // force=true : bypass la dédup, on veut forcer le re-register après staleness.
      await this.registerTokenWithBackend(token, true);
    } catch (error) {
      if (__DEV__) console.warn('[Push] refreshRegistrationIfStale failed:', error);
    }
  }

  /**
   * Unregister device (on logout)
   * Note: This may fail if called after logout (401), which is fine
   */
  async unregisterDevice(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        // Try to unregister from backend (may fail if already logged out)
        try {
          await notificationsAPI.unregisterDevice(token);
        } catch (apiError) {
          // Ignore API errors (401 is expected if called after logout)
          if (__DEV__) console.log('[Push] Backend unregister skipped (user may be logged out)');
        }
        // Always clear local token + stale-check timestamp + dedup marker
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        await AsyncStorage.removeItem(PUSH_REGISTERED_AT_KEY);
        await AsyncStorage.removeItem(LAST_REGISTERED_TOKEN_KEY);
        if (__DEV__) console.log('[Push] Device unregistered locally');
      }
    } catch (error) {
      if (__DEV__) console.error('[Push] Error unregistering device:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        if (__DEV__) console.log('[Push] Notification received in foreground:', notification);

        // Si la notif a un style riche (data.style), on la rend nous-mêmes via
        // Notifee avec BigPictureStyle/MessagingStyle/etc. Le setNotificationHandler
        // a déjà désactivé l'affichage Expo natif pour ces cas.
        const data = notification.request.content.data as any;
        if (Platform.OS === 'android' && data?.style && data.style !== 'default') {
          try {
            const { displayRichNotification } = await import('./richNotificationRenderer');
            await displayRichNotification(
              notification.request.content.title || '',
              notification.request.content.body || '',
              data,
            );
          } catch (error) {
            if (__DEV__) console.warn('[Push] Rich render failed, fallback to native:', error);
          }
        }
      }
    );

    // Listener for notification interactions (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (__DEV__) console.log('[Push] Notification tapped:', response);
        // Marque cette réponse comme consommée pour éviter qu'au prochain cold
        // start `getLastNotificationResponseAsync()` la re-renvoie et qu'on
        // re-navigue (cf. NotificationContext.initializePushNotifications).
        const responseId = response.notification.request.identifier;
        if (responseId) {
          AsyncStorage.setItem(LAST_HANDLED_RESPONSE_ID_KEY, responseId).catch(() => {});
        }
        const data = response.notification.request.content.data as PushNotificationData;
        this.handleNotificationTap(data);
      }
    );
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationTap(data: PushNotificationData): void {
    if (__DEV__) console.log('[Push] Handling notification tap with data:', data);

    if (this.navigationCallback) {
      this.navigationCallback(data);
    }
  }

  /**
   * Set navigation callback for handling notification taps
   */
  setNavigationCallback(callback: (data: PushNotificationData) => void): void {
    this.navigationCallback = callback;
  }

  /**
   * Get last notification response (for handling app opened from notification)
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
    triggerSeconds?: number
  ): Promise<string> {
    const trigger: Notifications.NotificationTriggerInput = triggerSeconds
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds }
      : null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: (data || {}) as Record<string, unknown>,
        sound: 'default',
      },
      trigger,
    });

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
