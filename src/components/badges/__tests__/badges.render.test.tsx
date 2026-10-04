/**
 * Garde-fou des badges, paliers et emblèmes (fichiers générés — voir
 * design-handoff/eventez-svg-redesign/INTEGRATION.md).
 *
 * En plus du rendu, on vérifie le point qui casserait l'écran de gamification
 * sans bruit : la table BADGE_ART doit couvrir exactement les noms que le
 * backend envoie, et la variante verrouillée doit vraiment différer de l'active.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import * as Badges from '../index';
import { badgeArt, hasBadgeArt, tierArt } from '../index';

const HELPERS = new Set(['badgeArt', 'hasBadgeArt', 'tierArt']);

const arts = Object.entries(Badges).filter(
  ([name, v]) => typeof v === 'function' && !HELPERS.has(name)
) as [string, React.ComponentType<{ color?: string; size?: number }>][];

// Noms stockés par le backend (format Lucide), alignés sur BADGE_ICONS
// de GamificationScreen.
const BACKEND_NAMES = [
  'award', 'calendar', 'check-circle', 'crown', 'flag', 'heart',
  'message-circle', 'rocket', 'star', 'thumbs-up', 'trending-up',
  'trophy', 'users', 'zap',
];

const draws = (tree: any) => (tree?.children?.length ?? 0) > 0;

describe('badges', () => {
  it('exporte le lot complet', () => {
    // 47 badges (14 × 3 variantes + 5 paliers) + 9 emblèmes.
    expect(arts.length).toBe(56);
  });

  it.each(arts)('%s se rend sans erreur', (_name, Art) => {
    expect(draws(render(<Art />).toJSON())).toBe(true);
  });

  it.each(arts)('%s applique la prop size', (_name, Art) => {
    const tree: any = render(<Art size={40} />).toJSON();
    expect(tree.props.width).toBe(40);
    expect(tree.props.height).toBe(40);
  });

  it.each(arts)('%s ne laisse aucun dégradé orphelin', (_name, Art) => {
    const s = JSON.stringify(render(<Art />).toJSON());
    for (const id of [...s.matchAll(/"brushRef":"([^"]+)"/g)].map((m) => m[1])) {
      expect(s).toContain(`"name":"${id}"`);
    }
  });
});

describe('badgeArt', () => {
  it.each(BACKEND_NAMES)('connaît le badge backend « %s »', (name) => {
    expect(hasBadgeArt(name)).toBe(true);
    const Art = badgeArt(name);
    expect(draws(render(<Art />).toJSON())).toBe(true);
  });

  it.each(BACKEND_NAMES)('« %s » verrouillé diffère de l’obtenu', (name) => {
    // Si les deux rendus sont identiques, c'est que la variante grisée n'a pas
    // été câblée et qu'un badge non obtenu s'affiche comme acquis.
    const on = JSON.stringify(render(React.createElement(badgeArt(name, true))).toJSON());
    const off = JSON.stringify(render(React.createElement(badgeArt(name, false))).toJSON());
    expect(on).not.toEqual(off);
  });

  it('tolère la casse et les espaces', () => {
    expect(hasBadgeArt('  TROPHY ')).toBe(true);
  });

  it('retombe sur un visuel pour un nom inconnu', () => {
    // Un badge ajouté en admin ne doit pas faire disparaître la vignette.
    expect(hasBadgeArt('badge-invente-en-admin')).toBe(false);
    const Art = badgeArt('badge-invente-en-admin');
    expect(draws(render(<Art />).toJSON())).toBe(true);
  });

  it('tolère null et undefined', () => {
    expect(draws(render(React.createElement(badgeArt(null))).toJSON())).toBe(true);
    expect(draws(render(React.createElement(badgeArt(undefined))).toJSON())).toBe(true);
  });
});

describe('tierArt', () => {
  it.each([1, 2, 3, 4, 5])('palier %i a son visuel', (lvl) => {
    const Art = tierArt(lvl);
    expect(draws(render(<Art />).toJSON())).toBe(true);
  });

  it('borne les niveaux hors plage', () => {
    const first = JSON.stringify(render(React.createElement(tierArt(1))).toJSON());
    const last = JSON.stringify(render(React.createElement(tierArt(5))).toJSON());
    expect(JSON.stringify(render(React.createElement(tierArt(0))).toJSON())).toEqual(first);
    expect(JSON.stringify(render(React.createElement(tierArt(-3))).toJSON())).toEqual(first);
    expect(JSON.stringify(render(React.createElement(tierArt(99))).toJSON())).toEqual(last);
  });

  it('les cinq paliers sont des dessins distincts', () => {
    const seen = [1, 2, 3, 4, 5].map((l) =>
      JSON.stringify(render(React.createElement(tierArt(l))).toJSON())
    );
    expect(new Set(seen).size).toBe(5);
  });
});
