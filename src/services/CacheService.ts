/**
 * CacheService — couche de cache à deux niveaux
 *
 * Niveau 1 : mémoire vive (Map) — accès instantané, durée de vie = session
 * Niveau 2 : AsyncStorage — persiste entre les sessions (hors ligne)
 *
 * Comportement :
 *  - Les données sont TOUJOURS servies depuis le cache si elles existent (même hors ligne)
 *  - `isStale` indique si une actualisation en arrière-plan est souhaitable
 *  - Le TTL contrôle la fraîcheur, pas l'expiration : les données ne disparaissent pas
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@ez:cache:';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

export interface CacheResult<T> {
  data: T;
  /** true si le TTL est dépassé → déclencher un rafraîchissement en arrière-plan */
  isStale: boolean;
}

// Cache mémoire : évite des lectures AsyncStorage répétées sur la même session
const mem = new Map<string, CacheEntry>();

const CacheService = {
  /**
   * Lit une entrée du cache.
   * Cherche d'abord en mémoire, puis dans AsyncStorage.
   * Retourne null si l'entrée n'existe pas du tout.
   */
  async get<T>(key: string): Promise<CacheResult<T> | null> {
    const now = Date.now();

    // Mémoire d'abord
    const m = mem.get(key);
    if (m) {
      return { data: m.data as T, isStale: now - m.timestamp > m.ttl };
    }

    // AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      mem.set(key, entry); // Réchauffer le cache mémoire
      return { data: entry.data as T, isStale: now - entry.timestamp > entry.ttl };
    } catch {
      return null;
    }
  },

  /**
   * Écrit une entrée dans le cache (mémoire + AsyncStorage).
   */
  async set<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry = { data, timestamp: Date.now(), ttl };
    mem.set(key, entry);
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Le cache mémoire reste fonctionnel
    }
  },

  /**
   * Invalide une ou plusieurs entrées (mémoire + AsyncStorage).
   * À appeler après une mutation (unfollow, delete, etc.)
   */
  async invalidate(keys: string | string[]): Promise<void> {
    const arr = Array.isArray(keys) ? keys : [keys];
    arr.forEach(k => mem.delete(k));
    try {
      await AsyncStorage.multiRemove(arr.map(k => STORAGE_PREFIX + k));
    } catch {}
  },

  /**
   * Supprime toutes les entrées dont la clé commence par `prefix`.
   * Utile pour effacer les données d'un utilisateur spécifique.
   */
  async clearByPrefix(prefix: string): Promise<void> {
    for (const k of mem.keys()) {
      if (k.startsWith(prefix)) mem.delete(k);
    }
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const toRemove = allKeys.filter(k => k.startsWith(STORAGE_PREFIX + prefix));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {}
  },

  /**
   * Vide uniquement le cache mémoire (sans toucher AsyncStorage).
   * À appeler à la déconnexion pour forcer un rechargement propre.
   */
  clearMemory(): void {
    mem.clear();
  },
};

export default CacheService;
