/**
 * Un plantage au demarrage ne doit pas ressembler a un blocage.
 *
 * CONTEXTE (2026-10-10) : « sur iPhone ca cale a cet ecran », et le testeur
 * n'a pas de Mac — donc ni Console.app, ni Xcode. Aucune DSN Sentry n'est
 * provisionnee non plus : AUCUNE information ne sort de l'appareil.
 *
 * DEFAUT STRUCTUREL : dans App.tsx, le splash est rendu PAR-DESSUS
 * `<AppContent />` et EN DEHORS de l'ErrorBoundary :
 *
 *     <AppContent />                      ← ErrorBoundary est ICI, dedans
 *     {showSplash && <AnimatedSplash />}  ← rendu APRES, donc au-dessus
 *
 * Si l'app plante au demarrage, l'ErrorBoundary rend bien son ecran d'erreur
 * — mais SOUS le splash. L'utilisateur voit un logo fige et conclut a un
 * blocage, alors que l'app a plante et le disait.
 *
 * C'est la difference entre « on ne sait pas ce qui se passe » et « l'app
 * affiche l'erreur » : exactement ce qui manquait pour diagnostiquer.
 */

import {
  markAppReady,
  markAppCrashed,
  hasAppCrashed,
  isAppReady,
  onAppReady,
  __resetAppReadyForTests,
} from '../appReady';

describe('plantage sous le splash', () => {
  beforeEach(() => { __resetAppReadyForTests(); });

  it('un plantage rend l’app « prete » — il n’y a plus rien a attendre', () => {
    expect(isAppReady()).toBe(false);

    markAppCrashed();

    // Sans ca, le splash attendrait un signal `ready` qui n'arrivera jamais :
    // le rendu a echoue, donc RootNavigator n'emettra jamais `markAppReady`.
    expect(isAppReady()).toBe(true);
    expect(hasAppCrashed()).toBe(true);
  });

  it('notifie les abonnes du splash', () => {
    const listener = jest.fn();
    onAppReady(listener);

    markAppCrashed();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('un abonne tardif est notifie immediatement (signal collant)', () => {
    markAppCrashed();

    const listener = jest.fn();
    onAppReady(listener);

    // Le splash peut se monter APRES le plantage : il doit quand meme sortir.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('est idempotent', () => {
    const listener = jest.fn();
    onAppReady(listener);

    markAppCrashed();
    markAppCrashed();
    markAppCrashed();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ne signale pas un plantage quand tout va bien', () => {
    markAppReady();

    expect(isAppReady()).toBe(true);
    expect(hasAppCrashed()).toBe(false); // demarrage normal
  });

  it('l’ErrorBoundary declenche bien ce signal', () => {
    // Garde-fou : le lien entre les deux est ce qui fait disparaitre le
    // splash. S'il saute, le symptome revient — et il ne se reproduit que sur
    // appareil reel, apres un build. Ce test doit tomber avant.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'components', 'common', 'ErrorBoundary.tsx'),
      'utf8',
    );

    expect(source).toContain('markAppCrashed');
    expect(source).toMatch(/getDerivedStateFromError[\s\S]{0,600}markAppCrashed\(\)/);
  });

  it('le detail de l’erreur est visible sur les builds internes', () => {
    // Sans Mac et sans Sentry, cet encart est la SEULE source d'information.
    // `__DEV__` seul le masquait sur TestFlight.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'components', 'common', 'ErrorBoundary.tsx'),
      'utf8',
    );

    expect(source).toMatch(/__DEV__ \|\| isShakeReportEnabled\(\)/);
    // Copiable : l'information doit pouvoir SORTIR du telephone.
    expect(source).toContain('selectable');
  });
});
