// src/services/pushNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from '../api';
import { navigationRef } from '../navigation/navigationRef';
import { emitInAppToast } from '../contexts/InAppToastContext';

const PUSH_TOKEN_KEY = '@eventez_push_token';
const PUSH_REGISTERED_AT_KEY = '@eventez_push_registered_at';
// Dernier token effectivement enregistré côté backend. Utilisé pour skip
// l'API call si on tente de ré-enregistrer le même token (déduplication).
const LAST_REGISTERED_TOKEN_KEY = '@eventez_last_registered_token';
// File d'attente des tokens dont l'unregister backend a échoué (réseau down
// au logout). Au prochain boot, on retente — sinon le device continue de
// recevoir les notifs de l'ex-user.
const PENDING_UNREGISTER_TOKENS_KEY = '@eventez_pending_unregister_tokens';
// Cap pour éviter l'accumulation infinie si le backend reste offline.
const MAX_PENDING_UNREGISTER_TOKENS = 10;
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
// Tap notif reçu avant que la nav (ou le callback) soit prêt → on stocke la
// data ici pour la rejouer dès que `setNavigationCallback` est appelé.
const PENDING_TAP_DATA_KEY = '@eventez_pending_tap_data';
// Flag posé après MAX_REGISTER_RETRIES échecs de registerTokenWithBackend.
// Au prochain initialize(), on retente et on clear si OK.
const PUSH_REGISTER_FAILED_KEY = '@eventez_push_register_failed';

// Get project ID from app config
const getProjectId = (): string => {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? '';
};

// Configure how notifications are handled when app is in foreground.
// Quand une notif arrive et que l'app est ouverte :
//   - Si la notif a un style riche (data.style !== 'default') sur Android,
//     on masque la version Expo native — Notifee prend le relais avec un
//     layout riche (BigPictureStyle / MessagingStyle) via le listener
//     addNotificationReceivedListener (cf. setupListeners()).
//   - Si l'utilisateur est DÉJÀ sur la conversation correspondante pour une
//     notif "new_message", on supprime tout (pas de banner, pas de son) :
//     le user voit déjà le message en temps réel via WebSocket.
//   - Sinon : banner + son + badge (heads-up sur Android avec channel HIGH).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isAndroid = Platform.OS === 'android';
    const data = (notification.request.content.data ?? {}) as any;

    // Cas 1 : notif rich-styled sur Android → Notifee va la rendre, masquer Expo
    const hasRichStyle = isAndroid && data?.style && data.style !== 'default';
    if (hasRichStyle) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      };
    }

    // Cas 2 : message dans la conversation actuellement ouverte → silence total.
    // Le user voit déjà le message via le WebSocket de ConversationScreen.
    const isMessage =
      data?.notification_type === 'new_message' || data?.style === 'messaging';
    if (isMessage) {
      try {
        const route = navigationRef.current?.getCurrentRoute();
        const onSameConv =
          route?.name === 'Conversation' &&
          String((route.params as any)?.conversationId) === String(data.conversation_id);
        if (onSameConv) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          };
        }
      } catch {
        // Si navigationRef n'est pas prêt, on tombe sur le cas général.
      }
    }

    // Cas général : banner + son + badge (heads-up grâce au channel HIGH)
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

// Fenêtre pendant laquelle un toast in-app est suppressé après un tap notif :
// si l'user tap une notif, le responseListener déclenche la nav ; le
// notificationListener (foreground) peut tirer presque simultanément et
// afficher un toast alors qu'on est déjà en train de naviguer.
const TAP_TOAST_SUPPRESS_WINDOW_MS = 500;

class PushNotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private navigationCallback: ((data: PushNotificationData) => void) | null = null;
  // Timestamp du dernier tap notif consommé. Utilisé pour skip le toast
  // in-app si un tap vient juste de déclencher une navigation (cf.
  // TAP_TOAST_SUPPRESS_WINDOW_MS).
  private _lastTapTimestamp = 0;

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

    // Tente de retirer côté backend les tokens dont le unregister précédent
    // avait échoué (réseau down au logout). No-op s'il n'y en a aucun.
    // Fire-and-forget : on ne bloque pas l'init pour ça.
    this.flushPendingUnregisters().catch(() => {});

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
        // Si on a un flag d'échec persistant, force le re-register pour
        // tenter de recovery — bypass la dédup du LAST_REGISTERED_TOKEN_KEY.
        let force = false;
        try {
          const failed = await AsyncStorage.getItem(PUSH_REGISTER_FAILED_KEY);
          if (failed === 'true') {
            if (__DEV__) console.log('[Push] Previous register failed — forcing retry');
            force = true;
          }
        } catch { /* ignore */ }

        const ok = await this.registerTokenWithBackend(token, force);
        try {
          if (ok) {
            await AsyncStorage.removeItem(PUSH_REGISTER_FAILED_KEY);
          } else {
            await AsyncStorage.setItem(PUSH_REGISTER_FAILED_KEY, 'true');
            if (__DEV__) console.warn('[Push] Register failed after all retries — flag set for next boot');
          }
        } catch { /* ignore */ }

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
   * Request notification permissions.
   *
   * Sur iOS, on tente d'abord `provisional` (silent permission qui n'affiche
   * pas le prompt système). Si accordé, l'app peut envoyer des notifs en
   * "Quiet" mode (livrées dans la liste mais pas en banner) — le user peut
   * les promote à full permission via les Settings ou la notif elle-même.
   * Si provisional indisponible, fallback sur le full prompt classique.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        if (Platform.OS === 'ios') {
          // Provisional first (iOS 12+) : pas de modal système, livraison en
          // Quiet mode. Permet d'envoyer des notifs sans rebuter le user.
          try {
            const provisional = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: false,
                allowBadge: true,
                allowSound: false,
                allowProvisional: true,
              },
            });
            const provGranted =
              provisional.granted ||
              provisional.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
              provisional.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
            if (provGranted) {
              finalStatus = provisional.status;
            }
          } catch (provErr) {
            if (__DEV__) console.warn('[Push] Provisional request failed, falling back:', provErr);
          }
        }

        // Fallback : full permission classique
        if (finalStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
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
    // HIGH importance = heads-up notification (apparaît en haut de l'écran
    // avec son+vibration) au lieu d'apparaître silencieusement dans le
    // notification center. Cohérent avec event_reminders et payments.
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Nouveaux messages et conversations',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
      enableVibrate: true,
    });

    // Channel pour les actions urgentes (paiement échoué, événement annulé,
    // remboursement, vérification urgente). Triple-beep distinctif + lightColor
    // rouge pour différencier visuellement des notifs informatives.
    await Notifications.setNotificationChannelAsync('urgent_actions', {
      name: 'Actions urgentes',
      description: 'Échecs de paiement, annulations, vérifications urgentes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 50, 100, 50, 100],
      lightColor: '#EF4444',
      sound: 'default',
      enableVibrate: true,
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
      // Vraie version de l'app (app.json) — jamais codée en dur, sinon le
      // backend croit toujours à 1.0.0 (fausse les stats + le ciblage version).
      app_version: Constants.expoConfig?.version || '',
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
   * Note: This may fail if called after logout (401), which is fine.
   *
   * Si l'API call échoue pour une autre raison (réseau down, 5xx), on
   * enqueue le token dans `PENDING_UNREGISTER_TOKENS_KEY` pour retenter au
   * prochain boot via `flushPendingUnregisters()`. Sinon le backend continue
   * de pousser des notifs vers ce device pour l'ex-user.
   */
  /**
   * Nettoyage local UNIQUEMENT (pas d'appel backend). A utiliser quand le
   * compte serveur est deja supprime et qu'un call /notifications/unregister-device/
   * retournerait inevitablement 401 user_not_found. Le PushDeviceToken backend
   * est nettoye par le signal post_delete sur User.
   */
  async unregisterLocal(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      await AsyncStorage.removeItem(PUSH_REGISTERED_AT_KEY);
      await AsyncStorage.removeItem(LAST_REGISTERED_TOKEN_KEY);
      await AsyncStorage.removeItem(PENDING_UNREGISTER_TOKENS_KEY);
      if (__DEV__) console.log('[Push] Local cleanup done (no backend call)');
    } catch (error) {
      if (__DEV__) console.warn('[Push] Local cleanup failed:', error);
    }
  }

  async unregisterDevice(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        let succeeded = false;
        try {
          await notificationsAPI.unregisterDevice(token);
          succeeded = true;
        } catch (apiError: any) {
          // 401 = user already logged out côté backend → token déjà invalide,
          // pas besoin de retry. Pour les autres erreurs (réseau, 5xx) on enqueue.
          const status = apiError?.response?.status;
          if (status === 401) {
            if (__DEV__) console.log('[Push] Backend unregister skipped (401, user logged out)');
            succeeded = true; // semantically OK : token invalide backend-side
          } else {
            if (__DEV__) console.warn('[Push] Backend unregister failed — enqueuing for retry:', apiError);
            await this.enqueuePendingUnregister(token);
          }
        }
        // Always clear local token + stale-check timestamp + dedup marker.
        // Le retry utilisera la queue PENDING_UNREGISTER_TOKENS_KEY.
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        await AsyncStorage.removeItem(PUSH_REGISTERED_AT_KEY);
        await AsyncStorage.removeItem(LAST_REGISTERED_TOKEN_KEY);
        if (__DEV__) console.log(`[Push] Device unregistered locally (backend ok=${succeeded})`);
      }
    } catch (error) {
      if (__DEV__) console.error('[Push] Error unregistering device:', error);
      // On NE re-throw pas : on ne veut pas bloquer le logout pour un
      // problème de unregister.
    }
  }

  /**
   * Ajoute un token à la queue de retry. Capée à MAX_PENDING_UNREGISTER_TOKENS
   * pour ne pas accumuler à l'infini si le backend reste offline.
   */
  private async enqueuePendingUnregister(token: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_UNREGISTER_TOKENS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      // Dédup : si le même token est déjà en queue, no-op.
      if (list.includes(token)) return;
      list.push(token);
      // Cap : on garde les N plus récents (FIFO eviction).
      const trimmed = list.slice(-MAX_PENDING_UNREGISTER_TOKENS);
      await AsyncStorage.setItem(PENDING_UNREGISTER_TOKENS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      if (__DEV__) console.warn('[Push] enqueuePendingUnregister failed:', error);
    }
  }

  /**
   * Tente de unregister tous les tokens en queue. Les succès sont retirés
   * de la liste, les échecs y restent pour le prochain boot. Appelé depuis
   * `initialize()` au démarrage.
   */
  async flushPendingUnregisters(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_UNREGISTER_TOKENS_KEY);
      if (!raw) return;
      const list: string[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return;

      const remaining: string[] = [];
      for (const token of list) {
        try {
          await notificationsAPI.unregisterDevice(token);
          if (__DEV__) console.log('[Push] Pending unregister flushed for token:', token.substring(0, 20));
        } catch (apiError: any) {
          const status = apiError?.response?.status;
          if (status === 401 || status === 404) {
            // Backend a déjà invalidé le token → succès logique, on retire.
            if (__DEV__) console.log('[Push] Pending token already invalid backend-side, dropping');
          } else {
            // Réseau down ou 5xx → on garde pour le prochain boot.
            remaining.push(token);
          }
        }
      }

      if (remaining.length === 0) {
        await AsyncStorage.removeItem(PENDING_UNREGISTER_TOKENS_KEY);
      } else {
        await AsyncStorage.setItem(PENDING_UNREGISTER_TOKENS_KEY, JSON.stringify(remaining));
      }
    } catch (error) {
      if (__DEV__) console.warn('[Push] flushPendingUnregisters failed:', error);
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

        const data = notification.request.content.data as any;
        const title = notification.request.content.title || '';
        const body = notification.request.content.body || '';

        // Si la notif a un style riche (data.style), on la rend nous-mêmes via
        // Notifee avec BigPictureStyle/MessagingStyle/etc. Le setNotificationHandler
        // a déjà désactivé l'affichage Expo natif pour ces cas.
        if (Platform.OS === 'android' && data?.style && data.style !== 'default') {
          try {
            const { displayRichNotification } = await import('./richNotificationRenderer');
            await displayRichNotification(title, body, data);
          } catch (error) {
            if (__DEV__) console.warn('[Push] Rich render failed, fallback to native:', error);
          }
        }

        // ============= TOAST IN-APP =============
        // Quand l'app est en foreground, l'OS n'affiche pas de banner par défaut
        // (cf. setNotificationHandler qui retourne shouldShowBanner: false pour
        // le cas spécifique "user sur la conversation active"). On émet ici un
        // toast in-app pour la visibilité — sauf si l'user voit déjà la conv
        // (mêmes critères que le handler).
        //
        // Suppress si un tap vient de déclencher une navigation : sinon le
        // toast apparaît brièvement alors qu'on est déjà en train de naviguer.
        if (Date.now() - this._lastTapTimestamp < TAP_TOAST_SUPPRESS_WINDOW_MS) {
          if (__DEV__) console.log('[Push] In-app toast suppressed (recent tap)');
          return;
        }
        try {
          const route = navigationRef.current?.getCurrentRoute();
          const isMessage = data?.notification_type === 'new_message' ||
                            data?.style === 'messaging';
          const onSameConv = isMessage &&
            route?.name === 'Conversation' &&
            String((route.params as any)?.conversationId) === String(data?.conversation_id);

          if (!onSameConv && (title || body)) {
            // Determine icon + dedup key + onPress depending on notif type.
            let icon: 'message' | 'notification' | 'success' | 'warning' | 'info' = 'notification';
            let dedupKey: string | undefined;
            const onPress = () => {
              this.handleNotificationTap(data as PushNotificationData);
            };

            if (isMessage) {
              icon = 'message';
              // Dedup par conversation : 5 messages en 2s = 1 seul toast.
              if (data?.conversation_id) {
                dedupKey = `msg:${data.conversation_id}`;
              }
            } else if (data?.notification_type === 'payment_success' ||
                       data?.notification_type === 'payment_completed') {
              icon = 'success';
            } else if (data?.notification_type === 'payment_failed' ||
                       data?.notification_type === 'error') {
              icon = 'warning';
            }

            emitInAppToast({
              title,
              body,
              icon,
              avatarUrl: data?.sender_avatar || data?.image || null,
              onPress,
              dedupKey,
            });
          }
        } catch (error) {
          if (__DEV__) console.warn('[Push] In-app toast emission failed:', error);
        }
      }
    );

    // Listener for notification interactions (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        if (__DEV__) console.log('[Push] Notification tapped:', response);
        // Marque cette réponse comme consommée AVANT de naviguer : si l'app
        // crash entre persist et nav, on ne veut pas re-naviguer au reboot
        // depuis getLastNotificationResponseAsync(). Awaited pour éviter le
        // fire-and-forget — sans ça, un cold start juste après pourrait lire
        // l'ancienne valeur.
        const responseId = response.notification.request.identifier;
        if (responseId) {
          try {
            await AsyncStorage.setItem(LAST_HANDLED_RESPONSE_ID_KEY, responseId);
          } catch {
            // ignore — au pire on re-navigue une fois au prochain cold start
          }
        }
        const data = response.notification.request.content.data as PushNotificationData;
        this.handleNotificationTap(data);
      }
    );
  }

  /**
   * Handle notification tap - navigate to relevant screen.
   *
   * Si callback ou nav pas prêts (race au cold start), on persiste la data
   * dans AsyncStorage. `setNavigationCallback` la rejouera dès qu'il est
   * appelé.
   */
  private handleNotificationTap(data: PushNotificationData): void {
    if (__DEV__) console.log('[Push] Handling notification tap with data:', data);

    // Marque le tap pour suppress un éventuel toast in-app en cours d'émission.
    this._lastTapTimestamp = Date.now();

    if (!this.navigationCallback || typeof this.navigationCallback !== 'function') {
      if (__DEV__) console.warn('[Push] navigationCallback not set, deferring tap');
      AsyncStorage.setItem(PENDING_TAP_DATA_KEY, JSON.stringify(data)).catch(() => {});
      return;
    }
    if (!navigationRef.current?.isReady?.()) {
      if (__DEV__) console.warn('[Push] navigation not ready, deferring tap');
      AsyncStorage.setItem(PENDING_TAP_DATA_KEY, JSON.stringify(data)).catch(() => {});
      return;
    }
    this.navigationCallback(data);
  }

  /**
   * Set navigation callback for handling notification taps.
   * Si une tap data était persistée (handleNotificationTap appelé avant que
   * le callback soit prêt), on la rejoue — sinon on perd la nav.
   */
  setNavigationCallback(callback: (data: PushNotificationData) => void): void {
    this.navigationCallback = callback;
    // Replay une tap data en attente, best-effort.
    AsyncStorage.getItem(PENDING_TAP_DATA_KEY)
      .then(async (raw) => {
        if (!raw) return;
        try {
          const data = JSON.parse(raw) as PushNotificationData;
          // Clear avant invocation pour éviter les doubles replays.
          await AsyncStorage.removeItem(PENDING_TAP_DATA_KEY);
          if (navigationRef.current?.isReady?.()) {
            callback(data);
          } else {
            // Nav pas encore prête → re-persiste pour le prochain cycle.
            await AsyncStorage.setItem(PENDING_TAP_DATA_KEY, raw);
          }
        } catch {
          await AsyncStorage.removeItem(PENDING_TAP_DATA_KEY).catch(() => {});
        }
      })
      .catch(() => {});
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
