// ============================================
// EventEz Mobile API — Axios Instance & Interceptors
// ============================================

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { eventBus } from '../lib/eventBus';
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './config';

// Création de l'instance Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================

// Intercepteur pour ajouter le token d'authentification et logger les requêtes
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      if (__DEV__) console.warn('Erreur lors de la récupération du token:', error);
    }
    // En React Native, le FormData est un polyfill — Axios peut ne pas le reconnaître
    // et tenter de le JSON.stringify (résultat: {"_parts":[...]} au lieu de multipart).
    // On vérifie instanceof ET _parts, puis on:
    // 1. Supprime Content-Type pour que XMLHttpRequest ajoute multipart/form-data avec boundary
    // 2. Bypass transformRequest pour empêcher Axios de sérialiser le FormData
    const isFormData = config.data instanceof FormData ||
      (config.data && typeof config.data === 'object' && Array.isArray((config.data as any)._parts));
    if (isFormData) {
      delete config.headers['Content-Type'];
      config.transformRequest = [(data: any) => data];
      config.timeout = 60000; // 60s pour les uploads de fichiers
    }

    // Log de la requête pour debug
    if (__DEV__) console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data && __DEV__ && !isFormData) {
      // Ne pas logger les FormData ni les mots de passe
      const safeData = { ...config.data };
      if (safeData.password) safeData.password = '***';
      if (safeData.confirm_password) safeData.confirm_password = '***';
      console.log('[API] Request data:', JSON.stringify(safeData));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR — Token Refresh & Retry
// ============================================

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

// Nombre maximum de retries pour les timeouts
const MAX_TIMEOUT_RETRIES = 3;

// Intercepteur pour gérer le refresh token et logger les erreurs
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] Response ${response.status} from ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _timeoutRetryCount?: number };

    // Log de l'erreur pour debug
    if (__DEV__) console.error(`[API] Error ${error.response?.status || error.code} from ${originalRequest?.url}`);
    if (error.response?.data && __DEV__) {
      console.error('[API] Error data:', JSON.stringify(error.response.data));
    }

    // Gestion des timeouts et erreurs réseau avec retry automatique
    const isTimeoutError = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetworkError = error.code === 'ERR_NETWORK' || error.message?.includes('Network Error');

    if (isTimeoutError || isNetworkError) {
      // Ne pas réessayer les uploads de fichiers (FormData) car le stream est consommé
      const isFormDataRequest = originalRequest.data instanceof FormData ||
        (originalRequest.data && typeof originalRequest.data === 'object' && Array.isArray((originalRequest.data as any)?._parts));

      if (!isFormDataRequest) {
        const retryCount = originalRequest._timeoutRetryCount || 0;

        if (retryCount < MAX_TIMEOUT_RETRIES) {
          originalRequest._timeoutRetryCount = retryCount + 1;
          const errorType = isTimeoutError ? 'Timeout' : 'Network Error';
          if (__DEV__) console.log(`[API] ${errorType} - Retry ${originalRequest._timeoutRetryCount}/${MAX_TIMEOUT_RETRIES} for ${originalRequest.url}`);

          // Émettre un événement pour que l'UI puisse afficher la progression
          eventBus.emit('api-retry', {
            attempt: originalRequest._timeoutRetryCount,
            maxRetries: MAX_TIMEOUT_RETRIES,
            endpoint: originalRequest.url,
          });

          // Backoff exponentiel: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          return api(originalRequest);
        }
        if (__DEV__) console.error(`[API] Max retries reached for ${originalRequest.url}`);
        eventBus.emit('api-server-error');
      } else {
        if (__DEV__) console.error(`[API] File upload failed for ${originalRequest.url} (no retry for FormData)`);
        eventBus.emit('api-server-error');
      }
    }

    // Ne pas intercepter les 401 sur les endpoints d'auth (login, register, etc.)
    // Ces erreurs sont des réponses légitimes (mauvais identifiants), pas des tokens expirés
    const authEndpoints = ['/token/', '/token/refresh/', '/register/', '/register/organizer/'];
    const isAuthEndpoint = authEndpoints.some(ep => originalRequest?.url?.endsWith(ep));

    // Si l'erreur est 401 et qu'on n'a pas déjà réessayé
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let refreshToken: string | null = null;
        try {
          refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        } catch (secureStoreError) {
          if (__DEV__) console.warn('SecureStore failed to get refresh token:', secureStoreError);
        }

        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          try {
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
          } catch (secureStoreError) {
            if (__DEV__) console.warn('SecureStore failed to save access token:', secureStoreError);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }

          processQueue(null, access);
          isRefreshing = false;
          return api(originalRequest);
        } else {
          // Pas de refresh token disponible — débloquer la queue et nettoyer
          const noTokenError = new Error('No refresh token available');
          processQueue(noTokenError, null);
          isRefreshing = false;
          await clearTokens();
          eventBus.emit('api-auth-error');
          return Promise.reject(noTokenError);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Supprimer les tokens si le refresh échoue
        await clearTokens();
        isRefreshing = false;
        eventBus.emit('api-auth-error');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// REQUEST DEDUPLICATION
// ============================================
// Évite les requêtes GET identiques simultanées (ex: double tap, re-render rapide)

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const REQUEST_CACHE_TTL = 2000; // 2s - fenêtre de déduplication (évite double-tap, re-render rapide)

/**
 * Génère une clé unique pour identifier une requête
 */
const getRequestKey = (url: string, params?: any): string => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${url}::${paramString}`;
};

/**
 * Nettoie les requêtes expirées du cache
 */
const cleanupExpiredRequests = () => {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_CACHE_TTL) {
      pendingRequests.delete(key);
    }
  }
};

/**
 * GET dédupliqué - évite les requêtes GET identiques simultanées
 * Si une requête identique est déjà en cours (dans les 2s), retourne la même promesse
 */
export const deduplicatedGet = async <T = any>(url: string, config?: any): Promise<T> => {
  const requestKey = getRequestKey(url, config?.params);

  // Nettoyer les requêtes expirées
  cleanupExpiredRequests();

  // Vérifier s'il y a une requête identique en cours
  const existingRequest = pendingRequests.get(requestKey);
  if (existingRequest && Date.now() - existingRequest.timestamp < REQUEST_CACHE_TTL) {
    if (__DEV__) {
      console.log(`[API] Deduplication - reusing pending request for ${url}`);
    }
    return existingRequest.promise;
  }

  // Créer une nouvelle requête
  const requestPromise = api.get(url, config)
    .then(response => {
      // Supprimer du cache une fois terminée
      setTimeout(() => pendingRequests.delete(requestKey), REQUEST_CACHE_TTL);
      return response.data;
    })
    .catch(error => {
      // Supprimer du cache en cas d'erreur aussi
      pendingRequests.delete(requestKey);
      throw error;
    });

  // Stocker la requête en cours
  pendingRequests.set(requestKey, {
    promise: requestPromise,
    timestamp: Date.now(),
  });

  return requestPromise;
};

// ============================================
// TOKEN MANAGEMENT FUNCTIONS
// ============================================

export const setTokens = async (accessToken: string, refreshToken: string) => {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    if (__DEV__) console.error('SecureStore failed to save tokens:', error);
    throw new Error('Failed to securely store authentication tokens');
  }
};

export const clearTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to delete access token:', error);
  }
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to delete refresh token:', error);
  }
};

export const getAccessToken = async () => {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to get access token:', error);
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to get refresh token:', error);
    return null;
  }
};

export default api;
