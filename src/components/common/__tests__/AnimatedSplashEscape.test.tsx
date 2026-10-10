/**
 * Le splash anime doit TOUJOURS finir par rendre la main.
 *
 * SYMPTOME (2026-10-10, iPhone TestFlight, Android OK) : l'app reste sur
 * l'ecran de logo. Pas de crash, pas d'erreur.
 *
 * MECANIQUE : `onFinish` n'etait appele QUE depuis le callback de fin
 * d'animation Reanimated (`withTiming(..., cb)`). Ce callback s'execute sur le
 * thread UI, via un worklet. S'il ne part pas — animation jamais jouee, worklet
 * qui ne s'installe pas, thread UI sature au lancement a froid — alors
 * `showSplash` reste vrai dans App.tsx et le splash recouvre l'app
 * indefiniment.
 *
 * Le plafond `MAX_DURATION` ne protegeait pas de ce cas : il ne fait que
 * passer `finishing` a vrai, ce qui relance... la meme animation faillible.
 *
 * POURQUOI iOS ET PAS ANDROID : le code JS est identique sur les deux
 * plateformes. Une sortie qui depend du thread UI et des worklets est
 * precisement le genre de chemin dont le comportement differe entre les deux
 * moteurs — d'ou un filet qui ne depend QUE de JS.
 *
 * ── METHODE ────────────────────────────────────────────────────────────────
 * On teste la REGLE de sortie, pas le rendu : le composant tire tout
 * l'environnement natif (Reanimated, expo-image, LinearGradient, ThemeContext)
 * et c'est justement la couche qu'on suppose defaillante. La regle, elle, est
 * une fonction du temps.
 */

describe('sortie du splash anime', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  const PROGRESS_COMPLETE_DURATION = 150;
  const FADE_OUT_DURATION = 250;
  const SAFETY_EXTRA = 400;

  /** Reimplementation de la regle testee — voir AnimatedSplash, effet `finishing`. */
  function finishingEffect(onFinish: () => void, animationCallbackFires: boolean) {
    let done = false;
    const finishOnce = () => {
      if (done) return;
      done = true;
      onFinish();
    };

    // Le chemin nominal : callback de fin d'animation.
    if (animationCallbackFires) {
      setTimeout(finishOnce, PROGRESS_COMPLETE_DURATION + FADE_OUT_DURATION);
    }
    // Le filet, qui ne depend ni du thread UI ni des worklets.
    const safety = setTimeout(
      finishOnce,
      PROGRESS_COMPLETE_DURATION + FADE_OUT_DURATION + SAFETY_EXTRA,
    );
    return () => clearTimeout(safety);
  }

  it('rend la main meme si le callback d’animation ne part JAMAIS', () => {
    // Exactement le cas du terrain.
    const onFinish = jest.fn();
    finishingEffect(onFinish, /* animationCallbackFires */ false);

    jest.advanceTimersByTime(PROGRESS_COMPLETE_DURATION + FADE_OUT_DURATION);
    expect(onFinish).not.toHaveBeenCalled(); // avant le filet

    jest.advanceTimersByTime(SAFETY_EXTRA);
    expect(onFinish).toHaveBeenCalledTimes(1); // l'app apparait
  });

  it('n’appelle onFinish qu’UNE fois quand les deux chemins partent', () => {
    // Sans la garde `done`, l'animation ET le filet appelleraient onFinish :
    // double transition, et un `setState` sur un composant demonte.
    const onFinish = jest.fn();
    finishingEffect(onFinish, /* animationCallbackFires */ true);

    jest.advanceTimersByTime(5000);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('garde le chemin nominal rapide (pas de retard ajoute)', () => {
    const onFinish = jest.fn();
    finishingEffect(onFinish, true);

    // Le filet ne doit pas ralentir le cas normal : l'animation sort la
    // premiere, a son propre rythme.
    jest.advanceTimersByTime(PROGRESS_COMPLETE_DURATION + FADE_OUT_DURATION);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('le composant possede bien ce filet', () => {
    // Garde-fou : si quelqu'un retire le minuteur de secours, le blocage
    // revient — et il ne se reproduit QUE sur appareil reel. Ce test doit
    // tomber avant.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'AnimatedSplash.tsx'), 'utf8',
    );

    expect(source).toContain('finishOnce');
    expect(source).toMatch(/setTimeout\(finishOnce/);
  });
});
