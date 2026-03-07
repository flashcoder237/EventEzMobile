import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI, messagesAPI } from '../api/client';
import { useAuth } from './AuthContext';
import pushNotificationService, { PushNotificationData } from '../services/pushNotificationService';
import PushPermissionModal from '../components/common/PushPermissionModal';

const PUSH_PERMISSION_PROMPTED_KEY = '@eventez_push_permission_prompted';

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const appState = useRef(AppState.currentState);
  const navigation = useNavigation();

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

      // Check if app was opened from a notification
      const lastResponse = await pushNotificationService.getLastNotificationResponse();
      if (lastResponse) {
        const data = lastResponse.notification.request.content.data as PushNotificationData;
        // Delay navigation to ensure navigation is ready
        setTimeout(() => handleNotificationNavigation(data), 1000);
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

      // Fetch message count
      try {
        const msgResponse = await messagesAPI.getConversations();
        const conversations = msgResponse.data?.results || msgResponse.data || [];
        const unreadMsgs = conversations.reduce((acc: number, conv: any) => {
          return acc + (conv.unread_count || 0);
        }, 0);
        setUnreadMessageCount(unreadMsgs);
      } catch (error) {
        if (__DEV__) console.error('Error fetching message count:', error);
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
    if (isAuthenticated) {
      // Try to initialize silently if permission already granted, otherwise show modal
      (async () => {
        const Notif = await import('expo-notifications');
        const { status } = await Notif.getPermissionsAsync();
        if (status === 'granted') {
          initializePushNotifications();
        } else {
          checkPushPermissionPrompt();
        }
      })();
      fetchUnreadCounts();
    } else {
      // Cleanup on logout
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      setPushToken(null);
      setPushEnabled(false);

      // Unregister device
      pushNotificationService.unregisterDevice();
      pushNotificationService.cleanup();
    }
  }, [isAuthenticated]);

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

    const interval = setInterval(() => {
      fetchUnreadCounts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCounts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pushNotificationService.cleanup();
    };
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
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
  }), [
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
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
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <PushPermissionModal
        visible={showPermissionModal}
        onAccept={handleAcceptPushPermission}
        onDecline={handleDeclinePushPermission}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
