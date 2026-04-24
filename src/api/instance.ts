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
    // Passe par getAccessToken (défini plus bas) — utilise la couche mémoire
    // quand rememberMe=false (SecureStore est vide dans ce mode, lire SecureStore
    // directement renverrait null et on partirait sans Authorization).
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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

// ============================================
// SHARED REFRESH TOKEN HELPER
// ============================================
// Utilisé par l'interceptor, fetchUpload et le WebSocket pour partager le même
// mutex → évite les refresh concurrents qui se blacklistent mutuellement
// (backend: ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION).

let refreshPromise: Promise<string | null> | null = null;
// Incrémenté à chaque clearTokens — invalide les refresh en vol si l'utilisateur
// se déconnecte pendant qu'un refresh est en cours (sinon les nouveaux tokens
// seraient ré-écrits en SecureStore après le logout).
let sessionVersion = 0;

/**
 * Rafraîchit l'access token (et le refresh si rotation).
 * Coalesce les appels concurrents via refreshPromise.
 * Retourne le nouvel access token, ou null si :
 *  - pas de refresh token en store
 *  - refresh invalide/blacklisté (401/403) → émet api-auth-error
 *  - session changée (logout pendant le refresh)
 * Les autres erreurs (réseau, 5xx) retournent null SANS déconnecter.
 */
export async function ensureFreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const mySession = sessionVersion;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
        refresh: refreshToken,
      }, { timeout: 15000 });

      // Si logout pendant le refresh, ne pas écraser les tokens effacés
      if (sessionVersion !== mySession) {
        if (__DEV__) console.log('[API] Refresh succeeded but session was cleared — discarding new tokens');
        return null;
      }

      const { access, refresh: newRefresh } = response.data;
      // IMPORTANT: avec ROTATE_REFRESH_TOKENS côté backend, le nouveau refresh
      // DOIT être sauvegardé — sinon on reste avec un refresh blacklisté qui
      // échouera au prochain cycle.
      // On utilise updateTokens (pas setTokens) pour préserver le mode de
      // persistance choisi au login (mémoire vs SecureStore).
      await updateTokens(access, newRefresh ?? refreshToken);
      return access;
    } catch (error) {
      const axErr = error as AxiosError;
      const status = axErr.response?.status;
      // Ne déconnecter que si le refresh est franchement invalide (401/403).
      // Timeouts, 5xx, erreurs réseau → on laisse la session intacte, l'utilisateur
      // pourra réessayer. Déconnecter sur un hoquet serveur est trop agressif.
      if (status === 401 || status === 403) {
        if (__DEV__) console.log('[API] Refresh token invalid/blacklisted — clearing session');
        await clearTokensInternal();
        eventBus.emit('api-auth-error');
      } else if (__DEV__) {
        console.warn(`[API] Refresh transient error (${status ?? axErr.code}) — session preserved`);
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

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

    // 503 service_unavailable → notifier l'UI pour afficher la page de maintenance
    if (error.response?.status === 503) {
      const data = error.response.data as any;
      if (data?.error === 'service_unavailable' && data?.incident) {
        eventBus.emit('service-unavailable', { incident: data.incident });
      }
    }

    // 403 email_verification_required → notifier l'UI pour afficher le modal
    const responseData = error.response?.data as { code?: string; detail?: string } | undefined;
    if (
      error.response?.status === 403 &&
      responseData?.code === 'email_verification_required'
    ) {
      eventBus.emit('api-verification-required', {
        message: responseData.detail,
        url: originalRequest?.url,
      });
      return Promise.reject(error);
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
        const newAccess = await ensureFreshAccessToken();

        if (newAccess) {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          }
          processQueue(null, newAccess);
          return api(originalRequest);
        }

        // Échec du refresh :
        //   - 401/403 → ensureFreshAccessToken a déjà nettoyé + émis api-auth-error
        //   - 5xx/timeout → session préservée, on remonte juste l'erreur originale
        const sessionError = new Error('Session refresh failed');
        processQueue(sessionError, null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
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
//
// Deux modes de persistance :
//  - persistent=true  → SecureStore (Keychain iOS / KeyStore Android). Session
//                       survit aux redémarrages. C'est le défaut.
//  - persistent=false → mémoire uniquement (les deux variables ci-dessous).
//                       Les tokens disparaissent quand le process RN est tué
//                       (kill manuel, reboot, OS qui récupère la mémoire).
//                       Utilisé quand l'utilisateur a DÉCOCHÉ "Se souvenir
//                       de moi" — il ne veut pas que sa session persiste
//                       au-delà de la vie de l'app.

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let useMemoryOnly = false;

/**
 * Sauvegarde les tokens. Change le mode de persistance selon `persistent`.
 * Appeler depuis : login (avec rememberMe), social auth, OTP, register.
 * NE PAS appeler depuis ensureFreshAccessToken — utiliser updateTokens.
 */
export const setTokens = async (
  accessToken: string,
  refreshToken: string,
  persistent: boolean = true
) => {
  sessionVersion++;
  useMemoryOnly = !persistent;
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;

  if (persistent) {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      if (__DEV__) console.error('SecureStore failed to save tokens:', error);
      throw new Error('Failed to securely store authentication tokens');
    }
  } else {
    // Mode éphémère : on purge toute trace précédente sur disque
    await clearSecureStoreTokens();
  }
};

/**
 * Met à jour les tokens APRÈS refresh, sans changer le mode de persistance.
 * Si useMemoryOnly=true, on ne touche pas à SecureStore.
 */
const updateTokens = async (accessToken: string, refreshToken: string) => {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
  if (useMemoryOnly) return;
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to update tokens:', error);
  }
};

const clearSecureStoreTokens = async () => {
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

// Version interne utilisée par ensureFreshAccessToken sur le chemin 401 du
// refresh — n'incrémente PAS sessionVersion (sinon on invaliderait le refresh
// en cours avant qu'il ait fini).
const clearTokensInternal = async () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  useMemoryOnly = false;
  await clearSecureStoreTokens();
};

export const clearTokens = async () => {
  // Invalide tout refresh en vol : si le logout arrive pendant un refresh,
  // ensureFreshAccessToken comparera mySession !== sessionVersion et
  // jettera les nouveaux tokens au lieu de les stocker.
  sessionVersion++;
  await clearTokensInternal();
};

export const getAccessToken = async () => {
  if (memoryAccessToken !== null) return memoryAccessToken;
  if (useMemoryOnly) return null;
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    // Hydrate la mémoire pour les appels suivants (évite I/O disque répété)
    if (token) memoryAccessToken = token;
    return token;
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to get access token:', error);
    return null;
  }
};

export const getRefreshToken = async () => {
  if (memoryRefreshToken !== null) return memoryRefreshToken;
  if (useMemoryOnly) return null;
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (token) memoryRefreshToken = token;
    return token;
  } catch (error) {
    if (__DEV__) console.warn('SecureStore failed to get refresh token:', error);
    return null;
  }
};

export default api;
