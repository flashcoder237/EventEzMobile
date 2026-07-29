/**
 * Tests groupés : messagingHelpers, statusConfig, eventCardFormatters,
 * categoryLabel — fonctions à logique (au-delà des simples formatages date).
 */
jest.mock('../../../i18n', () => ({
  __esModule: true,
  default: { t: (k: string) => (k === 'categories.concert' ? 'Concert' : k) },
}));

import { formatDuration, isMyMessage, shouldShowDateSeparator } from '../messagingHelpers';
import { getStatusConfig, registrationStatusConfig } from '../statusConfig';
import { formatCardPrice } from '../eventCardFormatters';
import { getCategoryLabel } from '../categoryLabel';

describe('messagingHelpers.formatDuration', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [65, '1:05'],
    [600, '10:00'],
    [3661, '61:01'],
  ])('formatDuration(%i) = %s', (sec, expected) => {
    expect(formatDuration(sec)).toBe(expected);
  });
});

describe('messagingHelpers.isMyMessage', () => {
  it('false si userId absent', () => {
    expect(isMyMessage({ sender: 1 } as any, undefined)).toBe(false);
  });
  it('compare sender numérique', () => {
    expect(isMyMessage({ sender: 42 } as any, 42)).toBe(true);
    expect(isMyMessage({ sender: 42 } as any, 7)).toBe(false);
  });
  it('compare sender string', () => {
    expect(isMyMessage({ sender: '42' } as any, 42)).toBe(true);
  });
  it('compare sender objet {id}', () => {
    expect(isMyMessage({ sender: { id: 9 } } as any, '9')).toBe(true);
  });
});

describe('messagingHelpers.shouldShowDateSeparator', () => {
  const msg = (d: string) => ({ created_at: d } as any);
  it('true pour le dernier message (le plus ancien)', () => {
    const list = [msg('2026-01-02'), msg('2026-01-01')];
    expect(shouldShowDateSeparator(list, 1)).toBe(true);
  });
  it('true quand le jour change avec le message suivant', () => {
    const list = [msg('2026-01-02T10:00'), msg('2026-01-01T10:00')];
    expect(shouldShowDateSeparator(list, 0)).toBe(true);
  });
  it('false quand même jour', () => {
    const list = [msg('2026-01-02T18:00'), msg('2026-01-02T09:00')];
    expect(shouldShowDateSeparator(list, 0)).toBe(false);
  });
});

describe('statusConfig.getStatusConfig', () => {
  it('retourne la config d\'un statut connu', () => {
    const known = Object.keys(registrationStatusConfig)[0];
    expect(getStatusConfig('registration', known)).toBe(registrationStatusConfig[known]);
  });
  it('fallback pour un statut inconnu', () => {
    const cfg = getStatusConfig('registration', 'statut_bidon');
    expect(cfg).toBeDefined();
    expect(cfg.label).toBeDefined();
  });
  it('fallback pour un type inconnu', () => {
    expect(getStatusConfig('nimporte' as any, 'x')).toBeDefined();
  });
  it('gère les 3 types', () => {
    expect(getStatusConfig('payment', 'completed')).toBeDefined();
    expect(getStatusConfig('event', 'validated')).toBeDefined();
  });
});

describe('eventCardFormatters.formatCardPrice', () => {
  // `t` d'interpolation minimal (le fallback interne ne substitue pas {{...}}).
  const t = (k: string, vars?: Record<string, any>) => {
    if (k === 'componentsEvents.priceFree') return 'Gratuit';
    if (k === 'componentsEvents.priceFromShort') return `Dès ${vars?.price} ${vars?.currency}`;
    return k;
  };

  it('gratuit → "Gratuit"', () => {
    expect(formatCardPrice({ isFree: true, currency: 'XAF', t } as any)).toBe('Gratuit');
  });
  // \s matche tout séparateur d'espace (normal, insécable, fin…).
  it('prix unique → séparateur de milliers "5 000"', () => {
    const out = formatCardPrice({ isFree: false, price: 5000, currency: 'XAF', t } as any);
    expect(out).toMatch(/5\s000/);
  });
  it('gamme de prix → contient les deux bornes', () => {
    const out = formatCardPrice({ isFree: false, price: 1000, priceMax: 5000, currency: 'XAF', t } as any);
    expect(out).toMatch(/1\s000/);
    expect(out).toMatch(/5\s000/);
  });
  it('priceMax <= price → prix unique (pas de range)', () => {
    const out = formatCardPrice({ isFree: false, price: 5000, priceMax: 3000, currency: 'XAF', t } as any);
    expect(out).toMatch(/5\s000/);
  });
});

describe('categoryLabel.getCategoryLabel', () => {
  it('null/undefined → ""', () => {
    expect(getCategoryLabel(null)).toBe('');
    expect(getCategoryLabel(undefined)).toBe('');
  });
  it('priorité au name', () => {
    expect(getCategoryLabel({ name: 'Musique', slug: 'concert' } as any)).toBe('Musique');
  });
  it('retombe sur la traduction du slug', () => {
    expect(getCategoryLabel({ name: '', slug: 'concert' } as any)).toBe('Concert');
  });
  it('slug non traduit → ""', () => {
    expect(getCategoryLabel({ name: '', slug: 'inexistant' } as any)).toBe('');
  });
});
