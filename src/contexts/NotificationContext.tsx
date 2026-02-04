import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { notificationsAPI, messagesAPI } from '../api/client';
import { useAuth } from './AuthContext';
import pushNotificationService, { PushNotificationData } from '../services/pushNotificationService';

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
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef<any>(null);

  // Handle notification tap navigation
  const handleNotificationNavigation = useCallback((data: PushNotificationData) => {
    console.log('[Notification] Handling navigation with data:', data);

    // Navigate based on notification type
    if (data.event_id) {
      navigationRef.current?.navigate('EventDetails', { eventId: data.event_id });
    } else if (data.registration_id) {
      navigationRef.current?.navigate('MyTickets');
    } else if (data.ticket_id) {
      navigationRef.current?.navigate('QRCode', { ticketId: data.ticket_id });
    } else if (data.conversation_id) {
      navigationRef.current?.navigate('Messages', { conversationId: data.conversation_id });
    } else if (data.notification_id) {
      // Mark notification as read and go to notifications screen
      markNotificationAsRead(data.notification_id);
      navigationRef.current?.navigate('Notifications');
    } else {
      // Default: go to notifications screen
      navigationRef.current?.navigate('Notifications');
    }

    // Refresh counts after navigation
    fetchUnreadCounts();
  }, []);

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
        console.log('[Notification] Push notifications initialized with token:', token);
      }

      // Check if app was opened from a notification
      const lastResponse = await pushNotificationService.getLastNotificationResponse();
      if (lastResponse) {
        const data = lastResponse.notification.request.content.data as PushNotificationData;
        // Delay navigation to ensure navigation is ready
        setTimeout(() => handleNotificationNavigation(data), 1000);
      }
    } catch (error) {
      console.error('[Notification] Error initializing push notifications:', error);
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
        console.error('Error fetching message count:', error);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [isAuthenticated, pushEnabled]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await notificationsAPI.getNotifications({ page_size: 50 });
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
      console.error('Error fetching notifications:', error);
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
      console.error('Error marking notification as read:', error);
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
      console.error('Error marking all notifications as read:', error);
    }
  }, [pushEnabled]);

  const refreshCounts = useCallback(async () => {
    await fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializePushNotifications();
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

  return (
    <NotificationContext.Provider
      value={{
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
      }}
    >
      {children}
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
