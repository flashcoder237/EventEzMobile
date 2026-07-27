import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI, messagesAPI, invitationsAPI, ticketTransfersAPI, eventsAPI } from '../api';
import { useAuth } from './AuthContext';
import pushNotificationService, { PushNotificationData } from '../services/pushNotificationService';
import PushPermissionModal from '../components/common/PushPermissionModal';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import { navigationRef } from '../navigation/navigationRef';

const PUSH_PERMISSION_PROMPTED_KEY = '@eventez_push_permission_prompted';

// Whitelist des screens connus dans RootStackParamList (cf. src/types/index.ts).
// Si le backend pousse `data.screen` avec un nom inconnu (typo, screen retiré
// d'une version ancienne du client), on évite la nav.dispatch qui throw
// silencieusement et on retombe sur Notifications.
const KNOWN_NOTIF_NAV_SCREENS = new Set<string>([
  'Main', 'Onboarding',
  'Login', 'Register', 'RegisterOrganizer', 'ForgotPassword', 'ResetPassword',
  'VerifyEmail', 'VerifyEmailToken',
  'EventDetails', 'EventReviews', 'EventSearch',
  'TicketPurchase', 'Payment', 'PaymentSuccess', 'PaymentFailed',
  'QRCode', 'RegistrationDetails', 'PendingTransfers', 'OfflineTickets',
  'Profile', 'EditProfile', 'Settings', 'BlockedUsers',
  'Notifications', 'UserDashboard',
  'Messages', 'Conversation', 'NewConversation', 'MessageRequests',
  'Connections', 'ConnectionScanner',
  'Map',
  'EventCreate', 'EventEdit', 'MyEvents', 'EventAnalytics', 'EventRegistrations',
  'SessionDetails', 'SpeakerDetails', 'OrganizerProfile',
  'Wallet', 'PayoutRequest', 'Subscription',
  'QRScanner', 'Scan',
  'Terms', 'Privacy', 'Moderation', 'MyPayments',
  'RefundRequest', 'RefundsList', 'Drafts',
  'BecomeOrganizer', 'Verification', 'FollowingUsers',
  'Invitations', 'Referrals', 'Gamification',
  'LiveEvent', 'Volunteers',
  'DiscountManagement', 'DiscountForm',
  'EventSessionsLink', 'SponsorManagement',
  'Webhooks', 'Newsletters',
  'Dashboards', 'DashboardDetails',
  'SeatingPlans', 'SeatingPlanEditor',
  'Help', 'AnalyticsDashboard', 'Reports',
  'AdminDashboard', 'UserManagement', 'UserEdit',
  'SubscriptionManagement', 'AuditLogs', 'PlatformSettings',
  'AnnouncementsAdmin', 'AnnouncementForm', 'ClientReleaseAdmin',
  'AdminAds', 'AdminAdForm',
  'TreasuryOverview', 'TreasuryStaff', 'TreasuryExpenses',
  'TreasuryShareholders', 'TreasuryReports',
  'SystemStatus', 'Maintenance', 'IncidentDetails',
  'Browser',
]);
// ID de la dernière notification déjà consommée par `getLastNotificationResponse`.
// Sans ce garde-fou, expo-notifications renvoie indéfiniment la dernière notif
// tapée — y compris à chaque ouverture normale de l'app — et nous re-route
// vers Notifications à chaque cold start. Voir le commentaire détaillé
// au-dessus de la lecture (initializePushNotifications).
const LAST_HANDLED_RESPONSE_ID_KEY = '@eventez_last_handled_notif_response_id';
// Fix race condition cold start : si on tap une notif alors que l'app est
// fermée et qu'on n'est pas (encore) authentifié, on stocke la data de nav
// ici. Au prochain login successful, on lit la clé, navigue, et la clear.
const PENDING_NOTIF_NAV_KEY = '@eventez_pending_notif_nav';

