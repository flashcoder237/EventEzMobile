import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { cachedForecast, fetchForecast, type Forecast } from '../../lib/weather';

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  /** Date de l'événement (ISO). */
  date?: string | null;
}

// WMO weather_code → icône Ionicons + clé i18n du libellé.
function describe(code: number): { icon: keyof typeof Ionicons.glyphMap; labelKey: string } {
  if (code === 0) return { icon: 'sunny-outline', labelKey: 'componentsEvents.weather.sunny' };
  if (code <= 2) return { icon: 'partly-sunny-outline', labelKey: 'componentsEvents.weather.partlySunny' };
  if (code === 3) return { icon: 'cloud-outline', labelKey: 'componentsEvents.weather.cloudy' };
  if (code === 45 || code === 48) return { icon: 'cloud-outline', labelKey: 'componentsEvents.weather.fog' };
  if (code >= 51 && code <= 67) return { icon: 'rainy-outline', labelKey: 'componentsEvents.weather.rain' };
  if (code >= 71 && code <= 77) return { icon: 'snow-outline', labelKey: 'componentsEvents.weather.snow' };
  if (code >= 80 && code <= 82) return { icon: 'rainy-outline', labelKey: 'componentsEvents.weather.showers' };
  if (code >= 95) return { icon: 'thunderstorm-outline', labelKey: 'componentsEvents.weather.thunderstorm' };
  return { icon: 'partly-sunny-outline', labelKey: 'componentsEvents.weather.variable' };
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
  const { t } = useTranslation();
  const [forecast, setForecast] = useState<Forecast | null>(null);

  useEffect(() => {
    // Prévision partagée (lib/weather) : coordonnées de l'événement, horizon
    // ~15 j, cache de session. Hors horizon ou erreur → rien.
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !date) return;
    const known = cachedForecast(latitude, longitude, date);
    if (known !== undefined) {
      setForecast(known);
      return;
    }
    let alive = true;
    fetchForecast(latitude, longitude, date).then((f) => {
      if (alive) setForecast(f);
    });
    return () => {
      alive = false;
    };
  }, [latitude, longitude, date]);

  if (!forecast) return null;

  const { icon, labelKey } = describe(forecast.code);
  const label = t(labelKey);
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
