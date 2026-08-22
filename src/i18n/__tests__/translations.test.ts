/**
 * getAvailableLanguageCodes : ne proposer que les langues réellement traduites
 * (fr/en bundlées + celles du manifest.json distant). Régression du bug
 * « traduction en autres langues ne marche pas » (build sans URL OTA +
 * sélecteur proposant 184 langues ISO non traduites).
 */

// L'URL OTA est lue au chargement du module → la définir AVANT le require.
process.env.EXPO_PUBLIC_TRANSLATIONS_URL = 'https://cdn.test/i18n';

// expo-file-system n'est pas mocké globalement.
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => '{}'),
  writeAsStringAsync: jest.fn(async () => {}),
}));

describe('getAvailableLanguageCodes', () => {
  afterEach(() => {
    jest.resetModules();
    // @ts-ignore
    delete global.fetch;
  });

  it('inclut fr/en + les langues du manifeste', async () => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ es: 1, de: 2, pt: 3 }),
    }));
    const { getAvailableLanguageCodes } = require('../translations');
    const codes = await getAvailableLanguageCodes();
    expect(codes).toEqual(expect.arrayContaining(['fr', 'en', 'es', 'de', 'pt']));
    expect(codes).not.toContain('zz'); // langue non publiée
  });

  it('retombe sur fr/en si le manifeste est indisponible (réseau KO)', async () => {
    // @ts-ignore
    global.fetch = jest.fn(async () => { throw new Error('network'); });
    const { getAvailableLanguageCodes } = require('../translations');
    const codes = await getAvailableLanguageCodes();
    expect(codes.sort()).toEqual(['en', 'fr']);
  });

  it('retombe sur fr/en si le manifeste renvoie 404', async () => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }));
    const { getAvailableLanguageCodes } = require('../translations');
    const codes = await getAvailableLanguageCodes();
    expect(codes.sort()).toEqual(['en', 'fr']);
  });
});
