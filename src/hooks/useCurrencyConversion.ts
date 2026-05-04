import { useState, useEffect, useCallback } from 'react';
import { currencyAPI } from '../api';

// Map locale précis (lang-country) vers devise. Reste utile pour les cas où le
// même pays a plusieurs devises selon la langue parlée (CH = CHF/EUR mixte).
const localeToCurrency: Record<string, string> = {
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

// Map pays → devise — c'est le pays qui détermine la devise, pas la langue.
// Sans ça, un utilisateur anglais en France (locale `en-FR`) tombait sur le
// fallback langue `en → USD` au lieu d'EUR. Voir AUDIT_PROFOND §3.4.
const countryToCurrency: Record<string, string> = {
  // Zone euro
  FR: 'EUR', DE: 'EUR', BE: 'EUR', NL: 'EUR', LU: 'EUR', AT: 'EUR',
  IE: 'EUR', FI: 'EUR', PT: 'EUR', ES: 'EUR', IT: 'EUR', GR: 'EUR',
  MT: 'EUR', CY: 'EUR', SI: 'EUR', SK: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  // Autres Europe
  GB: 'GBP', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR',
  // Amérique
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
  CD: 'CDF',
  // Océanie
  AU: 'AUD', NZ: 'NZD',
  // Russie
  RU: 'RUB',
};

function detectUserCurrency(): string | null {
  try {
    // Hermes / React Native: Intl.DateTimeFormat works
    const locale = Intl.DateTimeFormat().resolvedOptions().locale; // e.g. "fr-FR"

    // 1. Exact match locale précis (ex: fr-CH → CHF, distinct de fr-FR → EUR)
    if (localeToCurrency[locale]) return localeToCurrency[locale];

    const parts = locale.split('-');
    if (parts.length >= 2) {
      const langCountry = `${parts[0]}-${parts[parts.length - 1]}`;
      if (localeToCurrency[langCountry]) return localeToCurrency[langCountry];
    }

    // 2. Match par PAYS (priorité sur la langue) — couvre les locales mixtes
    // type `en-FR`, `en-DE`, `pt-FR`, etc. C'est la nationalité du device qui
    // détermine la devise utile, pas la langue d'affichage.
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].toUpperCase();
      if (countryToCurrency[country]) return countryToCurrency[country];
    }

    // 3. Fallback final : par langue. Très imparfait mais évite null.
    const lang = parts[0];
    const langFallbacks: Record<string, string> = {
      fr: 'EUR',
      en: 'USD',
      de: 'EUR',
      es: 'EUR',
      it: 'EUR',
      pt: 'EUR',
      ar: 'SAR',
      ja: 'JPY',
      zh: 'CNY',
      ko: 'KRW',
      sw: 'KES',
    };

    return langFallbacks[lang] || null;
  } catch {
    return null;
  }
}

interface ConversionResult {
  /** Formats a converted price string like "≈ 7,63 EUR", or null if same currency / no rate */
  convertedPrice: (amount: number) => string | null;
  /** The detected user currency, or null */
  userCurrency: string | null;
  /** Whether the rate is still loading */
  isLoading: boolean;
}

export function useCurrencyConversion(eventCurrency: string): ConversionResult {
  const userCurrency = detectUserCurrency();
  const shouldConvert = !!userCurrency && userCurrency !== eventCurrency;
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!shouldConvert || !userCurrency) return;
    let cancelled = false;
    setIsLoading(true);

    // On lit `rate` (precision complete) et PAS `converted_amount` qui est quantize
    // a 2 decimales cote backend. Pour XAF->EUR (rate=0.00152), converted_amount de
    // 1 XAF arrondi donne 0.00, ce qui casse ensuite le calcul pour tous les prix.
    currencyAPI
      .convert(1, eventCurrency, userCurrency)
      .then((res) => {
        if (cancelled) return;
        const rateValue = Number(res.data?.rate);
        if (Number.isFinite(rateValue) && rateValue > 0) {
          setRate(rateValue);
        }
      })
      .catch(() => {
        /* silently fail — conversion is informational only */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventCurrency, userCurrency, shouldConvert]);

  const convertedPrice = useCallback(
    (amount: number): string | null => {
      if (!shouldConvert || rate == null || rate <= 0 || amount <= 0) return null;

      const converted = amount * rate;
      // Si le montant converti arrondi est 0 (montant negligeable),
      // on n'affiche rien plutot que "≈ 0 EUR".
      if (converted < 0.01) return null;

      const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(converted);

      return `≈ ${formatted} ${userCurrency}`;
    },
    [shouldConvert, rate, userCurrency],
  );

  return {
    convertedPrice,
    userCurrency: shouldConvert ? userCurrency : null,
    isLoading: shouldConvert ? isLoading : false,
  };
}
