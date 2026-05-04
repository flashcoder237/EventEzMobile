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

// Cache mémoire avec LRU : évite des lectures AsyncStorage répétées sur la même session
const MAX_MEM_ENTRIES = 50;
const mem = new Map<string, CacheEntry>();

/** Éviction LRU : supprime les entrées les plus anciennes si la Map dépasse la limite */
const evictIfNeeded = () => {
  if (mem.size <= MAX_MEM_ENTRIES) return;
  // Map itère dans l'ordre d'insertion → les premières clés sont les plus anciennes
  const toRemove = mem.size - MAX_MEM_ENTRIES;
  const iter = mem.keys();
  for (let i = 0; i < toRemove; i++) {
    const { value } = iter.next();
    if (value) mem.delete(value);
  }
};

/** Touche une clé pour la marquer comme récemment utilisée (remonter en fin de Map) */
const touchKey = (key: string, entry: CacheEntry) => {
  mem.delete(key);
  mem.set(key, entry);
};

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
      touchKey(key, m); // LRU: marquer comme récemment utilisé
      return { data: m.data as T, isStale: now - m.timestamp > m.ttl };
    }

    // AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      mem.set(key, entry); // Réchauffer le cache mémoire
      evictIfNeeded();
      return { data: entry.data as T, isStale: now - entry.timestamp > entry.ttl };
    } catch (e) {
      if (__DEV__) console.warn(`[CacheService] get("${key}") failed:`, e instanceof Error ? e.message : e);
      return null;
    }
  },

  /**
   * Écrit une entrée dans le cache (mémoire + AsyncStorage).
   */
  async set<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry = { data, timestamp: Date.now(), ttl };
    mem.delete(key); // Supprimer d'abord pour que set le place en fin (LRU)
    mem.set(key, entry);
    evictIfNeeded();
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      if (__DEV__) console.warn(`[CacheService] set("${key}") failed:`, e instanceof Error ? e.message : e);
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
    } catch (e) {
      if (__DEV__) console.warn(`[CacheService] invalidate(${JSON.stringify(arr)}) failed:`, e instanceof Error ? e.message : e);
    }
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
    } catch (e) {
      if (__DEV__) console.warn(`[CacheService] clearByPrefix("${prefix}") failed:`, e instanceof Error ? e.message : e);
    }
  },

  /**
   * Vide uniquement le cache mémoire (sans toucher AsyncStorage).
   * Utile pour forcer une re-lecture immédiate sans purger le disque.
   */
  clearMemory(): void {
    mem.clear();
  },

  /**
   * Purge le cache mémoire ET toutes les entrées AsyncStorage préfixées
   * par STORAGE_PREFIX. À appeler au logout pour qu'un nouveau user ne
   * voie pas brièvement les données cachées de l'utilisateur précédent.
   */
  async clearAll(): Promise<void> {
    mem.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const toRemove = allKeys.filter(k => k.startsWith(STORAGE_PREFIX));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch (e) {
      if (__DEV__) console.warn(`[CacheService] clearAll() failed:`, e instanceof Error ? e.message : e);
    }
  },
};

export default CacheService;
