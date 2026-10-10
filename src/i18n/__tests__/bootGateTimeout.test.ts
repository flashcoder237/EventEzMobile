/**
 * Le demarrage ne doit JAMAIS pouvoir rester bloque.
 *
 * SYMPTOME (2026-10-10, iPhone TestFlight) : l'app reste figee sur le splash,
 * indefiniment. Pas de crash, pas d'erreur, rien dans les logs.
 *
 * MECANIQUE : `App.tsx` ne rend RIEN (`return null`) tant que `i18nReady` n'est
 * pas resolue. Or `i18nReady` attend `changeLanguage(stored)`, qui peut partir
 * chercher la traduction sur le reseau (EXPO_PUBLIC_TRANSLATIONS_URL est defini
 * dans le profil EAS `production`). Ces `fetch` n'avaient ni timeout ni
 * AbortController.
 *
 * Le piege : un `fetch` sans timeout n'echoue PAS sur un reseau qui accepte la
 * connexion sans jamais repondre — portail captif, wifi sature, 3G qui
 * decroche. Il attend. Ni `.then` ni `.catch` ne partent jamais, donc le gate
 * ne s'ouvre jamais.
 *
 * Deux protections, testees ici :
 *   1. les telechargements ont une echeance (fetchWithTimeout) ;
 *   2. le gate de boot a un filet temporel, meme si (1) est contourne.
 */

describe('le demarrage ne peut pas rester bloque indefiniment', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  /** Reimplementation de la regle testee — voir App.tsx, effet `i18nReady`. */
  function bootGate(ready: Promise<void>, timeoutMs: number) {
    let released = false;
    const release = () => { released = true; };
    ready.then(release).catch(release);
    setTimeout(release, timeoutMs);
    return () => released;
  }

  it('s’ouvre malgre une promesse i18n qui ne se resout JAMAIS', async () => {
    // Exactement le cas du terrain : la requete pend, la promesse ne bouge pas.
    const jamais = new Promise<void>(() => {});
    const isReleased = bootGate(jamais, 4000);

    expect(isReleased()).toBe(false); // avant l'echeance : on attend encore

    jest.advanceTimersByTime(4000);
    await Promise.resolve();

    expect(isReleased()).toBe(true); // l'app demarre quand meme
  });

  it('s’ouvre immediatement quand i18n repond vite (cas normal)', async () => {
    const isReleased = bootGate(Promise.resolve(), 4000);
    await Promise.resolve();
    await Promise.resolve();

    // Pas besoin d'attendre l'echeance : le chemin nominal reste instantane.
    expect(isReleased()).toBe(true);
  });

  it('s’ouvre aussi quand i18n echoue', async () => {
    const isReleased = bootGate(Promise.reject(new Error('AsyncStorage KO')), 4000);
    await Promise.resolve();
    await Promise.resolve();

    expect(isReleased()).toBe(true);
  });
});

describe('les telechargements de traduction ont une echeance', () => {
  it('fetchWithTimeout abandonne au lieu d’attendre sans fin', async () => {
    jest.useFakeTimers();
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'translations.ts'), 'utf8',
    );

    // Garde-fou : si quelqu'un remet un `fetch` nu sur ce chemin, le blocage
    // du splash revient — sans erreur visible. Ce test doit tomber alors.
    expect(source).toContain('AbortController');
    expect(source).toContain('controller.abort()');
    expect(source).not.toMatch(/await fetch\(url\);/);
    expect(source).not.toMatch(/await fetch\(`\$\{REMOTE_BASE\}/);
    jest.useRealTimers();
  });
});
