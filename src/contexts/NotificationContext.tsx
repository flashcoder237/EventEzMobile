import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI, messagesAPI, invitationsAPI, ticketTransfersAPI } from '../api';
import { useAuth } from './AuthContext';
import pushNotificationService, { PushNotificationData } from '../services/pushNotificationService';
import PushPermissionModal from '../components/common/PushPermissionModal';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';

const PUSH_PERMISSION_PROMPTED_KEY = '@eventez_push_permission_prompted';
// ID de la dernière notification déjà consommée par `getLastNotificationResponse`.
// Sans ce garde-fou, expo-notifications renvoie indéfiniment la dernière notif
// tapée — y compris à chaque ouverture normale de l'app — et nous re-route
// vers Notifications à chaque cold start. Voir le commentaire détaillé
// au-dessus de la lecture (initializePushNotifications).
const LAST_HANDLED_RESPONSE_ID_KEY = '@eventez_last_handled_notif_response_id';

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
  /** Total items awaiting user action (notifs + messages + invitations + transfers) */
  totalPendingCount: number;
  loading: boolean;
  pushToken: string | null;
  pushEnabled: boolean;
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface UnreadCountsContextType {
  unreadNotificationCount: number;
  unreadMessageCount: number;
  pendingInvitationCount: number;
  pendingTransferCount: number;
  totalPendingCount: number;
}

const UnreadCountsContext = createContext<UnreadCountsContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const appState = useRef(AppState.currentState);
  const navigation = useNavigation();
  // Fix memory leak : timer pour la navigation differee apres tap notification.
  // Stocke dans un ref pour pouvoir clearTimeout au unmount ET avant chaque
  // nouveau timeout (sinon plusieurs timers peuvent s'accumuler si l'init
  // est rappelee).
  const notifNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle notification tap navigation
  const handleNotificationNavigation = useCallback((data: PushNotificationData) => {
    if (__DEV__) console.log('[Notification] Handling navigation with data:', data);

    if (!navigation) {
      if (__DEV__) console.warn('[Notification] Navigation not available yet');
      return;
    }

    try {
      // Priority 1: explicit screen + params from backend
      if (data.screen && data.params) {
        navigation.dispatch(
          CommonActions.navigate({
            name: data.screen,
            params: data.params,
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
            navigation.dispatch(CommonActions.navigate({ name: 'Notifications' }));
        }
      }
      // Priority 4: notification_id → mark read and go to notifications
      else if (data.notification_id) {
        markNotificationAsRead(data.notification_id);
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
          // Delay navigation to ensure navigation is ready
          // Fix memory leak : on stocke le timer dans un ref et on clear le
          // precedent avant d'en armer un nouveau, pour eviter qu'un timer
          // orphelin ne s'execute apres unmount (warning React + navigation
          // sur un container demonte).
          if (notifNavTimerRef.current) {
            clearTimeout(notifNavTimerRef.current);
          }
          notifNavTimerRef.current = setTimeout(() => {
            notifNavTimerRef.current = null;
            handleNotificationNavigation(data);
          }, 1000);
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
    } catch (error) {
      if (__DEV__) console.error('Error fetching unread counts:', error);
    }
  }, [isAuthenticated, pushEnabled]);

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
      if (__DEV__) console.error('Error marking notification as read:', error);
    }
  }, [unreadNotificationCount, pushEnabled]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);

      // Clear badge
      if (pushEnabled) {
        await pushNotificationService.setBadgeCount(0);
      }
    } catch (error) {
      if (__DEV__) console.error('Error marking all notifications as read:', error);
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

  // WebSocket temps-réel — coexiste avec le polling 30s (filet de sécurité).
  // Le WS pousse les nouvelles notifs et synchronise le badge multi-device.
  useNotificationWebSocket({
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
      setUnreadNotificationCount(count);
      // Aligner aussi le badge OS
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
  useEffect(() => {
    if (!isAuthenticated) return;

    // Fix memory leak : flag `cancelled` pour court-circuiter le callback
    // si l'effet a ete cleanup entre l'arm de l'interval et le tick.
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      fetchUnreadCounts();
    }, 30000); // Refresh every 30 seconds

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, fetchUnreadCounts]);

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
    totalPendingCount,
    loading,
    pushToken,
    pushEnabled,
    fetchNotifications,
    fetchUnreadCounts,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshCounts,
    initializePushNotifications,
    requestPushPermission,
    maybePromptForPushPermission,
  }), [
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
    totalPendingCount,
    loading,
    pushToken,
    pushEnabled,
    fetchNotifications,
    fetchUnreadCounts,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    maybePromptForPushPermission,
    refreshCounts,
    initializePushNotifications,
    requestPushPermission,
  ]);

  const countsValue = useMemo<UnreadCountsContextType>(() => ({
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
    totalPendingCount,
  }), [
    unreadNotificationCount,
    unreadMessageCount,
    pendingInvitationCount,
    pendingTransferCount,
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
