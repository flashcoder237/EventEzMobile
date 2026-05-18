/**
 * Stockage du token d'acces aux events access-code-proteges (mobile).
 *
 * Le backend renvoie un token signe HMAC par `verify_access_code` valide 24h.
 * On le stocke en AsyncStorage pour le rejouer en header
 * `X-Event-Access-Token` sur les requetes GET /events/<id>/ qui suivent.
 *
 * AsyncStorage est asynchrone — on cache aussi en memoire pour eviter
 * un await sur chaque requete axios.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'eventez:event_access_token:';

// Cache memoire : { eventId: token }. Hydrate au demarrage via warm() ou
// au premier set() pour cet event.
const memoryCache: Record<string, string> = {};

export async function setEventAccessToken(eventId: string, token: string): Promise<void> {
  memoryCache[eventId] = token;
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}${eventId}`, token);
  } catch {
    // AsyncStorage indisponible — on garde au moins le cache memoire pour
    // cette session.
  }
}

/**
 * Sync : lit le cache memoire. Doit etre warm()-e au prealable pour les
 * tokens persistes entre sessions, sinon retourne null.
 */
export function getEventAccessTokenSync(eventId: string): string | null {
  return memoryCache[eventId] || null;
}

export async function clearEventAccessToken(eventId: string): Promise<void> {
  delete memoryCache[eventId];
  try {
    await AsyncStorage.removeItem(`${KEY_PREFIX}${eventId}`);
  } catch {
    // silent
  }
}

/**
 * Hydrate le cache memoire depuis AsyncStorage. A appeler dans App.tsx
 * au demarrage pour rendre les tokens persistes disponibles synchroniquement.
 */
export async function warmEventAccessTokenCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tokenKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    if (tokenKeys.length === 0) return;
    const pairs = await AsyncStorage.multiGet(tokenKeys);
    for (const [k, v] of pairs) {
      if (v) {
        const eventId = k.slice(KEY_PREFIX.length);
        memoryCache[eventId] = v;
      }
    }
  } catch {
    // silent
  }
}

/**
 * Extrait l'UUID d'event d'une URL d'API (ex: "/events/abc-123/registrations/").
 * Retourne null si l'URL ne cible pas un sous-chemin d'event.
 */
export function extractEventIdFromUrl(url: string): string | null {
  const match = url.match(/\/events\/([0-9a-f-]{36}|\d+)(?:\/|$|\?)/i);
  return match ? match[1] : null;
}
