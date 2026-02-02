// ============================================
// EventEz Mobile API Client
// Synchronisé avec les endpoints API du backend Django
// ============================================

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuration de base
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// Log de l'URL API pour le debug
console.log('[API] Base URL:', API_BASE_URL);

// Clés pour le stockage sécurisé
const ACCESS_TOKEN_KEY = 'eventez_access_token';
const REFRESH_TOKEN_KEY = 'eventez_refresh_token';

// Création de l'instance Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification et logger les requêtes
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération du token:', error);
    }
    // Log de la requête pour debug
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data && __DEV__) {
      // Ne pas logger les mots de passe
      const safeData = { ...config.data };
      if (safeData.password) safeData.password = '***';
      if (safeData.confirm_password) safeData.confirm_password = '***';
      console.log('[API] Request data:', JSON.stringify(safeData));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variable pour éviter les boucles infinies de rafraîchissement
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  config: any;
}> = [];

// Fonction pour traiter la file d'attente des requêtes échouées
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      resolve(api(config));
    } else {
      reject(error);
    }
  });
  failedQueue = [];
};

// Intercepteur pour gérer le refresh token et logger les erreurs
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] Response ${response.status} from ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log de l'erreur pour debug
    console.error(`[API] Error ${error.response?.status} from ${originalRequest?.url}`);
    if (error.response?.data && __DEV__) {
      console.error('[API] Error data:', JSON.stringify(error.response.data));
    }

    // Si l'erreur est 401 et qu'on n'a pas déjà réessayé
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }

          processQueue(null, access);
          isRefreshing = false;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Supprimer les tokens si le refresh échoue
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// TOKEN MANAGEMENT FUNCTIONS
// ============================================

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export const getAccessToken = async () => {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async () => {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export default api;

// ============================================
// AUTHENTICATION API
// ============================================

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/token/', { email, password }),

  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => api.post('/register/', data),

  registerOrganizer: (data: any) =>
    api.post('/register/organizer/', data),

  refreshToken: (refreshToken: string) =>
    api.post('/token/refresh/', { refresh: refreshToken }),

  requestPasswordReset: (email: string) =>
    api.post('/auth/password-reset/request/', { email }),

  validateResetToken: (token: string) =>
    api.get(`/auth/password-reset/validate/${token}/`),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/password-reset/confirm/', { token, password }),

  logout: async () => {
    try {
      await api.post('/logout/');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      await clearTokens();
    }
  },
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  // CRUD de base
  getUsers: (params?: any) =>
    api.get('/users/', { params }),

  getUser: (id: string) =>
    api.get(`/users/${id}/`),

  // Utilisateur courant
  getCurrentUser: () =>
    api.get('/users/me/'),

  updateCurrentUser: (data: any) =>
    api.patch('/users/me/', data),

  updateProfile: (data: any) =>
    api.patch('/users/update_profile/', data),

  updateProfileImage: (formData: FormData) =>
    api.patch('/users/me/upload_profile_image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getUserSettings: () =>
    api.get('/users/me/settings/'),

  updateUserSettings: (settings: any) =>
    api.put('/users/me/settings/', settings),

  deleteAccount: (data: { password: string; reason?: string }) =>
    api.post('/users/me/delete_account/', data),

  // Organisateurs
  getOrganizers: (params?: any) =>
    api.get('/users/organizers/', { params }),

  becomeOrganizer: (data?: {
    organizer_type: 'individual' | 'organization';
    company_name?: string;
    registration_number?: string;
    phone?: string;
  }) => api.post('/users/become_organizer/', data || {}),

  // Authentification & Sécurité
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/users/change_password/', data),

  // Notifications
  updateNotificationSettings: (data: any) =>
    api.patch('/users/notification_settings/', data),

  // Analytics
  getUserAnalytics: () =>
    api.get('/users/analytics/'),

  // Admin/Modérateur: Création d'utilisateurs
  createUser: (data: any) =>
    api.post('/users/create_user/', data),

  // Admin/Modérateur: Vérification de profils
  getPendingVerification: () =>
    api.get('/users/pending_verification/'),

  verifyProfile: (id: string, data?: { verified_status?: boolean; note?: string }) =>
    api.post(`/users/${id}/verify_profile/`, data || {}),

  rejectProfile: (id: string, data: { reason: string }) =>
    api.post(`/users/${id}/reject_profile/`, data),
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
    api.post(`/categories/${id}/upload_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadDefaultEventImage: (id: number, formData: FormData) =>
    api.post(`/categories/${id}/upload_default_event_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

// ============================================
// EVENTS API
// ============================================

export const eventsAPI = {
  getEvents: (params?: any) =>
    api.get('/events/', { params }),

  getEvent: (id: string) =>
    api.get(`/events/${id}/`),

  createEvent: (data: any) =>
    api.post('/events/', data),

  updateEvent: (id: string, data: any) => {
    if (data instanceof FormData) {
      return api.patch(`/events/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
    api.post(`/events/${id}/upload_images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  publishEvent: (id: string) =>
    api.post(`/events/${id}/publish/`),

  cancelEvent: (id: string, reason: string) =>
    api.post(`/events/${id}/cancel/`, { reason }),

  duplicateEvent: (id: string) =>
    api.post(`/events/${id}/duplicate/`),

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
// TICKET TYPES API
// ============================================

export const ticketTypesAPI = {
  getTicketTypes: (params?: any) =>
    api.get('/ticket-types/', { params }),

  getTicketType: (id: string) =>
    api.get(`/ticket-types/${id}/`),

  createTicketType: (data: any) =>
    api.post('/ticket-types/', data),

  updateTicketType: (id: string, data: any) =>
    api.put(`/ticket-types/${id}/`, data),

  patchTicketType: (id: string, data: any) =>
    api.patch(`/ticket-types/${id}/`, data),

  deleteTicketType: (id: string) =>
    api.delete(`/ticket-types/${id}/`),
};

// ============================================
// TICKET PURCHASES API
// ============================================

export const ticketPurchasesAPI = {
  getTicketPurchases: (params?: any) =>
    api.get('/ticket-purchases/', { params }),

  getTicketPurchase: (id: string) =>
    api.get(`/ticket-purchases/${id}/`),

  createTicketPurchase: (data: any) =>
    api.post('/ticket-purchases/', data),

  updateTicketPurchase: (id: string, data: any) =>
    api.put(`/ticket-purchases/${id}/`, data),

  checkIn: (id: string) =>
    api.post(`/ticket-purchases/${id}/check_in/`),

  getMyTickets: () =>
    api.get('/ticket-purchases/'),
};

// Alias for backward compatibility
export const ticketsAPI = ticketPurchasesAPI;

// ============================================
// DISCOUNTS API
// ============================================

export const discountsAPI = {
  // CRUD de base
  getDiscounts: (params?: any) =>
    api.get('/discounts/', { params }),

  getDiscount: (id: string) =>
    api.get(`/discounts/${id}/`),

  createDiscount: (data: any) =>
    api.post('/discounts/', data),

  updateDiscount: (id: string, data: any) =>
    api.put(`/discounts/${id}/`, data),

  patchDiscount: (id: string, data: any) =>
    api.patch(`/discounts/${id}/`, data),

  deleteDiscount: (id: string) =>
    api.delete(`/discounts/${id}/`),

  // Validation de code promo
  validateDiscount: (code: string, eventId: string, ticketTypeId?: string) =>
    api.post('/discounts/validate/', {
      code,
      event: eventId,
      ticket_type: ticketTypeId
    }),
};

// ============================================
// REGISTRATIONS API
// ============================================

export const registrationsAPI = {
  // CRUD de base
  getRegistrations: (params?: any) =>
    api.get('/registrations/', { params }),

  getRegistration: (id: string) =>
    api.get(`/registrations/${id}/`),

  createRegistration: (data: any) =>
    api.post('/registrations/', data),

  updateRegistration: (id: string, data: any) =>
    api.put(`/registrations/${id}/`, data),

  patchRegistration: (id: string, data: any) =>
    api.patch(`/registrations/${id}/`, data),

  deleteRegistration: (id: string) =>
    api.delete(`/registrations/${id}/`),

  // Mes inscriptions
  getMyRegistrations: () =>
    api.get('/registrations/my_registrations/'),

  // Recherche et filtres
  searchRegistrations: (params?: any) =>
    api.get('/registrations/search/', { params }),

  getByUser: (params?: { user_id?: string }) =>
    api.get('/registrations/by_user/', { params }),

  // QR Codes et billets
  generateQrCodes: (id: string) =>
    api.post(`/registrations/${id}/generate_qr_codes/`),

  bulkGenerateTickets: (registrationIds: string[]) =>
    api.post('/registrations/bulk_generate_tickets/', { registration_ids: registrationIds }),

  // Validation et annulation
  validateRegistration: (id: string) =>
    api.post(`/registrations/${id}/validate/`),

  cancelRegistration: (id: string) =>
    api.post(`/registrations/${id}/cancel/`),

  // Check-in
  checkIn: (id: string) =>
    api.post(`/registrations/${id}/check_in/`),

  verifyTicket: (code: string) =>
    api.post('/registrations/verify_ticket/', { code }),

  verifyAndCheckIn: (code: string, autoCheckIn: boolean = true) =>
    api.post('/registrations/verify_and_check_in/', { code, auto_check_in: autoCheckIn }),

  bulkCheckIn: (registrationIds: string[]) =>
    api.post('/registrations/bulk_check_in/', { registration_ids: registrationIds }),

  // Statistiques
  getRegistrationStats: (eventId: string) =>
    api.get('/registrations/stats/', { params: { event_id: eventId } }),

  // Communication
  resendConfirmation: (registrationId: string) =>
    api.post(`/registrations/${registrationId}/resend_confirmation/`),

  sendEmail: (data: { registration_ids: string[]; subject: string; message: string }) =>
    api.post('/registrations/send_email/', data),

  // Export
  exportRegistrations: (params?: { event_id?: string; format?: 'csv' | 'xlsx' }) =>
    api.get('/registrations/export/', { params, responseType: 'blob' }),

  // Approbation par l'organisateur
  getPendingApproval: (params?: any) =>
    api.get('/registrations/pending_approval/', { params }),

  approveRegistration: (id: string, note?: string) =>
    api.post(`/registrations/${id}/approve/`, { note: note || '' }),

  rejectRegistration: (id: string, reason: string) =>
    api.post(`/registrations/${id}/reject/`, { reason }),

  bulkApprove: (registrationIds: string[], note?: string) =>
    api.post('/registrations/bulk_approve/', { registration_ids: registrationIds, note: note || '' }),

  bulkReject: (registrationIds: string[], reason: string) =>
    api.post('/registrations/bulk_reject/', { registration_ids: registrationIds, reason }),
};

// ============================================
// FEEDBACKS API
// ============================================

export const feedbacksAPI = {
  getFeedbacks: (params?: any) =>
    api.get('/feedbacks/', { params }),

  getFeedback: (id: string) =>
    api.get(`/feedbacks/${id}/`),

  createFeedback: (data: any) =>
    api.post('/feedbacks/', data),

  updateFeedback: (id: string, data: any) =>
    api.put(`/feedbacks/${id}/`, data),

  deleteFeedback: (id: string) =>
    api.delete(`/feedbacks/${id}/`),

  getMyFeedback: () =>
    api.get('/feedbacks/my_feedback/'),

  getEventFeedbacks: (eventId: string) =>
    api.get('/feedbacks/', { params: { event: eventId } }),
};

// ============================================
// FLAGS API (Reports)
// ============================================

export const flagsAPI = {
  getFlags: (params?: any) =>
    api.get('/flags/', { params }),

  getFlag: (id: string) =>
    api.get(`/flags/${id}/`),

  createFlag: (data: any) =>
    api.post('/flags/', data),

  resolveFlag: (id: string, resolutionData: any) =>
    api.post(`/flags/${id}/resolve/`, resolutionData),

  getUnresolvedFlags: () =>
    api.get('/flags/unresolved/'),
};

// ============================================
// VALIDATIONS API
// ============================================

export const validationsAPI = {
  getValidations: (params?: any) =>
    api.get('/validations/', { params }),

  getValidation: (id: string) =>
    api.get(`/validations/${id}/`),

  createValidation: (data: any) =>
    api.post('/validations/', data),

  updateValidation: (id: string, data: any) =>
    api.put(`/validations/${id}/`, data),

  getEventStats: (eventId: string) =>
    api.get('/validations/event_stats/', { params: { event: eventId } }),
};

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

// ============================================
// SESSIONS API (Agenda)
// ============================================

export const sessionsAPI = {
  // CRUD de base
  getSessions: (params?: any) =>
    api.get('/sessions/', { params }),

  getSession: (id: string) =>
    api.get(`/sessions/${id}/`),

  createSession: (data: any) =>
    api.post('/sessions/', data),

  updateSession: (id: string, data: any) =>
    api.put(`/sessions/${id}/`, data),

  deleteSession: (id: string) =>
    api.delete(`/sessions/${id}/`),

  // Calendrier et mes sessions
  getCalendar: (params?: any) =>
    api.get('/sessions/calendar/', { params }),

  getMySessions: () =>
    api.get('/sessions/my_sessions/'),

  // Inscription aux sessions
  registerToSession: (id: string) =>
    api.post(`/sessions/${id}/register/`),

  unregisterFromSession: (id: string) =>
    api.post(`/sessions/${id}/unregister/`),

  // Présence
  markAttended: (id: string, data?: { user_id?: string }) =>
    api.post(`/sessions/${id}/mark_attended/`, data || {}),

  // Participants
  getAttendees: (id: string) =>
    api.get(`/sessions/${id}/attendees/`),

  // Statistiques
  getStatistics: (id: string) =>
    api.get(`/sessions/${id}/statistics/`),

  // Ressources
  addResource: (id: string, resourceData: any) =>
    api.post(`/sessions/${id}/add_resource/`, resourceData),

  // Liste d'attente session
  joinWaitlist: (id: string) =>
    api.post(`/sessions/${id}/join_waitlist/`),

  getWaitlistStatus: (id: string) =>
    api.get(`/sessions/${id}/waitlist_status/`),

  leaveWaitlist: (id: string) =>
    api.post(`/sessions/${id}/leave_waitlist/`),
};

// ============================================
// SESSION REGISTRATIONS API
// ============================================

export const sessionRegistrationsAPI = {
  getSessionRegistrations: (params?: any) =>
    api.get('/session-registrations/', { params }),

  getSessionRegistration: (id: string) =>
    api.get(`/session-registrations/${id}/`),

  createSessionRegistration: (data: any) =>
    api.post('/session-registrations/', data),

  updateSessionRegistration: (id: string, data: any) =>
    api.put(`/session-registrations/${id}/`, data),

  deleteSessionRegistration: (id: string) =>
    api.delete(`/session-registrations/${id}/`),
};

// ============================================
// SESSION RESOURCES API
// ============================================

export const sessionResourcesAPI = {
  getSessionResources: (params?: any) =>
    api.get('/session-resources/', { params }),

  getSessionResource: (id: string) =>
    api.get(`/session-resources/${id}/`),

  createSessionResource: (data: any) =>
    api.post('/session-resources/', data),

  updateSessionResource: (id: string, data: any) =>
    api.put(`/session-resources/${id}/`, data),

  deleteSessionResource: (id: string) =>
    api.delete(`/session-resources/${id}/`),

  downloadResource: (id: string) =>
    api.post(`/session-resources/${id}/download/`),
};

// ============================================
// SPEAKERS API
// ============================================

export const speakersAPI = {
  // CRUD de base
  getSpeakers: (params?: any) =>
    api.get('/speakers/', { params }),

  getSpeaker: (id: string) =>
    api.get(`/speakers/${id}/`),

  createSpeaker: (data: any) =>
    api.post('/speakers/', data),

  updateSpeaker: (id: string, data: any) =>
    api.put(`/speakers/${id}/`, data),

  patchSpeaker: (id: string, data: any) =>
    api.patch(`/speakers/${id}/`, data),

  deleteSpeaker: (id: string) =>
    api.delete(`/speakers/${id}/`),

  // Sessions du speaker
  getSpeakerSessions: (id: string) =>
    api.get(`/speakers/${id}/sessions/`),

  // Upload photo
  uploadPhoto: (id: string, formData: FormData) =>
    api.patch(`/speakers/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ============================================
// TRACKS API
// ============================================

export const tracksAPI = {
  getTracks: (params?: any) =>
    api.get('/tracks/', { params }),

  getTrack: (id: string) =>
    api.get(`/tracks/${id}/`),

  createTrack: (data: any) =>
    api.post('/tracks/', data),

  updateTrack: (id: string, data: any) =>
    api.put(`/tracks/${id}/`, data),

  deleteTrack: (id: string) =>
    api.delete(`/tracks/${id}/`),
};

// ============================================
// WAITLIST API
// ============================================

export const waitlistAPI = {
  // CRUD de base
  getWaitlist: (params?: any) =>
    api.get('/waitlist/', { params }),

  getWaitlistEntry: (id: string) =>
    api.get(`/waitlist/${id}/`),

  // Rejoindre/Quitter la liste d'attente
  joinWaitlist: (data: { event: string; ticket_type?: string }) =>
    api.post('/waitlist/join/', data),

  cancelWaitlist: (id: string) =>
    api.post(`/waitlist/${id}/cancel/`),

  // Ma liste d'attente
  getMyWaitlist: () =>
    api.get('/waitlist/my_waitlist/'),

  // Notifications (organisateur)
  notifyEntry: (id: string) =>
    api.post(`/waitlist/${id}/notify/`),

  notifyBatch: (data: { event: string; count?: number }) =>
    api.post('/waitlist/notify_batch/', data),

  // Statistiques
  getStatistics: (eventId: string) =>
    api.get('/waitlist/statistics/', { params: { event: eventId } }),
};

// ============================================
// WAITLIST SETTINGS API
// ============================================

export const waitlistSettingsAPI = {
  getWaitlistSettings: (params?: any) =>
    api.get('/waitlist-settings/', { params }),

  getWaitlistSetting: (id: string) =>
    api.get(`/waitlist-settings/${id}/`),

  createWaitlistSetting: (data: any) =>
    api.post('/waitlist-settings/', data),

  updateWaitlistSetting: (id: string, data: any) =>
    api.put(`/waitlist-settings/${id}/`, data),

  deleteWaitlistSetting: (id: string) =>
    api.delete(`/waitlist-settings/${id}/`),
};

// ============================================
// PAYMENTS API
// ============================================

export const paymentsAPI = {
  getPayments: (params?: any) =>
    api.get('/payments/', { params }),

  getPayment: (id: string) =>
    api.get(`/payments/${id}/`),

  createPayment: (data: any) =>
    api.post('/payments/', data),

  updatePayment: (id: string, data: any) =>
    api.put(`/payments/${id}/`, data),

  initializePayment: (id: string) =>
    api.post(`/payments/${id}/initialize_payment/`),

  verifyPayment: (id: string) =>
    api.get(`/payments/${id}/verify_payment/`),

  processMtnMoney: (id: string, data?: { phone_number?: string }) =>
    api.post(`/payments/${id}/process_mtn_money/`, data || {}),

  processOrangeMoney: (id: string, data?: { phone_number?: string }) =>
    api.post(`/payments/${id}/process_orange_money/`, data || {}),

  getPaymentHistory: () =>
    api.get('/payments/'),

  calculateUsageFees: (id: string) =>
    api.post(`/payments/${id}/calculate_usage_fees/`),
};

// ============================================
// REFUNDS API
// ============================================

export const refundsAPI = {
  getRefunds: (params?: any) =>
    api.get('/refunds/', { params }),

  getRefund: (id: string) =>
    api.get(`/refunds/${id}/`),

  createRefund: (data: any) =>
    api.post('/refunds/', data),

  processRefund: (id: string, data?: any) =>
    api.post(`/refunds/${id}/process_refund/`, data || {}),
};

// ============================================
// INVOICES API
// ============================================

export const invoicesAPI = {
  getInvoices: (params?: any) =>
    api.get('/invoices/', { params }),

  getInvoice: (id: string) =>
    api.get(`/invoices/${id}/`),

  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/download_pdf/`, { responseType: 'blob' }),
};

// ============================================
// SUBSCRIPTIONS API
// ============================================

export const subscriptionsAPI = {
  getPlans: () =>
    api.get('/subscription-plans/'),

  getCurrentPlan: () =>
    api.get('/subscription-plans/current/'),

  getMySubscription: () =>
    api.get('/subscriptions/my_subscription/'),

  upgrade: (planId: string, billingCycle: 'monthly' | 'yearly') =>
    api.post('/subscriptions/upgrade/', { plan_id: planId, billing_cycle: billingCycle }),

  cancel: () =>
    api.post('/subscriptions/cancel/'),
};

// ============================================
// WALLET API
// ============================================

export const walletAPI = {
  getMyWallet: () =>
    api.get('/wallet/my_wallet/'),

  updateBankDetails: (data: {
    bank_name?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    mobile_money_number?: string;
    mobile_money_provider?: string;
  }) => api.patch('/wallet/update_bank_details/', data),

  getTransactions: (params?: any) =>
    api.get('/wallet/transactions/', { params }),

  getPendingEarnings: () =>
    api.get('/wallet/pending_earnings/'),

  getStats: () =>
    api.get('/wallet/stats/'),
};

// ============================================
// PAYOUTS API
// ============================================

export const payoutsAPI = {
  getPayouts: (params?: any) =>
    api.get('/payouts/', { params }),

  getPayout: (id: string) =>
    api.get(`/payouts/${id}/`),

  requestPayout: (data: {
    amount: number;
    payout_method: 'bank_transfer' | 'mtn_money' | 'orange_money';
  }) => api.post('/payouts/request_payout/', data),

  processPayout: (id: string, processData: any) =>
    api.post(`/payouts/${id}/process/`, processData),
};

// ============================================
// COMMISSIONS API
// ============================================

export const commissionsAPI = {
  getCommissions: (params?: any) =>
    api.get('/commissions/', { params }),

  calculate: (ticketPrice: number) =>
    api.post('/commissions/calculate/', { ticket_price: ticketPrice }),

  getStats: () =>
    api.get('/commissions/stats/'),
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsAPI = {
  // AnalyticsViewSet actions
  getDashboardSummary: (params?: any) =>
    api.get('/analytics/analytics/dashboard_summary/', { params }),

  getEventAnalytics: (params?: any) =>
    api.get('/analytics/analytics/events/', { params }),

  getEventRegistrations: (params?: any) =>
    api.get('/analytics/analytics/event_registrations/', { params }),

  predictAttendance: (params?: { event_id: string }) =>
    api.get('/analytics/analytics/predict_attendance/', { params }),

  getRegistrationAnalytics: (params?: any) =>
    api.get('/analytics/analytics/registrations/', { params }),

  getRevenueAnalytics: (params?: any) =>
    api.get('/analytics/analytics/revenue/', { params }),

  getUserAnalytics: (params?: any) =>
    api.get('/analytics/analytics/users/', { params }),

  // Dashboards
  getDashboards: (params?: any) =>
    api.get('/analytics/dashboards/', { params }),

  getDashboard: (id: string) =>
    api.get(`/analytics/dashboards/${id}/`),

  createDashboard: (data: any) =>
    api.post('/analytics/dashboards/', data),

  updateDashboard: (id: string, data: any) =>
    api.put(`/analytics/dashboards/${id}/`, data),

  deleteDashboard: (id: string) =>
    api.delete(`/analytics/dashboards/${id}/`),

  getDashboardWidgets: (id: string) =>
    api.get(`/analytics/dashboards/${id}/widgets/`),

  // Dashboard Widgets
  getWidgets: (params?: any) =>
    api.get('/analytics/dashboard-widgets/', { params }),

  getWidget: (id: string) =>
    api.get(`/analytics/dashboard-widgets/${id}/`),

  createWidget: (data: any) =>
    api.post('/analytics/dashboard-widgets/', data),

  updateWidget: (id: string, data: any) =>
    api.put(`/analytics/dashboard-widgets/${id}/`, data),

  deleteWidget: (id: string) =>
    api.delete(`/analytics/dashboard-widgets/${id}/`),

  // Reports
  getReports: (params?: any) =>
    api.get('/analytics/reports/', { params }),

  getReport: (id: string) =>
    api.get(`/analytics/reports/${id}/`),

  createReport: (data: any) =>
    api.post('/analytics/reports/', data),

  updateReport: (id: string, data: any) =>
    api.put(`/analytics/reports/${id}/`, data),

  deleteReport: (id: string) =>
    api.delete(`/analytics/reports/${id}/`),

  exportReport: (id: string, format: string) =>
    api.get(`/analytics/reports/${id}/export/`, { params: { format }, responseType: 'blob' }),

  generateReport: (data: any) =>
    api.post('/analytics/reports/generate/', data),
};

// ============================================
// MESSAGES API
// ============================================

export const messagesAPI = {
  getConversations: () =>
    api.get('/conversations/'),

  getConversation: (id: string) =>
    api.get(`/conversations/${id}/`),

  createConversation: (data: { participants?: string[]; participant_ids?: string[] }) =>
    api.post('/conversations/', data),

  updateConversation: (id: string, data: { is_archived?: boolean; is_starred?: boolean }) =>
    api.patch(`/conversations/${id}/`, data),

  deleteConversation: (id: string) =>
    api.delete(`/conversations/${id}/`),

  archiveConversation: (id: string) =>
    api.post(`/conversations/${id}/archive/`),

  starConversation: (id: string) =>
    api.post(`/conversations/${id}/star/`),

  addParticipant: (conversationId: string, userId: string) =>
    api.post(`/conversations/${conversationId}/add_participant/`, { user_id: userId }),

  getMessages: (params?: { conversation?: string }) =>
    api.get('/messages/', { params }),

  sendMessage: (data: { content: string; conversation?: string; reply_to?: string }) =>
    api.post('/messages/', data),

  updateMessage: (id: string, data: { content?: string; is_starred?: boolean }) =>
    api.patch(`/messages/${id}/`, data),

  deleteMessage: (id: string) =>
    api.delete(`/messages/${id}/`),

  markMessageAsRead: (id: string) =>
    api.post(`/messages/${id}/mark_as_read/`),

  markConversationAsRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/mark_as_read/`),

  starMessage: (id: string) =>
    api.post(`/messages/${id}/star/`),

  uploadAttachment: (formData: FormData) =>
    api.post('/messages/upload_attachment/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadVoiceMessage: (formData: FormData) =>
    api.post('/messages/upload_voice_message/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/add_reaction/`, { emoji }),

  removeReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/remove_reaction/`, { emoji }),

  forwardMessage: (data: { message_id: string; target_user_id: string }) =>
    api.post('/messages/forward_message/', data),

  // Messaging settings
  getUserMessagingSettings: () =>
    api.get('/user-messaging-settings/'),

  updateUserMessagingSettings: (settingsId: string, data: { messaging_enabled?: boolean; blocked_users?: string[] }) =>
    api.patch(`/user-messaging-settings/${settingsId}/`, data),

  blockUser: (userId: string) =>
    api.post('/user-messaging-settings/block_user/', { user_id: userId }),

  unblockUser: (userId: string) =>
    api.post('/user-messaging-settings/unblock_user/', { user_id: userId }),

  getBlockedUsers: () =>
    api.get('/user-messaging-settings/blocked_list/'),
};

// ============================================
// AUDIT API (Admin only)
// ============================================

export const auditAPI = {
  // CRUD de base (route: /api/audit/logs/)
  getLogs: (params?: any) =>
    api.get('/audit/logs/', { params }),

  getLog: (id: string) =>
    api.get(`/audit/logs/${id}/`),

  // Actions
  getStatistics: (params?: any) =>
    api.get('/audit/logs/statistics/', { params }),

  getRecentLogs: (params?: { limit?: number }) =>
    api.get('/audit/logs/recent/', { params }),
};
