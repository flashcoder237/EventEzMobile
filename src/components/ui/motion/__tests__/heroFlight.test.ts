/**
 * T1 / T14 — registre du vol carte → fiche : la capture n'est consommée que
 * par la navigation qu'elle concerne, une seule fois, et jamais périmée.
 */
import {
  heroScreenOptions,
  isHeroFresh,
  takeHeroOrigin,
  withHeroOrigin,
  type HeroParam,
} from '../HeroFlight';

const fresh = (over: Partial<HeroParam> = {}): HeroParam => ({
  token: 'hero-x',
  key: 'evt-1',
  rect: { x: 10, y: 200, width: 300, height: 160 },
  radius: 16,
  at: Date.now(),
  ...over,
});

describe('HeroFlight — registre', () => {
  it('sans capture, les paramètres de route sont inchangés', () => {
    const params = { eventId: 'evt-1' };
    expect(withHeroOrigin(params, 'evt-1')).toBe(params);
    expect(takeHeroOrigin('evt-1')).toBeUndefined();
  });

  it('un vol récent est « frais », un vol ancien (état restauré) ne l’est pas', () => {
    expect(isHeroFresh(fresh())).toBe(true);
    expect(isHeroFresh(fresh({ at: Date.now() - 60_000 }))).toBe(false);
    expect(isHeroFresh(undefined)).toBe(false);
  });

  it('options d’écran : fondu court seulement quand un vol va jouer', () => {
    expect(heroScreenOptions({ hero: fresh() })).toEqual({ animation: 'fade', animationDuration: 200 });
    expect(heroScreenOptions({ hero: fresh({ at: 0 }) })).toEqual({});
    expect(heroScreenOptions(undefined)).toEqual({});
  });
});
