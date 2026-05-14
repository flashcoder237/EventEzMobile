import { useEffect, useState } from 'react';

import { paymentsAPI } from '../api';
import CacheService from '../services/CacheService';

interface TicketPriceCapResult {
  cap: number | null;
  source: 'platform_limit' | 'fallback' | null;
  isLoading: boolean;
}

/**
 * Hook qui retourne le plafond max pour un (country, currency).
 *
 * Cache local 5min (CacheService) : le plafond change rarement, on evite
 * un appel API a chaque keystroke dans le form de ticket.
 *
 * Si country/currency vides, ne fait pas d'appel (cap=null).
 */
export function useTicketPriceCap(country?: string, currency?: string): TicketPriceCapResult {
  const [cap, setCap] = useState<number | null>(null);
  const [source, setSource] = useState<'platform_limit' | 'fallback' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!country || !currency) {
      setCap(null);
      setSource(null);
      return;
    }
    let cancelled = false;
    const cacheKey = `ticket-cap:${country}:${currency}`;
    setIsLoading(true);

    (async () => {
      // Cache d'abord (stale-while-revalidate).
      try {
        const cached = await CacheService.get<{ cap: number; source: any }>(cacheKey);
        if (cached?.data && !cancelled) {
          setCap(cached.data.cap);
          setSource(cached.data.source);
        }
      } catch {
        // ignore
      }

      // Fetch live.
      try {
        const res = await paymentsAPI.ticketPriceCap(country, currency);
        if (cancelled) return;
        const data = res?.data || {};
        const capValue = data.cap ? Number(data.cap) : null;
        setCap(capValue);
        setSource(data.source || null);
        if (capValue != null) {
          CacheService.set(cacheKey, { cap: capValue, source: data.source }, 5 * 60 * 1000).catch(() => {});
        }
      } catch {
        // pas de cap → on laisse la valeur cache (ou null)
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [country, currency]);

  return { cap, source, isLoading };
}
