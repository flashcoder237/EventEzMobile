// ============================================
// EventEz Mobile API — Notifications & Notification Templates
// ============================================

import api from './instance';

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsAPI = {
  // CRUD de base
  getNotifications: (params?: any) =>
    api.get('/notifications/', { params }),

  getNotification: (id: string) =>
    api.get(`/notifications/${id}/`),

  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}/`),

  // Lecture
  markAsRead: (id: string) =>
    api.post(`/notifications/${id}/mark_as_read/`),

  markAllAsRead: () =>
    api.post('/notifications/mark_all_as_read/'),

  // Suppression multiple
  deleteMultiple: (notificationIds: string[]) =>
    api.post('/notifications/delete_multiple/', { notification_ids: notificationIds }),

  // Envoi de notifications (organisateur/admin)
  sendNotification: (data: {
    user_ids?: string[];
    event_id?: string;
    title: string;
    message: string;
    notification_type?: string;
  }) => api.post('/notifications/send/', data),

  // Planification de notifications
  scheduleNotification: (data: {
    user_ids?: string[];
    event_id?: string;
    title: string;
    message: string;
    scheduled_time: string;
    notification_type?: string;
  }) => api.post('/notifications/schedule/', data),

  getScheduledNotifications: () =>
    api.get('/notifications/scheduled/'),

  cancelScheduledNotification: (id: string) =>
    api.post(`/notifications/${id}/cancel_scheduled/`),

  // Statistiques
  getNotificationStatistics: (params?: any) =>
    api.get('/notifications/statistics/', { params }),

  // Préférences
  updatePreferences: (data: any) =>
    api.patch('/notifications/preferences/', data),

  // Push Notifications - Device Registration
  registerDevice: (data: {
    push_token: string;
    device_type: 'ios' | 'android' | 'web';
    device_name?: string;
    app_version?: string;
  }) => api.post('/notifications/register-device/', data),

  unregisterDevice: (push_token: string) =>
    api.post('/notifications/unregister-device/', { push_token }),

  getDevices: () =>
    api.get('/notifications/devices/'),
};

// ============================================
// NOTIFICATION TEMPLATES API
// ============================================

export const notificationTemplatesAPI = {
  getTemplates: (params?: any) =>
    api.get('/notification-templates/', { params }),

  getTemplate: (id: string) =>
    api.get(`/notification-templates/${id}/`),

  createTemplate: (data: any) =>
    api.post('/notification-templates/', data),

  updateTemplate: (id: string, data: any) =>
    api.put(`/notification-templates/${id}/`, data),

  deleteTemplate: (id: string) =>
    api.delete(`/notification-templates/${id}/`),
};
