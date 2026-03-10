import { useState, useEffect, useCallback } from 'react';
import { currencyAPI } from '../api';

// Map navigator locale to currency code
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

function detectUserCurrency(): string | null {
  try {
    // Hermes / React Native: Intl.DateTimeFormat works
    const locale = Intl.DateTimeFormat().resolvedOptions().locale; // e.g. "fr-FR"

    // Exact match
    if (localeToCurrency[locale]) return localeToCurrency[locale];

    // Try matching by language-country (e.g. "fr-CM")
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const langCountry = `${parts[0]}-${parts[parts.length - 1]}`;
      if (localeToCurrency[langCountry]) return localeToCurrency[langCountry];
    }

    // Fallback by language prefix
    const lang = parts[0];
    const fallbacks: Record<string, string> = {
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

    return fallbacks[lang] || null;
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

    currencyAPI
      .convert(1, eventCurrency, userCurrency)
      .then((res) => {
        if (!cancelled) setRate(res.data.converted_amount);
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
      if (!shouldConvert || rate == null || amount <= 0) return null;

      const converted = amount * rate;
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
