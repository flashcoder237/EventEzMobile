import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuration de base
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

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

// Intercepteur pour ajouter le token d'authentification
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
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si l'erreur est 401 et qu'on n'a pas déjà réessayé
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

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

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Supprimer les tokens si le refresh échoue
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Fonctions utilitaires pour la gestion des tokens
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

export default api;

// API pour l'authentification
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/token/', { email, password }),

  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => api.post('/register/', data),

  refreshToken: (refreshToken: string) =>
    api.post('/token/refresh/', { refresh: refreshToken }),

  getCurrentUser: () => api.get('/users/me/'),

  updateProfile: (data: any) => api.patch('/users/me/', data),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/users/change-password/', data),

  forgotPassword: (email: string) =>
    api.post('/password-reset/', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    api.post('/password-reset/confirm/', data),
};

// API pour les événements
export const eventsAPI = {
  getEvents: (params?: any) => api.get('/events/', { params }),

  getEvent: (id: string) => api.get(`/events/${id}/`),

  getFeaturedEvents: () => api.get('/events/featured/'),

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

  followEvent: (id: string) => api.post(`/events/${id}/follow/`),

  unfollowEvent: (id: string) => api.post(`/events/${id}/unfollow/`),

  getMyEvents: () => api.get('/events/my_events/'),

  getFollowingEvents: () => api.get('/events/following/'),
};

// API pour les catégories
export const categoriesAPI = {
  getCategories: () => api.get('/categories/'),
  getCategory: (id: string) => api.get(`/categories/${id}/`),
};

// API pour les inscriptions
export const registrationsAPI = {
  getRegistrations: () => api.get('/registrations/'),

  getRegistration: (id: string) => api.get(`/registrations/${id}/`),

  createRegistration: (data: any) => api.post('/registrations/', data),

  cancelRegistration: (id: string) => api.post(`/registrations/${id}/cancel/`),

  getQRCode: (id: string) => api.get(`/registrations/${id}/qr_code/`),
};

// API pour les billets
export const ticketsAPI = {
  getTicketTypes: (eventId: string) =>
    api.get('/ticket-types/', { params: { event: eventId } }),

  purchaseTickets: (data: any) => api.post('/ticket-purchases/', data),

  getMyTickets: () => api.get('/ticket-purchases/'),

  getTicket: (id: string) => api.get(`/ticket-purchases/${id}/`),
};

// API pour les notifications
export const notificationsAPI = {
  getNotifications: (params?: any) => api.get('/notifications/', { params }),

  markAsRead: (id: string) => api.post(`/notifications/${id}/mark_read/`),

  markAllAsRead: () => api.post('/notifications/mark_all_read/'),

  getNotificationStatistics: () => api.get('/notifications/statistics/'),

  updatePreferences: (data: any) => api.patch('/notifications/preferences/', data),
};

// API pour les messages
export const messagesAPI = {
  getConversations: () => api.get('/conversations/'),

  getConversation: (id: string) => api.get(`/conversations/${id}/`),

  getMessages: (conversationId: string) =>
    api.get('/messages/', { params: { conversation: conversationId } }),

  sendMessage: (data: { conversation: string; content: string; message_type?: string }) =>
    api.post('/messages/', data),

  createConversation: (data: { participants: string[]; title?: string }) =>
    api.post('/conversations/', data),
};

// API pour les paiements
export const paymentsAPI = {
  createPayment: (data: any) => api.post('/payments/', data),

  verifyPayment: (id: string) => api.get(`/payments/${id}/verify/`),

  getPaymentHistory: () => api.get('/payments/'),
};
