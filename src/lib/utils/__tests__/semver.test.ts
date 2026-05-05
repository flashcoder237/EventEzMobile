/**
 * Tests du helper semver minimal.
 *
 * Le force-update gate dépend de cette comparaison — un faux positif sur
 * `isVersionBelow` bloquerait l'app pour rien, un faux négatif laisserait
 * passer une version cassée. Donc bonne couverture des cas tordus.
 */

import { compareSemver, isVersionBelow, parseSemver } from '../semver';

describe('parseSemver', () => {
  it('parse les versions standard', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('0.0.1')).toEqual([0, 0, 1]);
    expect(parseSemver('10.20.30')).toEqual([10, 20, 30]);
  });

  it('étend les versions courtes', () => {
    expect(parseSemver('1.0')).toEqual([1, 0, 0]);
    expect(parseSemver('2')).toEqual([2, 0, 0]);
  });

  it('ignore le suffixe pre-release', () => {
    expect(parseSemver('1.2.3-rc1')).toEqual([1, 2, 3]);
    expect(parseSemver('1.0.0-beta.5')).toEqual([1, 0, 0]);
  });

  it('renvoie null pour les inputs invalides', () => {
    expect(parseSemver('')).toBeNull();
    expect(parseSemver(null)).toBeNull();
    expect(parseSemver(undefined)).toBeNull();
    expect(parseSemver('not.a.version')).toBeNull();
    expect(parseSemver('1.2.3.4')).toBeNull(); // > 3 segments
    expect(parseSemver('-1.0.0')).toBeNull(); // négatif
    expect(parseSemver('1.a.0')).toBeNull(); // segment non-numérique
  });
});

describe('compareSemver', () => {
  it('renvoie -1, 0, 1 selon l\'ordre', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('compare segment par segment (major > minor > patch)', () => {
    expect(compareSemver('2.0.0', '1.99.99')).toBe(1);
    expect(compareSemver('1.2.0', '1.1.99')).toBe(1);
    expect(compareSemver('1.0.10', '1.0.9')).toBe(1);
  });

  it('considère équivalentes les versions courtes étendues', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1', '1.0.0')).toBe(0);
  });

  it('renvoie 0 (no-op) si une des versions est invalide', () => {
    // Important : un bug de comparaison ne doit pas bloquer l'app
    expect(compareSemver('', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '')).toBe(0);
    expect(compareSemver('garbage', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', 'garbage')).toBe(0);
  });

  it('ignore le suffix pre-release pour la comparaison', () => {
    // Choix délibéré : 1.2.3-rc1 et 1.2.3 sont considérés équivalents.
    // Ça veut dire qu'un user en build 1.2.3 stable n'est pas considéré
    // "inférieur" à un min_supported '1.2.3-rc1' (qui n'aurait pas de sens
    // de toute façon en config de force-update).
    expect(compareSemver('1.2.3-rc1', '1.2.3')).toBe(0);
  });
});

describe('isVersionBelow', () => {
  it('true seulement si actual strictement inférieur à required', () => {
    expect(isVersionBelow('1.0.0', '2.0.0')).toBe(true);
    expect(isVersionBelow('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelow('2.0.0', '1.0.0')).toBe(false);
    expect(isVersionBelow('1.0.0', '1.0.0')).toBe(false);
  });

  it('false sur input invalide (no-op safe)', () => {
    expect(isVersionBelow('', '1.0.0')).toBe(false);
    expect(isVersionBelow('1.0.0', '')).toBe(false);
  });
});
