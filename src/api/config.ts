// ============================================
// EventEz Mobile API — Configuration & Helpers
// ============================================

import * as SecureStore from 'expo-secure-store';

// Configuration de base
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// Log de l'URL API pour le debug
if (__DEV__) {
  console.log('[API] Base URL:', API_BASE_URL);
  if (!process.env.EXPO_PUBLIC_API_URL) {
    console.warn('[API] EXPO_PUBLIC_API_URL non défini — fallback sur localhost (ne marchera pas en prod)');
  }
  if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    console.warn('[API] API pointe vers localhost — vérifiez votre .env ou eas.json');
  }
}

// Base du serveur (sans /api) pour construire les URLs média
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Convertit un chemin média relatif en URL absolue.
 * Django peut retourner "/media/events/xxx.jpg" — React Native Image
 * ne peut pas résoudre un chemin relatif, il faut l'URL complète.
 * Si l'URL est déjà absolue, elle est retournée telle quelle.
 */
export function getMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Chemin relatif : on préfixe avec l'URL du serveur
  return `${SERVER_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Clés pour le stockage sécurisé
export const ACCESS_TOKEN_KEY = 'eventez_access_token';
export const REFRESH_TOKEN_KEY = 'eventez_refresh_token';

// Helper partagé pour tous les uploads FormData.
// Bypass Axios : sur React Native, AxiosHeaders ignore le `delete Content-Type`,
// ce qui corrompt le boundary multipart → ERR_NETWORK.
// fetch natif génère automatiquement le bon Content-Type + boundary.
export async function fetchUpload(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  formData: FormData
): Promise<{ data: any }> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const text = await response.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* HTML error page */ }
  if (!response.ok) {
    if (__DEV__) console.error(`[fetchUpload] ${method} ${path} → ${response.status}:`, text.slice(0, 2000));
    const message = data?.detail || data?.non_field_errors?.[0] || JSON.stringify(data) || `HTTP ${response.status}`;
    const error: any = new Error(message);
    error.response = { status: response.status, data };
    throw error;
  }
  return { data };
}
