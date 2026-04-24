import {
  formatPrice,
  formatPriceRange,
  getEventPrice,
  getEventPriceRange,
} from '../priceFormatters';
import type { Event } from '../../../types';

function makeEvent(partial: Partial<Event>): Event {
  return {
    id: 'evt-1',
    title: 'Test event',
    ...(partial as any),
  } as Event;
}

const NBSP = ' '; // NBSP used as French thousands separator
const SP = ' '; // regular ASCII space for label separators
const fcfa = (digits: string) => `${digits}${SP}FCFA`;

describe('formatPrice', () => {
  it('returns "Gratuit" for 0', () => {
    expect(formatPrice(0)).toBe('Gratuit');
  });

  it('formats integer with default FCFA currency', () => {
    expect(formatPrice(5000)).toBe(fcfa(`5${NBSP}000`));
  });

  it('uses space as thousands separator', () => {
    expect(formatPrice(1234567)).toBe(fcfa(`1${NBSP}234${NBSP}567`));
  });

  it('uses custom currency', () => {
    expect(formatPrice(100, 'EUR')).toBe(`100${SP}EUR`);
  });

  it('rounds decimal amounts', () => {
    expect(formatPrice(1999.5)).toBe(fcfa(`2${NBSP}000`));
  });

  it('handles very large numbers', () => {
    expect(formatPrice(999999999)).toBe(fcfa(`999${NBSP}999${NBSP}999`));
  });
});

describe('formatPriceRange', () => {
  it('returns single formatPrice when min == max', () => {
    expect(formatPriceRange(5000, 5000)).toBe(fcfa(`5${NBSP}000`));
  });

  it('returns "Gratuit" when both are 0', () => {
    expect(formatPriceRange(0, 0)).toBe('Gratuit');
  });

  it('returns "Gratuit - X" when min is 0 and max positive', () => {
    expect(formatPriceRange(0, 10000)).toBe(
      `Gratuit${SP}-${SP}10${NBSP}000${SP}FCFA`,
    );
  });

  it('returns range when both are positive', () => {
    expect(formatPriceRange(5000, 10000)).toBe(
      `5${NBSP}000${SP}-${SP}10${NBSP}000${SP}FCFA`,
    );
  });

  it('accepts custom currency', () => {
    expect(formatPriceRange(10, 20, 'EUR')).toBe(`10${SP}-${SP}20${SP}EUR`);
  });
});

describe('getEventPrice', () => {
  it('returns 0 when is_free', () => {
    expect(getEventPrice(makeEvent({ is_free: true }))).toBe(0);
  });

  it('returns base_price when positive', () => {
    expect(getEventPrice(makeEvent({ base_price: 5000 }))).toBe(5000);
  });

  it('returns min_price if base_price is 0 or missing', () => {
    expect(getEventPrice(makeEvent({ min_price: 3000 }))).toBe(3000);
  });

  it('computes min from ticket_types when available', () => {
    expect(
      getEventPrice(
        makeEvent({
          ticket_types: [
            { price: 10000 } as any,
            { price: 5000 } as any,
            { price: 7500 } as any,
          ],
        }),
      ),
    ).toBe(5000);
  });

  it('prefers base_price over ticket_types', () => {
    expect(
      getEventPrice(
        makeEvent({
          base_price: 2000,
          ticket_types: [{ price: 99999 } as any],
        }),
      ),
    ).toBe(2000);
  });

  it('returns 0 for inscription events with no price', () => {
    expect(getEventPrice(makeEvent({ event_type: 'inscription' }))).toBe(0);
  });

  it('returns undefined when no price info', () => {
    expect(
      getEventPrice(makeEvent({ event_type: 'billetterie' })),
    ).toBeUndefined();
  });
});

describe('getEventPriceRange', () => {
  it('returns {0,0} for is_free', () => {
    expect(getEventPriceRange(makeEvent({ is_free: true }))).toEqual({
      min: 0,
      max: 0,
    });
  });

  it('computes min/max from ticket_types', () => {
    expect(
      getEventPriceRange(
        makeEvent({
          ticket_types: [
            { price: 5000 } as any,
            { price: 10000 } as any,
            { price: 7500 } as any,
          ],
        }),
      ),
    ).toEqual({ min: 5000, max: 10000 });
  });

  it('filters non-positive ticket prices', () => {
    expect(
      getEventPriceRange(
        makeEvent({
          ticket_types: [
            { price: 0 } as any,
            { price: -100 } as any,
            { price: 3000 } as any,
          ],
        }),
      ),
    ).toEqual({ min: 3000, max: 3000 });
  });

  it('falls back to min_price/max_price', () => {
    expect(
      getEventPriceRange(makeEvent({ min_price: 1000, max_price: 2000 })),
    ).toEqual({ min: 1000, max: 2000 });
  });

  it('falls back to base_price', () => {
    expect(getEventPriceRange(makeEvent({ base_price: 2500 }))).toEqual({
      min: 2500,
      max: 2500,
    });
  });

  it('returns {0,0} for inscription without price', () => {
    expect(
      getEventPriceRange(makeEvent({ event_type: 'inscription' })),
    ).toEqual({ min: 0, max: 0 });
  });

  it('returns undefined when no info', () => {
    expect(
      getEventPriceRange(makeEvent({ event_type: 'billetterie' })),
    ).toBeUndefined();
  });
});
