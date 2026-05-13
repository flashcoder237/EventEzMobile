import { useState, useEffect, useCallback } from 'react';
import { currencyAPI } from '../api';
import {
  detectUserCurrency,
  getCachedRate,
  setCachedRate,
  markUnsupportedPair,
  isPairKnownUnsupported,
  setRuntimeFallback,
  getInternationalFallback,
} from '../constants/currency';

interface ConversionResult {
  /** Formats a converted price string like "≈ 7,63 EUR", or null if same currency / no rate */
  convertedPrice: (amount: number) => string | null;
  /** The detected user currency (or fallback international si pays inconnu) */
  userCurrency: string | null;
  /** Whether the rate is still loading */
  isLoading: boolean;
}

/**
 * Hook de conversion devise indicative.
 *
 * Logique :
 * 1. Detecte la devise probable du payeur (locale device).
 * 2. Si eventCurrency === detectedCurrency → null (rien a convertir).
 * 3. Fetch rate de conversion event -> detectedCurrency.
 * 4. Si backend renvoie 400 unsupported_currency :
 *    - Marque la paire comme non-support (cache 1h).
 *    - Lit la `fallback_currency` envoyee par le backend.
 *    - Re-essaie : event -> fallback (typiquement EUR).
 *    - Affiche le resultat en fallback : "≈ X EUR" plutot que rien.
 * 5. Si l'event est DEJA dans la devise fallback (ex: event EUR + payeur
 *    indien avec INR non liste) → null (deja affiche en EUR, redondant).
 *
 * Cache rates en memoire (TTL 1h) : 10 prix sur le meme ecran = 1 fetch.
 */
export function useCurrencyConversion(eventCurrency: string): ConversionResult {
  const detectedCurrency = detectUserCurrency();
  // shouldConvert : on essaie tant que la devise event differe de celle
  // detectee. Si le fetch echoue (unsupported), on retry avec le fallback
  // dans le useEffect — d'ou `targetCurrency` qui peut bouger.
  const initialTarget = detectedCurrency !== eventCurrency ? detectedCurrency : null;

  const [targetCurrency, setTargetCurrency] = useState<string | null>(initialTarget);
  const [rate, setRate] = useState<number | null>(() =>
    initialTarget ? getCachedRate(eventCurrency, initialTarget) : null,
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Re-derive en cas de changement event currency
    const target = detectedCurrency !== eventCurrency ? detectedCurrency : null;
    setTargetCurrency(target);
    if (!target) {
      setRate(null);
      return;
    }
  }, [eventCurrency, detectedCurrency]);

  useEffect(() => {
    if (!targetCurrency) return;

    // 1. Cache hit
    const cached = getCachedRate(eventCurrency, targetCurrency);
    if (cached !== null) {
      setRate(cached);
      return;
    }

    // 2. Si paire connue non-supportee, on retombe immediatement sur le fallback
    if (isPairKnownUnsupported(eventCurrency, targetCurrency)) {
      const fallback = getInternationalFallback();
      if (eventCurrency === fallback) {
        // Event deja dans la devise fallback → rien a montrer
        setRate(null);
        setTargetCurrency(null);
        return;
      }
      // Switch sur le fallback (cache potentiel)
      const fallbackCached = getCachedRate(eventCurrency, fallback);
      if (fallbackCached !== null) {
        setRate(fallbackCached);
        setTargetCurrency(fallback);
        return;
      }
      // Sinon le useEffect va retrigger avec le fallback comme target
      setTargetCurrency(fallback);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    currencyAPI
      .convert(1, eventCurrency, targetCurrency)
      .then((res) => {
        if (cancelled) return;
        const rateValue = Number(res.data?.rate);
        if (Number.isFinite(rateValue) && rateValue > 0) {
          setRate(rateValue);
          setCachedRate(eventCurrency, targetCurrency, rateValue);
        } else {
          setRate(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const errorCode = err?.response?.data?.error;
        if (errorCode === 'unsupported_currency') {
          // Marque la paire comme non-support pour eviter re-fetch boucle
          markUnsupportedPair(eventCurrency, targetCurrency);

          // Recupere la devise fallback envoyee par le backend (peut differer
          // de notre hardcoded selon settings serveur).
          const backendFallback = err?.response?.data?.fallback_currency;
          if (backendFallback) {
            setRuntimeFallback(backendFallback);
          }

          // Retry avec la fallback international
          const fallback = backendFallback || getInternationalFallback();
          if (fallback && fallback !== eventCurrency && fallback !== targetCurrency) {
            // Le useEffect va re-fire avec le nouveau target
            setTargetCurrency(fallback);
            return;
          }
          // Si event = fallback, on ne peut rien afficher
          setRate(null);
          setTargetCurrency(null);
        } else {
          // Erreur reseau ou autre — on masque silencieusement
          setRate(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventCurrency, targetCurrency]);

  const convertedPrice = useCallback(
    (amount: number): string | null => {
      if (!targetCurrency || rate == null || rate <= 0 || amount <= 0) return null;

      const converted = amount * rate;
      if (!Number.isFinite(converted) || converted < 0.01) return null;

      const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(converted);

      return `≈ ${formatted} ${targetCurrency}`;
    },
    [targetCurrency, rate],
  );

  return {
    convertedPrice,
    userCurrency: targetCurrency,
    isLoading,
  };
}
