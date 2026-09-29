/**
 * R2 O2 live — ventes en direct de l'organisateur.
 *
 * Le backend pousse `sale.live` (non stocké, sur mon groupe de notifications)
 * à chaque vente confirmée, cumulé par fenêtre de 5 s :
 * `{event_id, event_title, count, amount, currency, ticket_type}`.
 *
 * Honnêteté : la carte n'apparaît qu'à la première VRAIE vente reçue écran
 * ouvert, et n'affiche que le cumul reçu depuis — elle ne s'ajoute jamais au
 * solde du wallet (qui est net de commission et a sa propre source).
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { useRealtimeMessage } from '../../hooks/useRealtime';
import { CountUpText, LiveDot, useMotionGate } from '../ui/motion';
import { feedback } from '../../utils/feedback';
import { displayCurrency } from '../../lib/utils/priceFormatters';

const CHIP_MS = 4000;

export interface SaleLiveMessage {
  event_id?: string;
  event_title?: string;
  count?: number;
  amount?: number | string;
  currency?: string;
  ticket_type?: string | null;
}

/** Libellé de la puce : « +1 VIP » pour une vente, « +7 en 1 min » pour une rafale. */
export function saleChipLabel(m: SaleLiveMessage, t: (k: string, o?: any) => string): string | null {
  const count = Number(m.count);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count === 1) return t('liveSignals.saleOne', { count, ticket: m.ticket_type || '' }).trim();
  return t('liveSignals.saleWindow', { count });
}

function SaleLiveCardComponent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const [total, setTotal] = useState<{ amount: number; currency: string } | null>(null);
  const [chip, setChip] = useState<{ key: number; label: string } | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRealtimeMessage('sale.live', (m) => {
    const msg = m as unknown as SaleLiveMessage;
    const amount = Number(msg.amount);
    if (!Number.isFinite(amount) || amount < 0) return;
    const currency = String(msg.currency || '');
    setTotal((prev) => {
      // Une seule devise par carte : une vente dans une autre devise ne se cumule pas.
      if (prev && prev.currency && currency && prev.currency !== currency) return prev;
      return { amount: (prev?.amount ?? 0) + amount, currency: prev?.currency || currency };
    });
    const label = saleChipLabel(msg, t);
    if (label) {
      setChip({ key: ++seq.current, label });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setChip(null), CHIP_MS);
    }
    feedback.moment('sale');
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!total) return null;
  return (
    <Animated.View
      entering={canAnimate ? FadeIn.duration(Durations.enter) : undefined}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <LiveDot size={7} color={colors.accent} />
        <Text style={[styles.label, { color: colors.gray500 }]}>{t('liveSignals.saleLive')}</Text>
        {chip && (
          <Animated.View
            key={chip.key}
            entering={canAnimate ? FadeIn.duration(Durations.respond) : undefined}
            exiting={canAnimate ? FadeOut.duration(Durations.exit) : undefined}
            style={[styles.chip, { backgroundColor: `${colors.success}18` }]}
          >
            <Ionicons name="trending-up" size={11} color={colors.success} />
            <Text style={[styles.chipText, { color: colors.success }]}>{chip.label}</Text>
          </Animated.View>
        )}
      </View>
      <View style={styles.valueRow}>
        <CountUpText
          value={Math.round(total.amount)}
          countKey="organize-sale-live"
          group
          style={[styles.value, { color: colors.text }]}
        />
        {!!total.currency && (
          <Text style={[styles.value, { color: colors.text }]}> {displayCurrency(total.currency)}</Text>
        )}
      </View>
    </Animated.View>
  );
}

export const SaleLiveCard = memo(SaleLiveCardComponent);
export default SaleLiveCard;

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 12, flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontFamily: FontFamily.bold, fontSize: 11.5 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontFamily: FontFamily.bold, fontSize: 22, fontVariant: ['tabular-nums'] },
});
