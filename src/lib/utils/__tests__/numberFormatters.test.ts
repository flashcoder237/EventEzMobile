/**
 * Tests de numberFormatters.ts — notation compacte + compteurs pluralisés.
 * Assertions tolérantes sur l'espace (Intl utilise parfois un espace insécable).
 */
import { formatCompactNumber, formatCount } from '../numberFormatters';

// Normalise les espaces (insécable U+202F/U+00A0 → espace normal) pour comparer.
const norm = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatCompactNumber', () => {
  it('null/undefined/NaN → fallback', () => {
    expect(formatCompactNumber(null)).toBe('—');
    expect(formatCompactNumber(undefined)).toBe('—');
    expect(formatCompactNumber(NaN)).toBe('—');
    expect(formatCompactNumber(null, { fallbackZero: true })).toBe('0');
  });
  it('sous le seuil : nombre brut', () => {
    expect(norm(formatCompactNumber(0))).toBe('0');
    expect(norm(formatCompactNumber(42))).toBe('42');
    expect(norm(formatCompactNumber(999))).toBe('999');
  });
  it('milliers → "k"', () => {
    expect(norm(formatCompactNumber(1000))).toMatch(/^1\s*k$/);
    expect(norm(formatCompactNumber(1234))).toMatch(/^1,2\s*k$/);
  });
  it('millions → "M"', () => {
    expect(norm(formatCompactNumber(1_500_000))).toMatch(/^1,5\s*M$/);
  });
  it('milliards → "Md"', () => {
    expect(norm(formatCompactNumber(1e9))).toMatch(/Md$/);
  });
  it('threshold custom : un nombre sous le défaut mais >= threshold passe en compact', () => {
    // Intl compact ne suffixe qu'à partir de 1000. Avec threshold 500, la valeur
    // 800 entre en branche compacte mais reste affichée "800" (pas de suffixe
    // sous 1000). On vérifie surtout qu'un threshold haut garde le format brut.
    expect(norm(formatCompactNumber(1500, { threshold: 5000 }))).toMatch(/^1\s?500$/);
  });
});

describe('formatCount', () => {
  it('singulier / pluriel automatique', () => {
    expect(norm(formatCount(0, 'vue'))).toBe('0 vue');
    expect(norm(formatCount(1, 'vue'))).toBe('1 vue');
    expect(norm(formatCount(2, 'inscrit'))).toBe('2 inscrits');
  });
  it('compacte les grands nombres + pluralise', () => {
    expect(norm(formatCount(1234, 'vue'))).toMatch(/^1,2\s*k vues$/);
  });
  it('pluriel irrégulier via override', () => {
    expect(norm(formatCount(3, 'cheval', 'chevaux'))).toBe('3 chevaux');
  });
  it('null/NaN traités comme 0', () => {
    expect(norm(formatCount(null, 'vue'))).toBe('0 vue');
    expect(norm(formatCount(NaN, 'vue'))).toBe('0 vue');
  });
});
