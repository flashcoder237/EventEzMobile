import { useEffect, useState } from 'react';

import { paymentsAPI } from '../api';
import CacheService from '../services/CacheService';
import { normalizeCountryKey, resolveEndonymCode } from '../lib/countryNames';

export interface SupportedCountry {
  code: string;
  name: string;
  currency: string;
  provider: 'notchpay' | 'cinetpay' | 'stripe';
}

const CACHE_KEY = 'supported-countries';
const CACHE_TTL_MS = 60 * 60 * 1000;  // 1h

/**
 * Hook pour la liste des pays ou un organisateur peut creer un event.
 *
 * Cache 1h via CacheService (memoire + AsyncStorage). La liste change
 * rarement — uniquement quand le backend redeploie avec un changement
 * dans COUNTRY_PAYMENT_CONFIG ou STRIPE_SUPPORTED_COUNTRIES.
 *
 * Retourne aussi un helper `isSupported(value)` qui accepte soit un
 * code ISO 2 lettres soit un nom de pays (case-insensitive). Permet
 * de valider l'input utilisateur cote UI avant le 400 backend.
 */
export function useSupportedCountries() {
  const [countries, setCountries] = useState<SupportedCountry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await CacheService.get<SupportedCountry[]>(CACHE_KEY);
        if (cached?.data && !cancelled) {
          setCountries(cached.data);
          setIsLoading(false);
          // On garde le refresh en arriere-plan (stale-while-revalidate).
        }
      } catch {
        // Cache rate : on continue avec le fetch live.
      }

      try {
        const res = await paymentsAPI.supportedCountries();
        const list = (res?.data?.countries || []) as SupportedCountry[];
        if (!cancelled) {
          setCountries(list);
          setIsError(false);
        }
        // Mise en cache (best-effort, ne bloque pas).
        CacheService.set(CACHE_KEY, list, CACHE_TTL_MS).catch(() => {});
      } catch {
        if (!cancelled) setIsError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isSupported = (value: string | undefined | null): boolean => {
    if (!value) return true;  // Champ vide = pas d'erreur (default modele backend)
    const v = value.trim();
    if (!v) return true;
    // Pendant le premier load, on ne bloque pas (le backend validera).
    if (countries.length === 0) return true;
    const upper = v.toUpperCase();
    const normalized = normalizeCountryKey(v);
    // Le geocoding renvoie souvent le nom natif ("Deutschland") : on résout
    // vers le code ISO avant de comparer, en plus du match direct code/nom
    // (normalisé casse + accents). Miroir du backend country_config.py.
    const endonymCode = resolveEndonymCode(v);
    return countries.some(
      (c) =>
        c.code.toUpperCase() === upper ||
        normalizeCountryKey(c.name) === normalized ||
        (endonymCode !== null && c.code.toUpperCase() === endonymCode),
    );
  };

  return { countries, isLoading, isError, isSupported };
}
