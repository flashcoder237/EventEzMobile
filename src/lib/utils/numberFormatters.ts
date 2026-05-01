/**
 * Number formatters — compact notation pour compteurs sociaux (vues, followers,
 * inscrits, etc.) afin que des valeurs très grandes ne cassent pas les layouts.
 *
 * À utiliser pour les "stats" dont la précision exacte n'a pas d'importance
 * d'affichage (1.247 vues vs "1,2 k" — l'utilisateur s'en fiche).
 *
 * NE PAS utiliser pour :
 *  - les montants en devise (utilise `priceFormatters` / `toLocaleString`)
 *  - les quantités (ex: "×3 billets" — précision nécessaire)
 *  - les références numériques (IDs, codes)
 */

/**
 * Formate un nombre en notation compacte française.
 *
 * Exemples :
 *   formatCompactNumber(0)         → "0"
 *   formatCompactNumber(42)        → "42"
 *   formatCompactNumber(999)       → "999"
 *   formatCompactNumber(1_000)     → "1 k"
 *   formatCompactNumber(1_234)     → "1,2 k"
 *   formatCompactNumber(12_500)    → "13 k"
 *   formatCompactNumber(999_999)   → "1 M"
 *   formatCompactNumber(1_500_000) → "1,5 M"
 *   formatCompactNumber(1e9)       → "1 Md"
 *
 * Sous le seuil (< 1000 par défaut), on garde le nombre brut formaté locale.
 * `Intl.NumberFormat` avec `notation: 'compact'` est supporté par Hermes /
 * V8 / JSC modernes (iOS 13+, Android 11+ ; sur RN Hermes le support est
 * complet depuis ~0.71).
 */
export function formatCompactNumber(
  value: number | null | undefined,
  options?: {
    /** Seuil sous lequel on n'utilise pas la notation compacte. Défaut 1000. */
    threshold?: number;
    /** Locale. Défaut 'fr-FR'. */
    locale?: string;
    /** Si true, retourne '0' pour null/undefined (par défaut '—'). */
    fallbackZero?: boolean;
  },
): string {
  if (value == null || !Number.isFinite(value)) {
    return options?.fallbackZero ? '0' : '—';
  }

  const threshold = options?.threshold ?? 1000;
  const locale = options?.locale ?? 'fr-FR';

  // Sous le seuil : format normal avec séparateurs de milliers locale (rare ici).
  if (Math.abs(value) < threshold) {
    return new Intl.NumberFormat(locale).format(value);
  }

  // Notation compacte : "1,2 k", "12 M", "1,5 Md"
  // maximumFractionDigits 1 : on garde 1 décimale pour les petits multiples
  // (ex: 1.2k, 1.5M) mais 0 pour les grands (ex: 12k pas 12.5k — déjà compact).
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
      compactDisplay: 'short',
    }).format(value);
  } catch {
    // Fallback si l'engine ne supporte pas notation:'compact' (vieux RN)
    return formatCompactFallback(value);
  }
}

/**
 * Fallback manuel si Intl.NumberFormat compact n'est pas dispo. Garde le
 * même style français : "1,2 k", "1,5 M", "1 Md".
 */
function formatCompactFallback(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const fmt = (n: number) => {
    const rounded = Math.round(n * 10) / 10;
    return rounded.toString().replace('.', ',');
  };

  if (abs >= 1e9) return `${sign}${fmt(abs / 1e9)} Md`;
  if (abs >= 1e6) return `${sign}${fmt(abs / 1e6)} M`;
  if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)} k`;
  return value.toString();
}

/**
 * Formate un nombre avec son label pluralisé en français.
 *
 * Exemples :
 *   formatCount(0, 'vue')       → "0 vue"
 *   formatCount(1, 'vue')       → "1 vue"
 *   formatCount(1234, 'vue')    → "1,2 k vues"
 *   formatCount(2, 'inscrit')   → "2 inscrits"
 *   formatCount(0, 'follower')  → "0 follower"
 *
 * Utile pour des labels rapides sans répétition de la logique compact + plural.
 */
export function formatCount(
  value: number | null | undefined,
  singular: string,
  plural?: string,
): string {
  const safe = value == null || !Number.isFinite(value) ? 0 : value;
  const formatted = formatCompactNumber(safe, { fallbackZero: true });
  // Pluralisation simple FR : ajoute 's' si > 1, sinon singular tel quel.
  // Override `plural` pour les pluriels irréguliers (ex: 'cheval' → 'chevaux').
  const noun = safe > 1 ? (plural ?? `${singular}s`) : singular;
  return `${formatted} ${noun}`;
}
