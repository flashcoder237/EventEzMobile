import { compactPriceLabel } from '../eventCardFormatters';

// t minimal qui interpole comme i18next.
const L: Record<string, string> = {
  'componentsEvents.priceFree': 'Gratuit',
  'componentsEvents.priceFromShort': 'Dès {{price}} {{currency}}',
};
const t = (k: string, o: any = {}) =>
  (L[k] ?? k).replace(/\{\{(\w+)\}\}/g, (_m, n) => String(o[n] ?? ''));
describe('compactPriceLabel — carte « Événements similaires »', () => {
  it('prix unique → « à partir de »', () => {
    expect(compactPriceLabel({ ticket_price_range: '100.00 XAF' }, t)).toBe('Dès 100 FCFA');
  });

  it('fourchette → le plus petit prix payant', () => {
    expect(compactPriceLabel({ ticket_price_range: '2500.00 - 10000.00 XAF' }, t)).toBe('Dès 2 500 FCFA');
  });

  it('fourchette avec un tarif gratuit → plus petit tarif PAYANT', () => {
    expect(compactPriceLabel({ ticket_price_range: '0.00 - 5000.00 EUR' }, t)).toMatch(/^Dès 5 000/);
  });

  it('tout à 0 ou is_free → Gratuit', () => {
    expect(compactPriceLabel({ ticket_price_range: '0.00 XAF' }, t)).toBe('Gratuit');
    expect(compactPriceLabel({ is_free: true }, t)).toBe('Gratuit');
  });

  it('info absente du payload → null (on n’invente rien)', () => {
    expect(compactPriceLabel({})).toBeNull();
    expect(compactPriceLabel({ ticket_price_range: '' })).toBeNull();
  });
});
