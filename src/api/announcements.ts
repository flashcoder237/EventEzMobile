// ============================================
// EventEz Mobile API — Announcements + Client Release
// ============================================
//
// `getActive` est l'endpoint public consommé par AnnouncementsContext.
// Les autres endpoints sont admin-only — alimentent l'écran de gestion
// AnnouncementsAdminScreen.

import api from './instance';

export interface AnnouncementAdminPayload {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  is_dismissible?: boolean;
  cta_label?: string;
  cta_url?: string;
  audience?: 'all' | 'users' | 'organizers' | 'admins';
  platform?: 'all' | 'mobile' | 'mobile_ios' | 'mobile_android' | 'web';
  target_min_app_version?: string;
  target_max_app_version?: string;
  valid_from?: string | null;
  valid_until?: string | null;
  is_published?: boolean;
}

export const announcementsAPI = {
  // Public — consommé par AnnouncementsContext
  getActive: () => api.get('/announcements/active/'),

  // Admin CRUD
  list: (params?: any) => api.get('/admin/announcements/', { params }),
  get: (id: string) => api.get(`/admin/announcements/${id}/`),
  create: (data: AnnouncementAdminPayload) => api.post('/admin/announcements/', data),
  update: (id: string, data: Partial<AnnouncementAdminPayload>) =>
    api.patch(`/admin/announcements/${id}/`, data),
  delete: (id: string) => api.delete(`/admin/announcements/${id}/`),
};

// ============================================
// Client release requirement (singleton)
// ============================================

export interface ClientReleasePayload {
  mobile_min_supported_version?: string;
  mobile_latest_version?: string;
  mobile_force_update_message?: string;
  ios_store_url?: string;
  android_store_url?: string;
}

export const clientReleaseAPI = {
  get: () => api.get('/admin/client-release-requirement/'),
  update: (data: ClientReleasePayload) =>
    api.patch('/admin/client-release-requirement/', data),
};
