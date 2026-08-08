/**
 * Tests de lib/countryNames.ts — résolution tolérante des noms de pays natifs
 * (endonymes) renvoyés par le reverse-geocoding. Régression : faux
 * "Pays non disponible" à la création d'event (Deutschland, España...).
 */
import { normalizeCountryKey, resolveEndonymCode } from '../countryNames';

describe('normalizeCountryKey', () => {
  it('minuscule + supprime les accents', () => {
    expect(normalizeCountryKey('Allemagne')).toBe('allemagne');
    expect(normalizeCountryKey('DEUTSCHLAND')).toBe('deutschland');
    expect(normalizeCountryKey('Émirats')).toBe('emirats');
    expect(normalizeCountryKey('  España  ')).toBe('espana');
  });
});

describe('resolveEndonymCode', () => {
  it('résout les endonymes latins vers le bon code ISO', () => {
    expect(resolveEndonymCode('Deutschland')).toBe('DE');
    expect(resolveEndonymCode('deutschland')).toBe('DE');
    expect(resolveEndonymCode('España')).toBe('ES');
    expect(resolveEndonymCode('Italia')).toBe('IT');
    expect(resolveEndonymCode('Nederland')).toBe('NL');
    expect(resolveEndonymCode('België')).toBe('BE');
    expect(resolveEndonymCode('Österreich')).toBe('AT');
    expect(resolveEndonymCode('Brasil')).toBe('BR');
  });

  it('résout les scripts non-latins', () => {
    expect(resolveEndonymCode('日本')).toBe('JP');
    expect(resolveEndonymCode('香港')).toBe('HK');
  });

  it('retourne null pour un endonyme inconnu ou une valeur vide', () => {
    expect(resolveEndonymCode('Wakanda')).toBeNull();
    expect(resolveEndonymCode('')).toBeNull();
    expect(resolveEndonymCode(null)).toBeNull();
    expect(resolveEndonymCode(undefined)).toBeNull();
  });
});
