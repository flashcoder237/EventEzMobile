import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  /** Début de l'événement (ISO). */
  startDate?: string | null;
  /** Fin de l'événement (ISO) — pour afficher « En cours » pendant l'event. */
  endDate?: string | null;
  style?: ViewStyle;
}

/**
 * Compte à rebours LIVE jusqu'au début de l'événement, sur le billet.
 *
 * Zéro friction : pur affichage local (aucune permission, aucun réseau).
 * - Futur  → « Débute dans 2j 3h » (passe en h/min/s le jour J)
 * - Pendant (start < now < end) → badge « En cours »
 * - Terminé / pas de date → ne rend RIEN (n'encombre pas le billet)
 *
 * Cadence adaptative : tick chaque seconde dans la dernière heure (effet
 * « vivant »), chaque minute au-delà (économie batterie).
 */
function EventCountdown({ startDate, endDate, style }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  const start = startDate ? new Date(startDate).getTime() : NaN;
  const end = endDate ? new Date(endDate).getTime() : NaN;
  const diff = start - now;
  const withinLastHour = diff > 0 && diff <= 3600_000;

  useEffect(() => {
    if (isNaN(start)) return;
    // Ne pas ticker si l'event est terminé.
    if (!isNaN(end) ? now > end : now > start) return;
    const period = withinLastHour ? 1000 : 60_000;
    const id = setInterval(() => setNow(Date.now()), period);
    return () => clearInterval(id);
  }, [start, end, withinLastHour, now]);

  if (isNaN(start)) return null;

  // Terminé
  const over = !isNaN(end) ? now > end : now > start + 3 * 3600_000; // fallback : +3h après le début
  if (over) return null;

  // En cours
  const live = now >= start && (isNaN(end) ? now <= start + 3 * 3600_000 : now <= end);
  if (live) {
    return (
      <View style={[styles.pill, { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}33` }, style]}>
        <View style={[styles.dot, { backgroundColor: colors.error }]} />
        <Text style={[styles.text, { color: colors.error }]}>{t('countdown.live')}</Text>
      </View>
    );
  }

  // À venir
  const totalSec = Math.max(0, Math.floor(diff / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  let parts: string;
  if (d > 0) parts = `${d}${t('countdown.d')} ${h}${t('countdown.h')}`;
  else if (h > 0) parts = `${h}${t('countdown.h')} ${m}${t('countdown.m')}`;
  else parts = `${m}${t('countdown.m')} ${s}${t('countdown.s')}`;

  return (
    <View style={[styles.pill, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }, style]}>
      <Ionicons name="time-outline" size={14} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>
        {t('countdown.startsIn')} <Text style={styles.strong}>{parts}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontFamily: FontFamily.medium, fontSize: 13, letterSpacing: 0.2 },
  strong: { fontFamily: FontFamily.bold },
});

export default React.memo(EventCountdown);
