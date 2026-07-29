/**
 * Tests de eventAccessToken.ts — stockage token d'accès event (memory + AsyncStorage).
 * Couvre set/get sync/clear/warm et l'extraction d'eventId depuis une URL d'API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setEventAccessToken,
  getEventAccessTokenSync,
  clearEventAccessToken,
  warmEventAccessTokenCache,
  extractEventIdFromUrl,
} from '../eventAccessToken';

const PREFIX = 'eventez:event_access_token:';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('set / getSync / clear', () => {
  it('set rend le token lisible en sync + le persiste', async () => {
    await setEventAccessToken('evt-1', 'tok-abc');
    expect(getEventAccessTokenSync('evt-1')).toBe('tok-abc');
    expect(await AsyncStorage.getItem(`${PREFIX}evt-1`)).toBe('tok-abc');
  });

  it('getSync retourne null pour un event inconnu', () => {
    expect(getEventAccessTokenSync('inconnu')).toBeNull();
  });

  it('clear retire le token (memory + storage)', async () => {
    await setEventAccessToken('evt-2', 'tok');
    await clearEventAccessToken('evt-2');
    expect(getEventAccessTokenSync('evt-2')).toBeNull();
    expect(await AsyncStorage.getItem(`${PREFIX}evt-2`)).toBeNull();
  });
});

describe('warmEventAccessTokenCache', () => {
  it('hydrate le cache mémoire depuis AsyncStorage', async () => {
    // Simule des tokens persistés d'une session précédente (cache mémoire vide
    // pour ces ids car clear() ne vide pas la mémoire des autres — on utilise
    // des ids neufs).
    await AsyncStorage.setItem(`${PREFIX}persisted-1`, 'p1');
    await AsyncStorage.setItem(`${PREFIX}persisted-2`, 'p2');
    await AsyncStorage.setItem('autre:cle', 'ignore');

    await warmEventAccessTokenCache();

    expect(getEventAccessTokenSync('persisted-1')).toBe('p1');
    expect(getEventAccessTokenSync('persisted-2')).toBe('p2');
    // Une clé hors préfixe n'est pas chargée.
    expect(getEventAccessTokenSync('autre:cle')).toBeNull();
  });

  it('no-op si aucun token persisté', async () => {
    await expect(warmEventAccessTokenCache()).resolves.toBeUndefined();
  });
});

describe('extractEventIdFromUrl', () => {
  it('extrait un UUID', () => {
    const uuid = '12345678-1234-1234-1234-123456789abc';
    expect(extractEventIdFromUrl(`/events/${uuid}/registrations/`)).toBe(uuid);
  });
  it('extrait un id numérique', () => {
    expect(extractEventIdFromUrl('/events/42/')).toBe('42');
  });
  it('gère la fin de chaîne et le query string', () => {
    expect(extractEventIdFromUrl('/events/99')).toBe('99');
    expect(extractEventIdFromUrl('/events/7?expand=1')).toBe('7');
  });
  it('retourne null si l\'URL ne cible pas un event', () => {
    expect(extractEventIdFromUrl('/users/me/')).toBeNull();
    expect(extractEventIdFromUrl('/events/')).toBeNull();
    expect(extractEventIdFromUrl('/events/not-a-valid-id-format/')).toBeNull();
  });
});
