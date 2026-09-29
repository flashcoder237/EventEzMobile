/**
 * O5 — puce « +12 depuis hier 18:40 », qui s'efface seule après 6 s.
 * Rien si l'écart est nul ou négatif (le parent ne la monte pas).
 */
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Durations } from '../../constants/motion';
import { FontFamily } from '../../constants/theme';
import { appDateLocale, shortMonthLabel } from '../../lib/utils/dateFormatters';
import { useMotionGate } from '../ui/motion/useMotionGate';

const VISIBLE_MS = 6000;

export function sinceWhen(at: number, now: number, t: (k: string, o?: any) => string): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString(appDateLocale(), { hour: '2-digit', minute: '2-digit' });
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 3600 * 1000);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return time;
  if (same(d, yesterday)) return t('organizerMoments.since.yesterday', { time });
  return `${d.getDate()} ${shortMonthLabel(d)}`;
}

function SinceChipComponent({ label, delay = 0 }: { label: string; delay?: number }) {
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), VISIBLE_MS + delay);
    return () => clearTimeout(id);
  }, [delay]);
  if (!visible) return null;
  return (
    <Animated.View
      entering={canAnimate ? FadeIn.delay(delay).duration(Durations.enter) : undefined}
      exiting={canAnimate ? FadeOut.duration(Durations.exit) : undefined}
      style={[styles.chip, { backgroundColor: `${colors.success}18` }]}
    >
      <Text style={[styles.text, { color: colors.success }]}>{label}</Text>
    </Animated.View>
  );
}

export const SinceChip = memo(SinceChipComponent);

export function useSinceLabel() {
  const { t } = useTranslation();
  return (delta: string, since: number) =>
    t('organizerMoments.since.chip', { delta, when: sinceWhen(since, Date.now(), t) });
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  text: { fontFamily: FontFamily.bold, fontSize: 11.5 },
});

export default SinceChip;
