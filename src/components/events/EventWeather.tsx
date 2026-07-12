import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  /** Date de l'événement (ISO). */
  date?: string | null;
}

interface Forecast {
  code: number;
  tMax: number;
  tMin: number;
  precip: number | null;
}

// Cache mémoire (session) — clé lat,lon,jour → évite tout refetch au remount.
const cache = new Map<string, Forecast | null>();

// Open-Meteo n'a pas d'horizon de prévision au-delà de ~16 jours.
const MAX_FORECAST_DAYS = 15;

function toDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysFromNow(iso: string): number {
  const d = new Date(toDay(iso)).getTime();
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.round((d - today) / 86400000);
}

// WMO weather_code → icône Ionicons + libellé FR.
function describe(code: number): { icon: keyof typeof Ionicons.glyphMap; label: string } {
  if (code === 0) return { icon: 'sunny-outline', label: 'Ensoleillé' };
  if (code <= 2) return { icon: 'partly-sunny-outline', label: 'Éclaircies' };
  if (code === 3) return { icon: 'cloud-outline', label: 'Nuageux' };
  if (code === 45 || code === 48) return { icon: 'cloud-outline', label: 'Brouillard' };
  if (code >= 51 && code <= 67) return { icon: 'rainy-outline', label: 'Pluie' };
  if (code >= 71 && code <= 77) return { icon: 'snow-outline', label: 'Neige' };
  if (code >= 80 && code <= 82) return { icon: 'rainy-outline', label: 'Averses' };
  if (code >= 95) return { icon: 'thunderstorm-outline', label: 'Orages' };
  return { icon: 'partly-sunny-outline', label: 'Variable' };
}

/**
 * Chip météo pour le jour de l'événement (Open-Meteo, gratuit, sans clé).
 *
 * Zéro friction : ne s'affiche QUE si des coordonnées existent et que la date
 * est dans l'horizon de prévision (aujourd'hui → ~15 j). Sinon, ou en cas
 * d'erreur réseau, le composant ne rend RIEN (jamais d'erreur, jamais de
 * placeholder cassé). Aucune permission requise.
 */
function EventWeather({ latitude, longitude, date }: Props) {
  const { colors } = useTheme();
  const [forecast, setForecast] = useState<Forecast | null>(null);

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
  const inRange = !!date && daysFromNow(date) >= 0 && daysFromNow(date) <= MAX_FORECAST_DAYS;

  useEffect(() => {
    if (!hasCoords || !inRange || !date) return;
    const day = toDay(date);
    const key = `${latitude},${longitude},${day}`;

    if (cache.has(key)) {
      setForecast(cache.get(key) || null);
      return;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&timezone=auto&start_date=${day}&end_date=${day}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error('weather');
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
          setForecast(f);
        } else {
          cache.set(key, null);
        }
      } catch {
        /* réseau/annulation → on n'affiche simplement rien */
      }
    })();
    return () => ctrl.abort();
  }, [hasCoords, inRange, latitude, longitude, date]);

  if (!forecast) return null;

  const { icon, label } = describe(forecast.code);
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.temp, { color: colors.text }]}>
        {forecast.tMax}°<Text style={[styles.tempMin, { color: colors.gray500 }]}>/{forecast.tMin}°</Text>
      </Text>
      <Text style={[styles.label, { color: colors.gray600 }]} numberOfLines={1}>{label}</Text>
      {typeof forecast.precip === 'number' && forecast.precip >= 30 && (
        <View style={styles.precipWrap}>
          <Ionicons name="umbrella-outline" size={12} color={colors.gray500} />
          <Text style={[styles.precip, { color: colors.gray500 }]}>{forecast.precip}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  temp: { fontFamily: FontFamily.bold, fontSize: 13 },
  tempMin: { fontFamily: FontFamily.medium, fontSize: 12 },
  label: { fontFamily: FontFamily.medium, fontSize: 12 },
  precipWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 2 },
  precip: { fontFamily: FontFamily.medium, fontSize: 11 },
});

export default React.memo(EventWeather);
