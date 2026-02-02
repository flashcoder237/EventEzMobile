import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notificationsAPI, messagesAPI } from '../api/client';
import { useAuth } from './AuthContext';

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
  fetchNotifications: () => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCounts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Fetch notification count
      const notifResponse = await notificationsAPI.getNotifications({ is_read: false, page_size: 1 });
      const notifCount = notifResponse.data?.count || 0;
      setUnreadNotificationCount(notifCount);

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
  }, [isAuthenticated]);

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
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    await fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCounts();
    } else {
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
    }
  }, [isAuthenticated, fetchUnreadCounts]);

  // Periodic refresh of unread counts
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchUnreadCounts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCounts]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadNotificationCount,
        unreadMessageCount,
        loading,
        fetchNotifications,
        fetchUnreadCounts,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshCounts,
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
