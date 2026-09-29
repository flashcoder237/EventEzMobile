import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { GradientBorder, LiveDot, RollingText, useMotionGate } from '../ui/motion';
import { haptics } from '../../utils/haptics';

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
  const { canAnimate, focused, appActive } = useMotionGate();
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

  const live = !isNaN(start) && now >= start && (isNaN(end) ? now <= start + 3 * 3600_000 : now <= end);

  // Passage « bientôt » → « en direct » vu à l'écran : fondu + une vibration
  // légère (une seule fois, seulement si l'écran est affiché et l'app active).
  const wasUpcoming = useRef(false);
  const [becameLive, setBecameLive] = useState(false);
  useEffect(() => {
    if (!live && diff > 0) {
      wasUpcoming.current = true;
      return;
    }
    if (live && wasUpcoming.current && !becameLive) {
      setBecameLive(true);
      if (focused && appActive) haptics.light();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  if (isNaN(start)) return null;

  // Terminé
  const over = !isNaN(end) ? now > end : now > start + 3 * 3600_000; // fallback : +3h après le début
  if (over) return null;

  // En cours
  if (live) {
    return (
      <Animated.View
        // Fondu uniquement si on a VU le passage « bientôt » → « en direct ».
        entering={becameLive && canAnimate ? FadeIn.duration(320) : undefined}
        style={[styles.pill, { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}33` }, style]}
      >
        <LiveDot size={7} color={colors.error} />
        <Text style={[styles.text, { color: colors.error }]}>{t('countdown.live')}</Text>
      </Animated.View>
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

  // Dernière heure : seuls les chiffres qui changent roulent (une clé par
  // position), la pastille reçoit un liseré en dégradé fixe.
  if (withinLastHour) {
    const chars = parts.split('');
    return (
      <GradientBorder
        mode="static"
        restOpacity={0.9}
        radius={BorderRadius.full}
        width={1.5}
        style={[{ alignSelf: 'center' }, style]}
      >
        <View
          style={[styles.pill, styles.pillInner, { backgroundColor: `${colors.primary}12` }]}
          accessible
          accessibilityLabel={`${t('countdown.startsIn')} ${m}${t('countdown.m')}`}
        >
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={[styles.text, { color: colors.primary }]}>{t('countdown.startsIn')} </Text>
          <View style={styles.digits} importantForAccessibility="no-hide-descendants">
            {chars.map((ch, i) =>
              /\d/.test(ch) ? (
                <RollingText
                  key={`c${i}`}
                  value={ch}
                  direction="down"
                  duration={160}
                  style={[styles.text, styles.strong, styles.digit, { color: colors.primary }]}
                />
              ) : (
                <Text key={`c${i}`} style={[styles.text, styles.strong, { color: colors.primary }]}>
                  {ch}
                </Text>
              ),
            )}
          </View>
        </View>
      </GradientBorder>
    );
  }

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
  pillInner: { borderWidth: 0, alignSelf: 'auto' },
  digits: { flexDirection: 'row', alignItems: 'center' },
  digit: { fontVariant: ['tabular-nums'] },
  text: { fontFamily: FontFamily.medium, fontSize: 13, letterSpacing: 0.2 },
  strong: { fontFamily: FontFamily.bold },
});

export default React.memo(EventCountdown);
