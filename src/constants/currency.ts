/**
 * Detection de devise + cache des taux de conversion.
 *
 * Source unique de verite pour `useCurrencyConversion` ET `FXIndicator`
 * cote mobile — eviter la divergence qu'on avait avant (FXIndicator
 * connaissait 14 pays, useCurrencyConversion en connaissait 70+, donc
 * sur le meme ecran on pouvait avoir 2 conversions differentes).
 *
 * La liste de devises supportees doit rester en phase avec celle du
 * backend `apps/payments/country_config.py:EXCHANGE_RATES`. Le hook
 * verifie aussi `is_supported_currency` en pratique : si le backend
 * renvoie `unsupported_currency`, on masque l'indicateur.
 */

// Map locale precis (lang-country) vers devise. Pour les cas ou le meme
// pays a plusieurs devises selon la langue (CH = CHF/EUR mixte) ou le
// meme pays est ambigu (CA = CAD pour fr-CA / en-CA).
export const LOCALE_TO_CURRENCY: Record<string, string> = {
  'fr-FR': 'EUR',
  'fr-BE': 'EUR',
  'fr-CH': 'CHF',
  'fr-CA': 'CAD',
  'en-US': 'USD',
  'en-GB': 'GBP',
  'en-CA': 'CAD',
  'en-AU': 'AUD',
  'de-DE': 'EUR',
  'de-AT': 'EUR',
  'de-CH': 'CHF',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'pt-PT': 'EUR',
  'pt-BR': 'BRL',
  'nl-NL': 'EUR',
  'nl-BE': 'EUR',
  'ja-JP': 'JPY',
  'zh-CN': 'CNY',
  'ko-KR': 'KRW',
  'ar-SA': 'SAR',
  'ar-AE': 'AED',
  'ar-MA': 'MAD',
  'sw-KE': 'KES',
  'en-KE': 'KES',
  'en-NG': 'NGN',
  'en-GH': 'GHS',
  'en-UG': 'UGX',
  'en-ZA': 'ZAR',
  'fr-CM': 'XAF',
  'fr-CI': 'XOF',
  'fr-SN': 'XOF',
  'fr-CD': 'CDF',
};

// Map pays -> devise (priorite sur la langue). Couvre 80 pays. Synchronise
// avec backend EXCHANGE_RATES : si une devise est ici mais PAS dans
// le backend, le hook detectera unsupported_currency et masquera l'indicateur.
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Zone euro
  FR: 'EUR', DE: 'EUR', BE: 'EUR', NL: 'EUR', LU: 'EUR', AT: 'EUR',
  IE: 'EUR', FI: 'EUR', PT: 'EUR', ES: 'EUR', IT: 'EUR', GR: 'EUR',
  MT: 'EUR', CY: 'EUR', SI: 'EUR', SK: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  // Autres Europe
  GB: 'GBP', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR',
  // Amerique
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  // Asie
  JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', ID: 'IDR', VN: 'VND',
  TH: 'THB', PH: 'PHP', MY: 'MYR', SG: 'SGD', HK: 'HKD', TW: 'TWD',
  // Moyen-Orient
  SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD',
  IL: 'ILS', TR: 'TRY',
  // Afrique
  MA: 'MAD', TN: 'TND', DZ: 'DZD', EG: 'EGP', NG: 'NGN', GH: 'GHS', KE: 'KES',
  UG: 'UGX', TZ: 'TZS', ZA: 'ZAR', RW: 'RWF', ET: 'ETB',
  // Zone CFA
  CM: 'XAF', CG: 'XAF', CF: 'XAF', TD: 'XAF', GA: 'XAF', GQ: 'XAF',
  CI: 'XOF', SN: 'XOF', BF: 'XOF', BJ: 'XOF', ML: 'XOF', NE: 'XOF', TG: 'XOF',
  CD: 'CDF', GN: 'GNF',
  // Oceanie
  AU: 'AUD', NZ: 'NZD',
  // Russie
  RU: 'RUB',
};

// Fallback par langue UNIQUEMENT si pays inconnu (tres imparfait).
// On evite 'en' -> USD car trop generique. Si la langue est inconnue
// aussi, on retombera sur INTERNATIONAL_FALLBACK_CURRENCY (cf. hook).
const LANG_FALLBACKS: Record<string, string> = {
  fr: 'EUR',
  de: 'EUR',
  es: 'EUR',
  it: 'EUR',
  pt: 'EUR',
  ar: 'SAR',
  ja: 'JPY',
  zh: 'CNY',
  ko: 'KRW',
  sw: 'KES',
  // 'en' intentionnellement absent : trop ambigu (US/UK/AU/CA/NG/KE/...)
};

