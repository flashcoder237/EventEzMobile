// ============================================
// EventEz Mobile API — Events, Categories & Tags
// ============================================

import api from './instance';
import { fetchUpload } from './config';

// ============================================
// EVENTS API
// ============================================

export const eventsAPI = {
  getEvents: (params?: any) =>
    api.get('/events/', { params }),

  getEvent: (id: string) =>
    api.get(`/events/${id}/`),

  createEvent: (data: any) =>
    data instanceof FormData
      ? fetchUpload('POST', '/events/', data)
      : api.post('/events/', data),

  updateEvent: (id: string, data: any) => {
    if (data instanceof FormData) {
      return fetchUpload('PATCH', `/events/${id}/`, data);
    }
    return api.put(`/events/${id}/`, data);
  },

  patchEvent: (id: string, data: any) =>
    api.patch(`/events/${id}/`, data),

  deleteEvent: (id: string) =>
    api.delete(`/events/${id}/`),

  getFeaturedEvents: (params?: any) =>
    api.get('/events/featured/', { params }),

  getMyEvents: () =>
    api.get('/events/my_events/'),

  uploadImages: (id: string, formData: FormData) =>
    fetchUpload('POST', `/events/${id}/upload_images/`, formData),

  publishEvent: (id: string) =>
    api.post(`/events/${id}/publish/`),

  cancelEvent: (id: string, reason: string) =>
    api.post(`/events/${id}/cancel/`, { reason }),

  duplicateEvent: (id: string) =>
    api.post(`/events/${id}/duplicate/`),

  verifyAccessCode: (id: string, code: string) =>
    api.post(`/events/${id}/verify_access_code/`, { access_code: code }),

  submitForValidation: (id: string) =>
    api.post(`/events/${id}/submit_for_validation/`),

  validateEvent: (id: string) =>
    api.post(`/events/${id}/validate_event/`),

  rejectEvent: (id: string, reason: string) =>
    api.post(`/events/${id}/reject_event/`, { rejection_reason: reason }),

  getPendingValidation: () =>
    api.get('/events/pending_validation/'),

  // Event Following
  followEvent: (id: string, preferences?: {
    notification_preference?: 'all' | 'important' | 'none';
    notify_email?: boolean;
    notify_push?: boolean;
    notify_updates?: boolean;
    notify_reminders?: boolean;
    notify_cancellation?: boolean;
  }) => api.post(`/events/${id}/follow/`, preferences || {}),

  unfollowEvent: (id: string) =>
    api.post(`/events/${id}/unfollow/`),

  updateFollowPreferences: (id: string, preferences: any) =>
    api.patch(`/events/${id}/update_follow_preferences/`, preferences),

  isFollowing: (id: string) =>
    api.get(`/events/${id}/is_following/`),

  getFollowingEvents: () =>
    api.get('/events/following/'),

  getFollowersCount: (id: string) =>
    api.get(`/events/${id}/followers_count/`),

  getNearbyEvents: (lat: number, lng: number, radius?: number, limit?: number) => {
    const params: any = { lat, lng };
    if (radius) params.radius = radius;
    if (limit) params.limit = limit;
    return api.get('/events/nearby/', { params });
  },

  getMapEvents: (params?: { city?: string; category?: string }) =>
    api.get('/events/map_events/', { params }),

  searchEvents: (query: string) =>
    api.get('/events/', { params: { search: query } }),

  // Calendrier — returns text/calendar payload as ArrayBuffer (decode with TextDecoder)
  exportIcal: (id: string) =>
    api.get<ArrayBuffer>(`/events/${id}/export-ical/`, { responseType: 'arraybuffer' }),
  getGoogleCalendarLink: (id: string) =>
    api.get(`/events/${id}/google-calendar-link/`),

  // Récurrence
  createRecurrence: (id: string, data: any) =>
    api.post(`/events/${id}/create_recurrence/`, data),
  getInstances: (id: string, params?: any) =>
    api.get(`/events/${id}/instances/`, { params }),

  // Form Fields
  getFormFields: (eventId: string) =>
    api.get('/form-fields/', { params: { event: eventId } }),

  createFormField: (data: any) =>
    api.post('/form-fields/', data),

  updateFormField: (id: number, data: any) =>
    api.put(`/form-fields/${id}/`, data),

  deleteFormField: (id: number) =>
    api.delete(`/form-fields/${id}/`),

  updateFormFields: (id: string, fieldsData: any) =>
    api.post(`/events/${id}/update_form_fields/`, fieldsData),

  // Demande de mise en avant
  requestFeature: (id: string, data?: any) =>
    api.post(`/events/${id}/request_feature/`, data || {}),
};

// ============================================
// CATEGORIES API
// ============================================

export const categoriesAPI = {
  // CRUD de base
  getCategories: (params?: any) =>
    api.get('/categories/', { params }),

  getCategory: (id: number) =>
    api.get(`/categories/${id}/`),

  createCategory: (data: any) =>
    api.post('/categories/', data),

  updateCategory: (id: number, data: any) =>
    api.put(`/categories/${id}/`, data),

  deleteCategory: (id: number) =>
    api.delete(`/categories/${id}/`),

  // Actions
  getCategoryEvents: (id: number) =>
    api.get(`/categories/${id}/events/`),

  toggleActive: (id: number) =>
    api.post(`/categories/${id}/toggle_active/`),

  uploadImage: (id: number, formData: FormData) =>
    fetchUpload('POST', `/categories/${id}/upload_image/`, formData),

  uploadDefaultEventImage: (id: number, formData: FormData) =>
    fetchUpload('POST', `/categories/${id}/upload_default_event_image/`, formData),
};

// ============================================
// TAGS API
// ============================================

export const tagsAPI = {
  getTags: (params?: any) =>
    api.get('/tags/', { params }),

  getTag: (id: number) =>
    api.get(`/tags/${id}/`),
};
