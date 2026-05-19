/**
 * Formatting helpers extracted from EventCard component.
 * Pure functions — no dependency on React or theme colors.
 */

import { formatPriceRange, displayCurrency } from './priceFormatters';

// ---------- Types ----------

export interface CardPriceParams {
  isFree: boolean;
  price?: string | number;
  priceMax?: number;
  currency: string;
  eventType?: 'billetterie' | 'inscription';
  /** Optional translation function. If absent, falls back to French strings (for back-compat). */
  t?: (key: string, options?: any) => string;
}

// ---------- Price formatting ----------

/**
 * Build the display string for an event card price.
 *
 * Examples:
 *  - free event → "Gratuit"
 *  - range 5000–10000 FCFA → "5 000 - 10 000 FCFA"
 *  - single price 3000 → "Des 3 000 FCFA"
 *  - inscription without price → "Gratuit"
 *  - fallback → "Prix variable"
 */
export function formatCardPrice(params: CardPriceParams): string {
  const { isFree, price, priceMax, currency, eventType, t } = params;
  const tx = t ?? ((k: string) => {
    // Fallback labels — used when no translation function is provided
    // (e.g. unit tests or legacy call sites).
    if (k === 'componentsEvents.priceFree') return 'Gratuit';
    if (k === 'componentsEvents.priceFromShort') return `Des {{price}} {{currency}}`;
    if (k === 'componentsEvents.priceVariable') return 'Prix variable';
    return k;
  });

  if (isFree) return tx('componentsEvents.priceFree');

  if (
    typeof price === 'number' &&
    typeof priceMax === 'number' &&
    price > 0 &&
    priceMax > price
  ) {
    return formatPriceRange(price, priceMax, currency);
  }

  if (typeof price === 'number' && price > 0) {
    // Séparateur de milliers via regex pour rester portable : `toLocaleString()`
    // sans argument utilise la locale du runtime (espace insécable sur Windows
    // FR, virgule sur Ubuntu en-US par défaut) → snapshot non-portable et
    // affichage incohérent entre devices. La regex donne toujours "5 000".
    const formattedPrice = Math.round(price)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return tx('componentsEvents.priceFromShort', { price: formattedPrice, currency: displayCurrency(currency) });
  }

  if (typeof price === 'number' && price === 0) return tx('componentsEvents.priceFree');

  if (typeof price === 'string' && price.trim()) return price;

  if (eventType === 'inscription') return tx('componentsEvents.priceFree');

  return tx('componentsEvents.priceVariable');
}

/**
 * Short price string (currently identical to `formatCardPrice`
 * but kept as a separate entry-point for future divergence).
 */
export function formatPriceShort(params: CardPriceParams): string {
  return formatCardPrice(params);
}

// ---------- Date formatting ----------

/**
 * Full accent date string used in most card variants.
 *
 * Example: "MAR. 15 JAN · 19:30"
 */
export function formatDateAccent(date: string, locale: string = 'fr-FR'): string {
  try {
    const eventDate = new Date(date);
    const day = eventDate
      .toLocaleDateString(locale, { weekday: 'short' })
      .slice(0, 3)
      .toUpperCase();
    const dayNum = eventDate.getDate();
    const month = eventDate
      .toLocaleDateString(locale, { month: 'short' })
      .toUpperCase();
    const timeStr = eventDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${day}. ${dayNum} ${month} · ${timeStr}`;
  } catch {
    return 'Date TBA';
  }
}

/**
 * Shorter date without the time component.
 *
 * Example: "MAR 15 JAN"
 */
export function formatDateShort(date: string, locale: string = 'fr-FR'): string {
  try {
    const eventDate = new Date(date);
    const day = eventDate
      .toLocaleDateString(locale, { weekday: 'short' })
      .slice(0, 3)
      .toUpperCase();
    const dayNum = eventDate.getDate();
    const month = eventDate
      .toLocaleDateString(locale, { month: 'short' })
      .toUpperCase();
    return `${day} ${dayNum} ${month}`;
  } catch {
    return 'Date TBA';
  }
}
