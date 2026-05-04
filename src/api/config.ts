// ============================================
// EventEz Mobile API — Configuration & Helpers
// ============================================

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
//
// Gère aussi le refresh d'access token sur 401 (un upload long peut dépasser la
// durée de vie de l'access token de 30 min). Réutilise ensureFreshAccessToken
// du même mutex que l'intercepteur Axios pour éviter les refresh concurrents.
//
// Timeout : `fetch` en RN utilise les valeurs par défaut de URLSession/OkHttp
// (60-90s) qui sont trop longues pour une UX correcte sur connexion lente.
// On wrappe avec AbortController pour aligner sur le timeout d'upload Axios
// (60s) et émettre une erreur lisible plutôt que de pendre indéfiniment.
const UPLOAD_TIMEOUT_MS = 60_000;

export async function fetchUpload(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  formData: FormData
): Promise<{ data: any }> {
  const url = `${API_BASE_URL}${path}`;

  const doRequest = async (token: string | null) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });
      const text = await response.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { /* HTML error page */ }
      return { response, data, text };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        const timeoutError: any = new Error(
          `Upload timeout (${UPLOAD_TIMEOUT_MS / 1000}s) — vérifie ta connexion et réessaie.`,
        );
        timeoutError.code = 'ECONNABORTED';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  // On importe getAccessToken en lazy pour éviter le cycle config.ts ↔ instance.ts.
  // getAccessToken utilise la couche mémoire → fonctionne aussi en mode
  // éphémère (rememberMe=false, SecureStore vide).
  const { getAccessToken } = await import('./instance');
  let token: string | null = await getAccessToken();

  let { response, data, text } = await doRequest(token);

  // Sur 401 avec un token présent, tenter un refresh puis un retry unique.
  // On importe ensureFreshAccessToken ici (lazy) pour éviter un cycle d'imports
  // entre instance.ts (qui importe config.ts) et config.ts.
  if (response.status === 401 && token) {
    const { ensureFreshAccessToken } = await import('./instance');
    const newAccess = await ensureFreshAccessToken();
    if (newAccess) {
      if (__DEV__) console.log(`[fetchUpload] Refreshed token, retrying ${method} ${path}`);
      ({ response, data, text } = await doRequest(newAccess));
    }
    // Si le refresh échoue, on laisse l'erreur 401 originale remonter
    // (ensureFreshAccessToken aura déjà émis api-auth-error si pertinent).
  }

  if (!response.ok) {
    if (__DEV__) console.error(`[fetchUpload] ${method} ${path} → ${response.status}:`, text.slice(0, 2000));
    // Les endpoints user_messages renvoient `{ error, code, ... }` ; DRF
    // standard renvoie `{ detail }` ou `{ non_field_errors }`. On essaie
    // les trois dans cet ordre avant de retomber sur un JSON.stringify.
    const message =
      data?.error
      || data?.detail
      || data?.non_field_errors?.[0]
      || (typeof data === 'object' && Object.keys(data || {}).length ? JSON.stringify(data) : null)
      || `HTTP ${response.status}`;
    const error: any = new Error(message);
    error.response = { status: response.status, data };
    throw error;
  }
  return { data };
}