/**
 * Devise internationale par defaut pour la conversion indicative.
 * Utilisee quand on ne peut pas detecter la devise locale du payeur,
 * OU quand sa devise locale n'est pas supportee par le backend.
 *
 * Le backend renvoie sa propre `fallback_currency` dans les 400
 * unsupported_currency — on peut donc la mettre a jour dynamiquement
 * via setRuntimeFallback() apres le 1er appel.
 *
 * Defaut hardcoded : EUR (marche francophone). Override possible via
 * env mobile (EXPO_PUBLIC_FALLBACK_CURRENCY) au moment du build.
 */
const HARDCODED_FALLBACK = 'EUR';
let runtimeFallback: string | null = null;

export function getInternationalFallback(): string {
  if (runtimeFallback) return runtimeFallback;
  const envFallback = process.env.EXPO_PUBLIC_FALLBACK_CURRENCY;
  if (envFallback && /^[A-Z]{3}$/.test(envFallback)) return envFallback;
  return HARDCODED_FALLBACK;
}

/** Permet au hook de mettre a jour le fallback apres lecture backend. */
export function setRuntimeFallback(currency: string | null): void {
  if (currency && /^[A-Z]{3}$/i.test(currency)) {
    runtimeFallback = currency.toUpperCase();
  }
}

/**
 * Detecte la devise probable du payeur a partir de sa locale device.
 *
 * Toujours retourne une devise (jamais null) — on retombe sur
 * `getInternationalFallback()` (EUR par defaut) si on ne peut pas
 * determiner. La conversion est INDICATIVE : mieux vaut un ordre de
 * grandeur en EUR que rien du tout pour le payeur.
 *
 * Le hook gere a part le cas "eventCurrency === detectedCurrency" pour
 * masquer l'indicateur (rien a convertir).
 */
export function detectUserCurrency(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale; // ex: "fr-FR"

    // 1. Match exact locale precis (ex: fr-CH -> CHF, distinct de fr-FR -> EUR)
    if (LOCALE_TO_CURRENCY[locale]) return LOCALE_TO_CURRENCY[locale];

    const parts = locale.split('-');
    if (parts.length >= 2) {
      const langCountry = `${parts[0]}-${parts[parts.length - 1]}`;
      if (LOCALE_TO_CURRENCY[langCountry]) return LOCALE_TO_CURRENCY[langCountry];
    }

    // 2. Match par PAYS (priorite sur la langue). Couvre les locales mixtes
    // type `en-FR`, `en-DE`, `pt-FR`, etc.
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].toUpperCase();
      if (COUNTRY_TO_CURRENCY[country]) return COUNTRY_TO_CURRENCY[country];
    }

    // 3. Fallback par langue (volontairement limite — 'en' exclu car ambigu)
    const lang = parts[0];
    if (LANG_FALLBACKS[lang]) return LANG_FALLBACKS[lang];
  } catch {
    /* ignore — on retombe sur fallback international ci-dessous */
  }

  // 4. Fallback ultime : devise internationale (EUR par defaut, override
  //    possible via setRuntimeFallback apres lecture backend).
  return getInternationalFallback();
}

// ============================================================================
// Cache des rates : evite N appels HTTP redondants quand plusieurs prix sont
// affiches sur le meme ecran (ex: 10 tickets visibles). Cle = "FROM->TO".
// TTL 1h : suffisant pour un indicateur informatif, evite la staleness.
// ============================================================================

interface RateEntry {
  rate: number;
  fetchedAt: number;  // timestamp ms
}

const RATE_TTL_MS = 60 * 60 * 1000; // 1h
const rateCache = new Map<string, RateEntry>();

export function getCachedRate(from: string, to: string): number | null {
  const key = `${from.toUpperCase()}->${to.toUpperCase()}`;
  const entry = rateCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > RATE_TTL_MS) {
    rateCache.delete(key);
    return null;
  }
  return entry.rate;
}

export function setCachedRate(from: string, to: string, rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) return;  // garde contre NaN/Infinity
  const key = `${from.toUpperCase()}->${to.toUpperCase()}`;
  rateCache.set(key, { rate, fetchedAt: Date.now() });
}

/** Sentinel pour marquer une paire comme "non supportee backend" — evite
 * de re-fetch en boucle quand le backend renvoie 400 unsupported_currency. */
export function markUnsupportedPair(from: string, to: string): void {
  const key = `${from.toUpperCase()}->${to.toUpperCase()}`;
  // On stocke rate=0 pour signaler non-supporte (getCachedRate retourne null
  // car rate <= 0, mais on a un hit cache pour eviter le re-fetch).
  rateCache.set(key, { rate: -1, fetchedAt: Date.now() });
}

export function isPairKnownUnsupported(from: string, to: string): boolean {
  const key = `${from.toUpperCase()}->${to.toUpperCase()}`;
  const entry = rateCache.get(key);
  if (!entry) return false;
  if (Date.now() - entry.fetchedAt > RATE_TTL_MS) {
    rateCache.delete(key);
    return false;
  }
  return entry.rate < 0;
}

/** Reset complet du cache (test uniquement). */
export function _resetCurrencyCache(): void {
  rateCache.clear();
}
