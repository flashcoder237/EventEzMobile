/**
 * Tests pour paymentIdempotency.ts.
 *
 * Couvre les scenarios critiques contre le double-debit :
 *  - Reuse de cle au sein d'une meme session (retry apres timeout reseau)
 *  - Isolation par registration (cles distinctes pour 2 registrations)
 *  - Expiration TTL 24h
 *  - Cleanup explicite via clearIdempotencyKey
 *  - Resilience aux erreurs AsyncStorage (entry corrompu, throw)
 *
 * Le couplage avec le backend : Payment.idempotency_key + UniqueConstraint
 * (user, idempotency_key) garantit qu'une meme cle = meme Payment renvoye.
 * Mais si le mobile genere une nouvelle cle a chaque retry, ce filet de
 * securite saute → double debit possible. D'ou l'importance de ces tests.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
} from '../paymentIdempotency';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const STORAGE_PREFIX = 'eventez:payment_idem:';

describe('paymentIdempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Defaults : storage vide
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('getOrCreateIdempotencyKey', () => {
    it('genere une nouvelle cle quand aucune n\'existe', async () => {
      const key = await getOrCreateIdempotencyKey('reg-1');
      expect(key).toMatch(/^reg-1-\d+-[a-z0-9]+$/);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `${STORAGE_PREFIX}reg-1`,
        expect.stringContaining(key),
      );
    });

    it('retourne la cle existante si pas expiree (retry session)', async () => {
      const existingKey = 'reg-2-1234567890-abcdef';
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ key: existingKey, createdAt: Date.now() - 60_000 }), // 1min avant
      );
      const key = await getOrCreateIdempotencyKey('reg-2');
      expect(key).toBe(existingKey);
      // Pas de setItem : on n'ecrit rien quand la cle est reutilisee
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('genere une cle DIFFERENTE pour 2 registrations distinctes', async () => {
      // 2 lookups indépendants : la premiere reg n'a rien, la seconde non plus
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const key1 = await getOrCreateIdempotencyKey('reg-A');
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const key2 = await getOrCreateIdempotencyKey('reg-B');
      expect(key1).not.toBe(key2);
      // Le storage key inclut le registration id
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `${STORAGE_PREFIX}reg-A`, expect.any(String),
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `${STORAGE_PREFIX}reg-B`, expect.any(String),
      );
    });

    it('regenere si la cle stockee a expire (>24h)', async () => {
      const expiredKey = 'reg-3-old-xyz';
      // createdAt = il y a 25h
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ key: expiredKey, createdAt: Date.now() - 25 * 3600_000 }),
      );
      const key = await getOrCreateIdempotencyKey('reg-3');
      expect(key).not.toBe(expiredKey);
      // L'entry expire est supprime
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}reg-3`);
      // Une nouvelle cle est persistee
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('regenere proprement si l\'entree stockee est du JSON invalide', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('not-json{');
      const key = await getOrCreateIdempotencyKey('reg-bad');
      expect(key).toMatch(/^reg-bad-/);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('retourne une cle meme si setItem leve (best-effort)', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
      const key = await getOrCreateIdempotencyKey('reg-flaky');
      expect(key).toMatch(/^reg-flaky-/);
      // Le user n'est pas bloque par un disk error
    });

    it('retourne une cle meme si getItem leve', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage corrupted'));
      const key = await getOrCreateIdempotencyKey('reg-corrupt');
      expect(key).toMatch(/^reg-corrupt-/);
    });

    it('ne reutilise PAS une cle stockee sans createdAt (defense)', async () => {
      // Forme malformee (key sans createdAt) → regenere
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ key: 'malformed-key' }),
      );
      const key = await getOrCreateIdempotencyKey('reg-malformed');
      // La fonction lit `stored.key && Date.now() - stored.createdAt < TTL_MS`
      // createdAt undefined → NaN → NaN < TTL = false → regenere.
      expect(key).not.toBe('malformed-key');
    });
  });

  describe('clearIdempotencyKey', () => {
    it('supprime la cle persistee pour la registration', async () => {
      await clearIdempotencyKey('reg-4');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_PREFIX}reg-4`,
      );
    });

    it('n\'echoue pas si la cle n\'existe pas (idempotent)', async () => {
      // removeItem retourne undefined pour une cle inexistante — pas d'erreur
      mockAsyncStorage.removeItem.mockResolvedValueOnce(undefined);
      await expect(clearIdempotencyKey('reg-nonexistent')).resolves.toBeUndefined();
    });

    it('ne propage PAS les erreurs AsyncStorage (silent)', async () => {
      mockAsyncStorage.removeItem.mockRejectedValueOnce(new Error('storage down'));
      // Ne doit PAS throw — le clear est best-effort
      await expect(clearIdempotencyKey('reg-error')).resolves.toBeUndefined();
    });
  });

  describe('flow complet : create → reuse → clear → recreate', () => {
    it('cycle de vie complet d\'une cle au cours d\'un paiement', async () => {
      const regId = 'reg-lifecycle';
      // 1. Premier createPayment : nouvelle cle
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const key1 = await getOrCreateIdempotencyKey(regId);
      expect(key1).toMatch(/^reg-lifecycle-/);

      // 2. Network timeout → retry → reutilise la meme cle
      // (le storage a maintenant la cle)
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ key: key1, createdAt: Date.now() }),
      );
      const key2 = await getOrCreateIdempotencyKey(regId);
      expect(key2).toBe(key1);

      // 3. Paiement complete → clear
      await clearIdempotencyKey(regId);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_PREFIX}reg-lifecycle`,
      );

      // 4. Nouvel achat de billets supplementaires plus tard : nouvelle cle
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const key3 = await getOrCreateIdempotencyKey(regId);
      expect(key3).not.toBe(key1);
    });
  });
});
