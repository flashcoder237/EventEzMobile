/**
 * O6 — suivi d'un retrait : Demandé → (Approuvé) → Envoyé, avec les heures.
 *
 * Règle de résilience payout (docs/PAYOUT_RESILIENCE.md) : `verifying` =
 * issue incertaine (timeout/5xx) → ambre « Vérification en cours auprès de
 * l'opérateur », JAMAIS « Envoyé ». `sent` vu pour la première fois → coche
 * dessinée + « Versé sur MTN •••42 · 14:05 ». Échec : ambre + motif, sans
 * secousse. Les segments se remplissent en scaleX (transform uniquement).
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Payout } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { Curves, Durations } from '../../constants/motion';
import { FontFamily } from '../../constants/theme';
import { DrawCheck, useFirstSeen } from '../ui/motion';
import { useMotionGate } from '../ui/motion/useMotionGate';
import { buildPayoutRail, maskedTail, RailStep } from '../../lib/utils/organizerMoments';
import { appDateLocale } from '../../lib/utils/dateFormatters';

const AMBER = '#D97706';

function hhmm(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleTimeString(appDateLocale(), { hour: '2-digit', minute: '2-digit' })
    : '';
}

function Segment({ filled, color, track }: { filled: boolean; color: string; track: string }) {
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const v = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    v.value = canAnimate ? withTiming(filled ? 1 : 0, { duration: Durations.inform, easing: Curves.out }) : filled ? 1 : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={[styles.segment, { backgroundColor: track }]}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: color }, style]} />
    </View>
  );
}

function PayoutRailComponent({ payout, methodLabel }: { payout: Payout; methodLabel: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rail = buildPayoutRail(payout);
  const sentFirst = useFirstSeen('ez:moments:payout-sent', rail.tone === 'sent' ? payout.id : null);

  const colorOf = (s: RailStep) =>
    s.state === 'done' ? colors.success : s.state === 'warn' ? AMBER : s.state === 'current' ? colors.primary : colors.gray300;

  const label = (key: RailStep['key']) =>
    key === 'requested'
      ? t('organizerMoments.payout.requested')
      : key === 'approved'
        ? t('organizerMoments.payout.approved')
        : t('organizerMoments.payout.sent');

  let message: { text: string; color: string } | null = null;
  if (rail.tone === 'verifying') message = { text: t('organizerMoments.payout.verifying'), color: AMBER };
  else if (rail.tone === 'failed') message = { text: payout.failure_reason || t('organizerMoments.payout.failed'), color: AMBER };
  else if (rail.tone === 'sent') {
    message = {
      text: t('organizerMoments.payout.sentTo', {
        method: methodLabel,
        tail: maskedTail(payout.destination_account),
        time: hhmm(payout.processed_at),
      }).replace(/\s+·\s*$/, ''),
      color: colors.success,
    };
  }

  return (
    <View style={styles.wrap} accessible accessibilityLabel={rail.steps.map((s) => `${label(s.key)} ${s.state === 'done' ? '✓' : ''}`).join(', ')}>
      <View style={styles.row}>
        {rail.steps.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && <Segment filled={s.state === 'done'} color={colors.success} track={colors.gray100} />}
            <View
              style={[
                styles.node,
                {
                  backgroundColor: s.state === 'done' ? colors.success : s.state === 'warn' ? AMBER : 'transparent',
                  borderColor: colorOf(s),
                },
              ]}
            >
              {s.state === 'done' && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
              {s.state === 'warn' && <Ionicons name="alert" size={11} color="#FFFFFF" />}
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {rail.steps.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.labelCol,
              i === 0 ? styles.alignStart : i === rail.steps.length - 1 ? styles.alignEnd : styles.alignCenter,
            ]}
          >
            <Text style={[styles.labelText, { color: colors.text }]}>{label(s.key)}</Text>
            <Text style={[styles.labelTime, { color: colors.gray500 }]}>{s.at ? hhmm(s.at) : '—'}</Text>
          </View>
        ))}
      </View>
      {message && (
        <View style={styles.messageRow}>
          {rail.tone === 'sent' && sentFirst === true ? (
            <DrawCheck size={16} color={colors.success} strokeWidth={3} />
          ) : rail.tone === 'sent' ? (
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          ) : (
            <Ionicons name={rail.tone === 'verifying' ? 'time-outline' : 'alert-circle-outline'} size={16} color={message.color} />
          )}
          <Text style={[styles.messageText, { color: message.color }]} numberOfLines={2}>
            {message.text}
          </Text>
        </View>
      )}
    </View>
  );
}

export const PayoutRail = memo(PayoutRailComponent);

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  node: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  segment: { flex: 1, height: 3, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { ...StyleSheet.absoluteFillObject, transformOrigin: 'left center' },
  labels: { flexDirection: 'row' },
  labelCol: { flex: 1 },
  alignStart: { alignItems: 'flex-start' },
  alignCenter: { alignItems: 'center' },
  alignEnd: { alignItems: 'flex-end' },
  labelText: { fontFamily: FontFamily.semiBold, fontSize: 11 },
  labelTime: { fontFamily: FontFamily.medium, fontSize: 10.5, marginTop: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  messageText: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 12.5 },
});

export default PayoutRail;
