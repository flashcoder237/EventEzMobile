/**
 * États vides utiles (R3 W2).
 *
 * - `useDailyLine` : 2 ou 3 variantes d'une phrase, choisies par une graine
 *   journalière (la même toute la journée, une autre demain).
 * - `useCityPulseLine` : « 12 réservations à Douala aujourd'hui », via le
 *   `city-pulse` existant. Le serveur renvoie null sous son seuil : on
 *   n'affiche alors rien, jamais un « 0 » ni un chiffre inventé.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { dailyVariant } from '../lib/utils/rituals';

export function useDailyLine(scope: string, count: number): string {
  const { t } = useTranslation();
  const index = useMemo(() => dailyVariant(count, new Date(), scope), [count, scope]);
  return t(`delight.empty.${scope}.v${index}`);
}

// Dernière ville connue (Découvrir la pose après géocodage) ; sinon le profil.
let rememberedCity: string | null = null;
export function rememberUserCity(city: string | null | undefined) {
  if (city && city.trim()) rememberedCity = city.trim();
}

interface CityBookings {
  city: string;
  count: number;
  atLeast: boolean;
}

const pulseCache = new Map<string, Promise<CityBookings | null>>();

function loadCityBookings(city: string): Promise<CityBookings | null> {
  const key = city.toLowerCase();
  let p = pulseCache.get(key);
  if (!p) {
    p = Promise.resolve()
      .then(() => (eventsAPI as any).getCityPulse(city))
      .then((res: any) => {
        const b = res?.data?.bookings_24h;
        if (!b || typeof b.count !== 'number' || b.count <= 0) return null;
        return { city: res?.data?.city || city, count: b.count, atLeast: !!b.at_least };
      })
      .catch(() => null);
    pulseCache.set(key, p as Promise<CityBookings | null>);
  }
  return p as Promise<CityBookings | null>;
}

export function useCityPulseLine(enabled = true): string | null {
  const { t } = useTranslation();
  const { user } = useAuth() as any;
  const city: string | null = rememberedCity || user?.city || null;
  const [data, setData] = useState<CityBookings | null>(null);

  useEffect(() => {
    if (!enabled || !city) return undefined;
    let alive = true;
    loadCityBookings(city).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [enabled, city]);

  if (!enabled || !data) return null;
  return data.atLeast
    ? t('liveSignals.cityPulseAtLeast', { count: data.count, city: data.city })
    : t('liveSignals.cityPulse', { count: data.count, city: data.city });
}

/** Tests uniquement. */
export function __resetEmptySuggestion() {
  rememberedCity = null;
  pulseCache.clear();
}
