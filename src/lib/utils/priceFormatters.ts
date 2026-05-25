/**
 * Utilitaires de formatage de prix pour l'application EventEz Mobile
 * Devise par defaut: FCFA (Franc CFA)
 */

import { Event } from '../../types';

/**
 * Transforme un code ISO 4217 en label d'affichage utilisateur.
 * Convention de l'app : XAF/XOF (Francs CFA) → "FCFA" (label friendly).
 * Autres devises : retournees telles quelles (EUR, USD, GBP, etc.).
 *
 * À utiliser PARTOUT où on affiche une devise à l'utilisateur (cartes
 * billet, détails événement, paiements, wallet, etc.) pour garantir un
 * affichage homogène.
 */
export function displayCurrency(currency: string | null | undefined): string {
  if (!currency) return 'FCFA';
  const upper = currency.toUpperCase();
  if (upper === 'XAF' || upper === 'XOF') return 'FCFA';
  return upper;
}

/**
 * Calcule le prix d'un evenement a partir des differentes sources disponibles.
 * Retourne le prix minimum ou undefined si le prix est inconnu.
 */
export function getEventPrice(event: Event): number | undefined {
  // If explicitly free
  if (event.is_free) return 0;

  // Try direct price fields
  if (typeof event.base_price === 'number' && event.base_price > 0) return event.base_price;
  if (typeof event.min_price === 'number' && event.min_price > 0) return event.min_price;

  // Calculate from ticket_types if available
  if (event.ticket_types && event.ticket_types.length > 0) {
    const prices = event.ticket_types.map(t => t.price).filter(p => typeof p === 'number');
    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }

  // For inscription type without price, consider free
  if (event.event_type === 'inscription') return 0;

  return undefined;
}

/**
 * Formate un montant avec separateur de milliers et devise.
 * Exemple: formatPrice(5000) => "5 000 FCFA"
 * Exemple: formatPrice(0) => "Gratuit"
 */
export function formatPrice(amount: number, currency: string = 'FCFA'): string {
  if (amount === 0) return 'Gratuit';

  // Format number with space as thousands separator (French convention)
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${formatted} ${displayCurrency(currency)}`;
}

/**
 * Formate UNIQUEMENT le nombre, sans devise.
 * A utiliser quand l'UI affiche la devise dans un composant separe (typique
 * du WalletScreen ou un <Text> dedie montre wallet.currency a cote du
 * montant). Evite l'affichage double "5 000 FCFA EUR" qui survenait quand
 * formatPrice() defaulte sur FCFA mais la devise reelle est differente.
 *
 * Exemple : formatPriceAmount(5000) => "5 000"
 *           formatPriceAmount(0)    => "0"
 */
export function formatPriceAmount(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Calcule la fourchette de prix (min et max) d'un evenement.
 * Retourne undefined si le prix est inconnu.
 */
export function getEventPriceRange(event: Event): { min: number; max: number } | undefined {
  if (event.is_free) return { min: 0, max: 0 };

  if (event.ticket_types && event.ticket_types.length > 0) {
    const prices = event.ticket_types
      .map(t => t.price)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    if (prices.length > 0) {
      return { min: Math.min(...prices), max: Math.max(...prices) };
    }
  }

  if (typeof event.min_price === 'number' && typeof event.max_price === 'number') {
    return { min: event.min_price, max: event.max_price };
  }

  if (typeof event.base_price === 'number' && event.base_price > 0) {
    return { min: event.base_price, max: event.base_price };
  }

  if (event.event_type === 'inscription') return { min: 0, max: 0 };

  return undefined;
}

/**
 * Formate une fourchette de prix.
 * Exemple: formatPriceRange(5000, 10000) => "5 000 - 10 000 FCFA"
 * Si min et max sont egaux: "5 000 FCFA"
 * Si min est 0: "Gratuit - 10 000 FCFA"
 */
export function formatPriceRange(min: number, max: number, currency: string = 'FCFA'): string {
  if (min === max) {
    return formatPrice(min, currency);
  }

  if (min === 0 && max === 0) {
    return 'Gratuit';
  }

  const formatNum = (n: number): string =>
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  if (min === 0) {
    return `Gratuit - ${formatNum(max)} ${displayCurrency(currency)}`;
  }

  return `${formatNum(min)} - ${formatNum(max)} ${displayCurrency(currency)}`;
}
