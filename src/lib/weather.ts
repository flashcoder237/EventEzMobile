/**
 * Prévision météo d'un événement (Open-Meteo, gratuit, sans clé).
 *
 * Extrait d'`EventWeather` (chip de la fiche) pour être partagé avec la ligne
 * d'accueil du tableau de bord (R3 W3). Toujours aux coordonnées de
 * l'ÉVÉNEMENT, pour son jour seulement. Une prévision est « prévue », jamais
 * une certitude. Erreur réseau ou hors horizon = null, jamais d'exception.
 */

export interface Forecast {
  code: number;
  tMax: number;
  tMin: number;
  precip: number | null;
}

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm';

// Open-Meteo n'a pas d'horizon de prévision au-delà de ~16 jours.
export const MAX_FORECAST_DAYS = 15;

// Cache mémoire (session) — clé lat,lon,jour → aucun refetch au remount,
// et la fiche + l'accueil partagent la même réponse.
const cache = new Map<string, Forecast | null>();
const inflight = new Map<string, Promise<Forecast | null>>();

export function forecastDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Jours entre aujourd'hui et la date (même convention que la chip historique). */
export function daysFromNow(iso: string, now: Date = new Date()): number {
  const d = new Date(forecastDay(iso)).getTime();
  const today = new Date(now.toISOString().slice(0, 10)).getTime();
  return Math.round((d - today) / 86400000);
}

/** Codes WMO + probabilité de pluie → une seule tendance lisible. */
export function weatherKind(code: number | null | undefined, precipProb: number | null | undefined): WeatherKind {
  const c = typeof code === 'number' ? code : -1;
  if (c >= 95) return 'storm';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (typeof precipProb === 'number' && precipProb >= 60)) {
    return 'rain';
  }
  if (c === 0 || c === 1) return 'clear';
  return 'cloudy';
}

export function cachedForecast(lat: number, lng: number, iso: string): Forecast | null | undefined {
  const key = `${lat},${lng},${forecastDay(iso)}`;
  return cache.has(key) ? cache.get(key) ?? null : undefined;
}

export async function fetchForecast(
  lat: number | null | undefined,
  lng: number | null | undefined,
  iso: string | null | undefined,
): Promise<Forecast | null> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !iso) return null;
  const ahead = daysFromNow(iso);
  if (ahead < 0 || ahead > MAX_FORECAST_DAYS) return null;
  const day = forecastDay(iso);
  const key = `${lat},${lng},${day}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&start_date=${day}&end_date=${day}`;
      // Pas d'AbortSignal : la requête est partagée entre écrans (dédupliquée),
      // l'appelant qui se démonte ignore simplement la réponse.
      const res = await fetch(url);
      if (!res.ok) return null;
      const json: any = await res.json();
      const d = json?.daily;
      if (d && Array.isArray(d.weather_code) && d.weather_code.length > 0) {
        const f: Forecast = {
          code: d.weather_code[0],
          tMax: Math.round(d.temperature_2m_max?.[0]),
          tMin: Math.round(d.temperature_2m_min?.[0]),
          precip: d.precipitation_probability_max?.[0] ?? null,
        };
        cache.set(key, f);
        return f;
      }
      cache.set(key, null);
      return null;
    } catch {
      /* réseau → rien (pas mis en cache : on retentera) */
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
}

/** Tests uniquement. */
export function __resetWeatherCache() {
  cache.clear();
  inflight.clear();
}
