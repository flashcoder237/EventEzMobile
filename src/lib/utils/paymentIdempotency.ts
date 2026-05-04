// ============================================
// Payment idempotency keys — persisted in AsyncStorage
// ============================================
//
// Une clé d'idempotence doit survivre aux re-rendus, aux navigations,
// au kill du process et aux retries réseau, jusqu'à ce que le paiement
// atteigne un statut terminal (success/failed/cancelled). Sans persistance,
// un retry après crash réseau post-`createPayment` génère une nouvelle clé
// → le backend traite ça comme un nouveau paiement → double débit.
//
// Cleanup explicite (clearIdempotencyKey) à appeler dans :
// - onSuccess / onFailure du polling
// - cancelPayment (annulation explicite par l'utilisateur)
// - cleanup TTL (24h) automatique au prochain getOrCreate

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'eventez:payment_idem:';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface StoredKey {
  key: string;
  createdAt: number;
}

/**
 * Retourne la clé d'idempotence existante pour cette registration, ou en crée
 * une nouvelle si aucune n'existe / la précédente a expiré.
 *
 * Les retries successifs au sein d'une même session (création échouée puis
 * relancée) réutilisent la même clé → backend rejette le doublon en 409.
 */
export async function getOrCreateIdempotencyKey(registrationId: string): Promise<string> {
  const storageKey = `${STORAGE_PREFIX}${registrationId}`;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const stored = JSON.parse(raw) as StoredKey;
      if (stored?.key && Date.now() - stored.createdAt < TTL_MS) {
        return stored.key;
      }
      // Expirée → cleanup
      await AsyncStorage.removeItem(storageKey);
    }
  } catch {
    // Lecture/parse échouée : on régénère
  }

  const newKey = `${registrationId}-${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
  try {
    const payload: StoredKey = { key: newKey, createdAt: Date.now() };
    await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Best-effort : si SecureStorage est inaccessible, on retourne quand même la clé
    // (mémoire seulement → moins robuste mais le paiement peut tenter)
  }
  return newKey;
}

/**
 * Supprime la clé d'idempotence persistée. À appeler dès que le paiement
 * atteint un statut terminal (success/failed/cancelled) ou que l'utilisateur
 * annule explicitement.
 */
export async function clearIdempotencyKey(registrationId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${registrationId}`);
  } catch {
    // ignore
  }
}
