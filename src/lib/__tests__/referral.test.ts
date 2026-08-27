/**
 * Capture du `?ref=` sur deep link.
 *
 * Régression visée : la capture n'existait que côté web, donc un destinataire
 * AYANT DÉJÀ L'APP ouvrait le lien dans l'app et le code était perdu — le cas
 * le plus favorable au parrainage était justement celui qui échouait.
 */
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve();
    }),
    getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    removeItem: jest.fn((k: string) => {
      delete store[k];
      return Promise.resolve();
    }),
  },
}));

import {
  captureReferralFromPath,
  getPendingReferral,
  clearPendingReferral,
} from '../referral';

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

describe('captureReferralFromPath', () => {
  it('extrait le code d\'un lien de parrainage', () => {
    expect(captureReferralFromPath('/register/?ref=ABC12345')).toBe('ABC12345');
  });

  it('normalise la casse', () => {
    expect(captureReferralFromPath('/register/?ref=abc12345')).toBe('ABC12345');
  });

  it('fonctionne aussi sur un lien vers un événement', () => {
    expect(captureReferralFromPath('/events/mon-event?ref=XYZ99')).toBe('XYZ99');
  });

  it('ignore un chemin sans paramètre', () => {
    expect(captureReferralFromPath('/events/mon-event')).toBeNull();
  });

  it('rejette une valeur aberrante plutôt que de la stocker', () => {
    expect(captureReferralFromPath('/register/?ref=a')).toBeNull();
    expect(captureReferralFromPath("/register/?ref=<script>")).toBeNull();
  });

  it('ne casse jamais le routage, même sur une entrée absurde', () => {
    // La capture est appelée depuis getStateFromPath : elle ne doit JAMAIS
    // lever, sous peine d'empêcher l'ouverture du lien.
    expect(() => captureReferralFromPath('')).not.toThrow();
    expect(() => captureReferralFromPath('???')).not.toThrow();
  });
});

describe('persistance', () => {
  it('mémorise puis restitue le code', async () => {
    captureReferralFromPath('/register/?ref=ABC12345');
    await Promise.resolve();
    expect(await getPendingReferral()).toBe('ABC12345');
  });

  it('purge le code après usage', async () => {
    captureReferralFromPath('/register/?ref=ABC12345');
    await Promise.resolve();
    await clearPendingReferral();
    // Sans purge, le même code resterait attaché à toutes les inscriptions
    // futures faites depuis cet appareil.
    expect(await getPendingReferral()).toBeNull();
  });
});