/**
 * Attend que le NavigationContainer soit prêt (mounted + isReady()).
 * Au cold start via tap notif, on lit `getLastNotificationResponseAsync()`
 * tout de suite mais le container peut ne pas encore être ready → la
 * navigation rate silencieusement. Ce poll évite le `setTimeout(1000)`
 * arbitraire qui était fragile selon la perf de l'appareil.
 */
async function waitForNavigationReady(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (navigationRef.isReady?.() && navigationRef.current) {
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  pendingInvitationCount: number;
  pendingTransferCount: number;
  pendingModerationCount: number;
  /** Total items awaiting user action (notifs + messages + invitations + transfers) */
  totalPendingCount: number;
  loading: boolean;
  pushToken: string | null;
  pushEnabled: boolean;
  /**
   * True quand le WS notifications est OPEN. Permet à l'UI d'afficher une
   * banner "Notifications retardées" si false ET app en foreground.
   */
  isLiveConnected: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  initializePushNotifications: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  /**
   * Affiche le modal de permission push si l'utilisateur n'a jamais été
   * sollicité ET que la permission n'est pas déjà accordée. À appeler depuis
   * un contexte où l'utilisateur comprend le bénéfice (après follow event,
   * après inscription, après envoi 1er message, etc.). No-op sinon.
   */
  maybePromptForPushPermission: () => Promise<void>;
  /**
   * Ouvre les réglages système de l'app (deep link). Utile quand l'user a
   * denied la permission : on ne peut plus la re-demander programmatiquement,
   * on doit l'envoyer dans Settings → ses Notifications → Toggle.
   */
  openNotificationSettings: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface UnreadCountsContextType {
  unreadNotificationCount: number;
  unreadMessageCount: number;
  pendingInvitationCount: number;
  pendingTransferCount: number;
  pendingModerationCount: number;
  totalPendingCount: number;
}

const UnreadCountsContext = createContext<UnreadCountsContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);
  // Badge modérateur : events en attente de validation (0 pour les non-modérateurs).
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const appState = useRef(AppState.currentState);
  const navigation = useNavigation();

  // Badge d'app : reflète sur l'icône le total de notifications + messages non
  // lus (feel « pro », comme les grandes apps). Se met à 0 tout seul quand tout
  // est lu ou au logout (les compteurs retombent à 0). No-op si non supporté.
  useEffect(() => {
    const total = Math.max(0, unreadNotificationCount + unreadMessageCount);
    (async () => {
      try {
        const Notif = await import('expo-notifications');
        await Notif.setBadgeCountAsync(total);
      } catch {
        /* badge non supporté sur cet appareil → ignore */
      }
    })();
  }, [unreadNotificationCount, unreadMessageCount]);
  // Fix memory leak : timer pour la navigation differee apres tap notification.
  // Stocke dans un ref pour pouvoir clearTimeout au unmount ET avant chaque
  // nouveau timeout (sinon plusieurs timers peuvent s'accumuler si l'init
  // est rappelee).
  const notifNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref miroir d'`isAuthenticated` pour pouvoir lire la valeur la plus
  // fraîche depuis du code asynchrone (waitForNavigationReady) sans avoir
  // besoin de re-créer le callback à chaque changement.
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Handle notification tap navigation
  const handleNotificationNavigation = useCallback((data: PushNotificationData) => {
    if (__DEV__) console.log('[Notification] Handling navigation with data:', data);

    if (!navigation) {
      if (__DEV__) console.warn('[Notification] Navigation not available yet');
      return;
    }

    try {
      // Priority 1: explicit screen + params from backend.
      //
      // ⚠️ FCM/Expo Push n'acceptent que des strings dans `data` → un dict
      // Python passe par `str(dict)` ce qui donne `"{'conversationId': '157'}"`
      // (single quotes Python repr, pas du JSON). On detecte les deux formes :
      //   - object (WS) → utilise direct
      //   - string (push)→ tente JSON.parse en remplacant les single quotes
      //                    → fallback : skip le screen, retombe sur priority 2
      let resolvedParams: any = data.params;
      if (typeof resolvedParams === 'string') {
        try {
          resolvedParams = JSON.parse(resolvedParams.replace(/'/g, '"'));
        } catch {
          resolvedParams = null;
        }
      }

      if (data.screen && resolvedParams && typeof resolvedParams === 'object') {
        // Validation : si le backend envoie un screen inconnu (typo, ancienne
        // version du client), on log et on retombe sur Notifications. Évite
        // un dispatch qui throw silencieusement.
        if (!KNOWN_NOTIF_NAV_SCREENS.has(data.screen)) {
          if (__DEV__) console.warn('[Notification] Unknown screen, fallback to Notifications:', data.screen);
          navigation.dispatch(CommonActions.navigate({ name: 'Notifications' }));
          return;
        }
        navigation.dispatch(
          CommonActions.navigate({
            name: data.screen,
            params: resolvedParams,
          })
        );
      }
      // Priority 2: navigate based on data fields
      else if (data.event_id) {
        navigation.dispatch(
          CommonActions.navigate({ name: 'EventDetails', params: { eventId: data.event_id } })
        );
      } else if (data.registration_id) {
        navigation.dispatch(
          CommonActions.navigate({ name: 'MyTickets' })
        );
      } else if (data.ticket_id) {
        navigation.dispatch(
          CommonActions.navigate({ name: 'QRCode', params: { ticketId: data.ticket_id } })
        );
      } else if (data.conversation_id) {
        navigation.dispatch(
          CommonActions.navigate({ name: 'Conversation', params: { conversationId: data.conversation_id } })
        );
      }
      // Priority 3: use related_object fields from backend
      else if (data.related_object_type && data.related_object_id) {
        switch (data.related_object_type) {
          case 'event':
            navigation.dispatch(
              CommonActions.navigate({ name: 'EventDetails', params: { eventId: data.related_object_id } })
            );
            break;
          case 'registration':
            navigation.dispatch(
              CommonActions.navigate({ name: 'MyTickets' })
            );
            break;
          case 'ticket':
          case 'ticket_purchase':
            navigation.dispatch(
              CommonActions.navigate({ name: 'QRCode', params: { ticketId: data.related_object_id } })
            );
            break;
          case 'conversation':
          case 'message':
            navigation.dispatch(
              CommonActions.navigate({ name: 'Conversation', params: { conversationId: data.related_object_id } })
            );
            break;
          default:
            // Type inconnu côté client (probablement une nouvelle entité que
            // ce build ne connaît pas encore). On log explicitement et on
            // retombe sur Notifications pour ne pas perdre le tap.
            if (__DEV__) console.warn('[Notification] Unknown related_object_type, fallback to Notifications:', data.related_object_type);
            navigation.dispatch(CommonActions.navigate({ name: 'Notifications' }));
        }
      }
      // Priority 4: notification_id → mark read and go to notifications
      else if (data.notification_id) {
        // Catch : markNotificationAsRead throw maintenant en cas d'echec API,
        // on swallow ici car ce n'est pas critique pour la navigation.
        markNotificationAsRead(data.notification_id).catch(() => {});
        navigation.dispatch(CommonActions.navigate({ name: 'Notifications' }));
      }
      // Fallback: go to notifications screen
      else {
        navigation.dispatch(CommonActions.navigate({ name: 'Notifications' }));
      }
    } catch (error) {
      if (__DEV__) console.error('[Notification] Navigation error:', error);
      // Fallback: try simple navigate to Notifications
      try {
        navigation.dispatch(CommonActions.navigate({ name: 'Notifications' }));
      } catch {}
    }

    // Refresh counts after navigation
    fetchUnreadCounts();
  }, [navigation]);

  // Initialize push notifications
  const initializePushNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Set navigation callback
      pushNotificationService.setNavigationCallback(handleNotificationNavigation);

      // Initialize and get token
      const token = await pushNotificationService.initialize();

      if (token) {
        setPushToken(token);
        setPushEnabled(true);
        if (__DEV__) console.log('[Notification] Push notifications initialized with token:', token);
      }

      // Check if app was opened from a notification.
      //
      // ⚠️ Subtilité expo-notifications : `getLastNotificationResponseAsync()`
      // renvoie LA dernière réponse — et continue à la renvoyer à chaque appel,
      // y compris aux cold starts suivants où l'utilisateur n'a fait que
      // tapper l'icône de l'app. Sans dédoublonnage, on re-navigue vers
      // Notifications à CHAQUE ouverture de l'app après la première notif tapée.
      //
      // On stocke donc l'identifier déjà consommé et on saute si c'est le même.
      const lastResponse = await pushNotificationService.getLastNotificationResponse();
      if (lastResponse) {
        const responseId = lastResponse.notification.request.identifier;
        const consumedId = await AsyncStorage.getItem(LAST_HANDLED_RESPONSE_ID_KEY);
        if (responseId && responseId !== consumedId) {
          await AsyncStorage.setItem(LAST_HANDLED_RESPONSE_ID_KEY, responseId);
          const data = lastResponse.notification.request.content.data as PushNotificationData;
          // Fix race condition cold start : on attend que le navigationRef
          // soit prêt (poll) au lieu d'utiliser un setTimeout fixe. Si l'auth
          // n'est pas (encore) prête après que la nav le soit, on stocke la
          // data dans AsyncStorage pour rejouer la nav après login successful.
          const ready = await waitForNavigationReady();
          if (!ready) {
            if (__DEV__) console.warn('[Notification] Navigation not ready after timeout — persisting pending nav');
            try {
              await AsyncStorage.setItem(PENDING_NOTIF_NAV_KEY, JSON.stringify(data));
            } catch { /* ignore */ }
            return;
          }
          if (!isAuthenticatedRef.current) {
            // L'utilisateur n'est pas authentifié au moment du tap (cold start
            // sur app verrouillée). On persiste la nav pour la rejouer dès
            // que `isAuthenticated` repasse à true.
            if (__DEV__) console.log('[Notification] Not authenticated yet — persisting pending nav');
            try {
              await AsyncStorage.setItem(PENDING_NOTIF_NAV_KEY, JSON.stringify(data));
            } catch { /* ignore */ }
            return;
          }
          handleNotificationNavigation(data);
        } else if (__DEV__ && responseId === consumedId) {
          console.log('[Notification] Skipping already-consumed last response:', responseId);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('[Notification] Error initializing push notifications:', error);
    }
  }, [isAuthenticated, handleNotificationNavigation]);

  // Request push permission manually
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    const hasPermission = await pushNotificationService.requestPermissions();
    if (hasPermission) {
      await initializePushNotifications();
    }
    return hasPermission;
  }, [initializePushNotifications]);

  // Recovery quand permission denied : on ouvre les réglages système.
  // L'API native ne permet plus de re-prompter une fois denied — il faut
  // que l'user toggle manuellement dans Settings.
  const openNotificationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      if (__DEV__) console.warn('[Notification] openSettings failed:', error);
    }
  }, []);

  const fetchUnreadCounts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Fetch notification count
      const notifResponse = await notificationsAPI.getNotifications({ is_read: false, page_size: 1 });
      const notifCount = notifResponse.data?.count || 0;
      setUnreadNotificationCount(notifCount);

      // Update badge count for push notifications
      if (pushEnabled) {
        await pushNotificationService.setBadgeCount(notifCount);
      }

      // Fetch message count, invitations, transfers in parallel
      const [msgResult, invResult, transferResult] = await Promise.allSettled([
        messagesAPI.getConversations(),
        invitationsAPI.getMyInvitations(),
        ticketTransfersAPI.getPendingTransfers(),
      ]);

      // Messages
      if (msgResult.status === 'fulfilled') {
        const conversations = msgResult.value.data?.results || msgResult.value.data || [];
        const unreadMsgs = conversations.reduce((acc: number, conv: any) => {
          return acc + (conv.unread_count || 0);
        }, 0);
        setUnreadMessageCount(unreadMsgs);
      }

      // Pending invitations
      if (invResult.status === 'fulfilled') {
        const invitations = invResult.value.data?.results || invResult.value.data || [];
        const pending = Array.isArray(invitations)
          ? invitations.filter((inv: any) => inv.status === 'pending').length
          : 0;
        setPendingInvitationCount(pending);
      }

      // Pending ticket transfers
      if (transferResult.status === 'fulfilled') {
        const transfers = transferResult.value.data?.results || transferResult.value.data || [];
        setPendingTransferCount(Array.isArray(transfers) ? transfers.length : 0);
      }

      // Badge modération : uniquement pour les modérateurs/admins (l'endpoint
      // renvoie 0 aux autres, mais on évite l'appel inutile).
      const role = user?.role;
      const isModerator = role === 'moderator' || role === 'admin' || (user as any)?.is_staff;
      if (isModerator) {
        try {
          const modRes = await eventsAPI.getModerationPendingCount();
          setPendingModerationCount(modRes.data?.count || 0);
        } catch {
          /* silencieux : le badge modération reste à sa valeur précédente */
        }
      } else {
        setPendingModerationCount(0);
      }
    } catch (error) {
      if (__DEV__) console.error('Error fetching unread counts:', error);
    }
  }, [isAuthenticated, pushEnabled, user]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await notificationsAPI.getNotifications({ page_size: 20 });
      const notifs = response.data?.results || response.data || [];
      setNotifications(notifs);

      // Update unread count
      const unread = notifs.filter((n: Notification) => !n.is_read).length;
      setUnreadNotificationCount(unread);

      // Update badge
      if (pushEnabled) {
        await pushNotificationService.setBadgeCount(unread);
      }
    } catch (error) {
      if (__DEV__) console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, pushEnabled]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    // Fix badge desync : on appelle l'API D'ABORD, puis on décrémente le state
    // local seulement après confirmation. Sinon, si l'API échoue, le badge
    // diverge de la réalité backend (badge=0 mais backend=1 unread).
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      const newCount = Math.max(0, unreadNotificationCount - 1);
      setUnreadNotificationCount(newCount);

      // Update badge
      if (pushEnabled) {
        await pushNotificationService.setBadgeCount(newCount);
      }
    } catch (error) {
      if (__DEV__) console.error('[Notification] markAsRead failed:', error);
      // Re-throw pour que le caller puisse afficher un toast d'erreur si besoin.
      throw error;
    }
  }, [unreadNotificationCount, pushEnabled]);

  const markAllNotificationsAsRead = useCallback(async () => {
    // Fix badge desync : API d'abord, badge=0 après confirmation.
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);

      // Clear badge
      if (pushEnabled) {
        await pushNotificationService.setBadgeCount(0);
      }
    } catch (error) {
      if (__DEV__) console.error('[Notification] markAllAsRead failed:', error);
      throw error;
    }
  }, [pushEnabled]);

  const refreshCounts = useCallback(async () => {
    await fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Keep navigation callback in sync with latest handler
  useEffect(() => {
    pushNotificationService.setNavigationCallback(handleNotificationNavigation);
  }, [handleNotificationNavigation]);

  // Check if we should show push permission prompt
  const checkPushPermissionPrompt = useCallback(async () => {
    try {
      const prompted = await AsyncStorage.getItem(PUSH_PERMISSION_PROMPTED_KEY);
      if (prompted) return; // Already prompted before

      // Check if already granted
      const { status } = await (await import('expo-notifications')).getPermissionsAsync();
      if (status === 'granted') {
        await AsyncStorage.setItem(PUSH_PERMISSION_PROMPTED_KEY, 'true');
        return;
      }

      // Show our custom modal first
      setShowPermissionModal(true);
    } catch (error) {
      if (__DEV__) console.error('[Notification] Error checking push permission:', error);
    }
  }, []);

  /**
   * Wrapper public à appeler depuis un écran contextuel (après follow event,
   * inscription réussie, 1er message envoyé). Délègue à
   * `checkPushPermissionPrompt` qui a déjà la logique de dédup
   * (PUSH_PERMISSION_PROMPTED_KEY) → rejouable sans risque.
   */
  const maybePromptForPushPermission = useCallback(async () => {
    if (!isAuthenticated) return;
    await checkPushPermissionPrompt();
  }, [isAuthenticated, checkPushPermissionPrompt]);

  const handleAcceptPushPermission = useCallback(async () => {
    setShowPermissionModal(false);
    await AsyncStorage.setItem(PUSH_PERMISSION_PROMPTED_KEY, 'true');
    await initializePushNotifications();
  }, [initializePushNotifications]);

  const handleDeclinePushPermission = useCallback(async () => {
    setShowPermissionModal(false);
    await AsyncStorage.setItem(PUSH_PERMISSION_PROMPTED_KEY, 'true');
  }, []);

  // Fix race condition cold start : si l'utilisateur a tap une notif au cold
  // start mais n'était pas authentifié, on a stocké la data dans
  // PENDING_NOTIF_NAV_KEY. Quand `isAuthenticated` passe à true, on lit la
  // clé, attend que la nav soit prête, navigue, et clear.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_NOTIF_NAV_KEY);
        if (!raw || cancelled) return;
        const data = JSON.parse(raw) as PushNotificationData;
        const ready = await waitForNavigationReady();
        if (cancelled) return;
        if (ready) {
          handleNotificationNavigation(data);
        }
        // Clear même si la nav rate, pour ne pas re-trigger en boucle.
        await AsyncStorage.removeItem(PENDING_NOTIF_NAV_KEY);
      } catch (error) {
        if (__DEV__) console.warn('[Notification] Pending nav replay failed:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, handleNotificationNavigation]);

  // Initialize push notifications when authenticated
  useEffect(() => {
    // Fix memory leak : flag `active` pour ignorer les setState apres unmount
    // ou changement de `isAuthenticated`. L'IIFE async peut resoudre apres
    // que l'effet ait ete cleanup (logout rapide), ce qui declenche des
    // warnings "setState on unmounted component".
    let active = true;
    if (isAuthenticated) {
      // Init silencieux UNIQUEMENT si la permission est déjà accordée
      // (l'utilisateur a déjà accepté au préalable). Sinon on n'affiche
      // PLUS la modal au cold start — elle s'ouvre désormais via
      // `maybePromptForPushPermission()` depuis un écran contextuel
      // (après inscription event, follow, etc.) pour que l'utilisateur
      // comprenne le bénéfice avant d'accepter.
      (async () => {
        const Notif = await import('expo-notifications');
        if (!active) return;
        const { status } = await Notif.getPermissionsAsync();
        if (!active) return;
        if (status === 'granted') {
          initializePushNotifications();
        }
      })();
      fetchUnreadCounts();
    } else {
      // Cleanup on logout
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      setPendingInvitationCount(0);
      setPendingTransferCount(0);
      setPendingModerationCount(0);
      setPushToken(null);
      setPushEnabled(false);

      // Unregister device
      pushNotificationService.unregisterDevice();
      pushNotificationService.cleanup();
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // WebSocket temps-réel — coexiste avec le polling REST (filet de sécurité).
  // Le WS pousse les nouvelles notifs et synchronise le badge multi-device.
  // `wsConnected` est utilisé pour throttler le polling (cf. setInterval plus bas)
  // et pourra être exposé via context pour une banner "live"/"retardé".
  const { wsConnected } = useNotificationWebSocket({
    enabled: isAuthenticated,
    onNotificationNew: (notif) => {
      // Préfixer en début de liste, inc. compteur seulement si non lue.
      setNotifications((prev) => {
        // Dédup au cas où le polling l'a déjà chopée
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif as any, ...prev];
      });
      if (!notif.is_read) {
        setUnreadNotificationCount((prev) => prev + 1);
      }
    },
    onNotificationRead: (notifId, unreadCount) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
      );
      setUnreadNotificationCount(unreadCount);
    },
    onUnreadCountChanged: (count) => {
      // Multi-device mirror : un autre device a marqué tout/lu → on aligne
      // notre state local + badge OS sur la valeur autoritative du backend.
      setUnreadNotificationCount(count);
      pushNotificationService.setBadgeCount(count).catch(() => {});
    },
  });

  // Handle app state changes (refresh when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        // App came to foreground - refresh counts
        fetchUnreadCounts();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, fetchUnreadCounts]);

  // Periodic refresh of unread counts
  // Le polling est un filet de sécurité : si le WS est connecté, il pousse
  // déjà les updates en temps réel → on espace le polling à 5min. Sans WS
  // (réseau dégradé, backend down), on tombe à 60s pour rester réactif.
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalMs = wsConnected ? 5 * 60 * 1000 : 60 * 1000;

    // Fix memory leak : flag `cancelled` pour court-circuiter le callback
    // si l'effet a ete cleanup entre l'arm de l'interval et le tick.
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      fetchUnreadCounts();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, wsConnected, fetchUnreadCounts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Fix memory leak : clear le timer de navigation differee si on unmount
      // avant qu'il ne se declenche (cold start -> logout rapide).
      if (notifNavTimerRef.current) {
        clearTimeout(notifNavTimerRef.current);
        notifNavTimerRef.current = null;
      }
      pushNotificationService.cleanup();
    };
  }, []);

  // useMemo : stabilise la référence pour éviter de re-déclencher le useMemo `value`
  // quand un autre state du provider (loading, pushToken, etc.) change.
  const totalPendingCount = useMemo(
    () => unreadNotificationCount + unreadMessageCount + pendingInvitationCount + pendingTransferCount,
    [unreadNotificationCount, unreadMessageCount, pendingInvitationCount, pendingTransferCount],
  );

  const value = useMemo(() => ({
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
    pendingModerationCount,
    totalPendingCount,
    loading,
    pushToken,
    pushEnabled,
    isLiveConnected: wsConnected,
    fetchNotifications,
    fetchUnreadCounts,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshCounts,
    initializePushNotifications,
    requestPushPermission,
    maybePromptForPushPermission,
    openNotificationSettings,
  }), [
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
    pendingModerationCount,
    totalPendingCount,
    loading,
    pushToken,
    pushEnabled,
    wsConnected,
    fetchNotifications,
    fetchUnreadCounts,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    maybePromptForPushPermission,
    refreshCounts,
    initializePushNotifications,
    requestPushPermission,
    openNotificationSettings,
  ]);

  const countsValue = useMemo<UnreadCountsContextType>(() => ({
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
    pendingModerationCount,
    totalPendingCount,
  }), [
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
    pendingModerationCount,
    totalPendingCount,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      <UnreadCountsContext.Provider value={countsValue}>
        {children}
        <PushPermissionModal
          visible={showPermissionModal}
          onAccept={handleAcceptPushPermission}
          onDecline={handleDeclinePushPermission}
        />
      </UnreadCountsContext.Provider>
    </NotificationContext.Provider>
  );
}

export function useUnreadCounts() {
  const context = useContext(UnreadCountsContext);
  if (context === undefined) {
    throw new Error('useUnreadCounts must be used within a NotificationProvider');
  }
  return context;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
