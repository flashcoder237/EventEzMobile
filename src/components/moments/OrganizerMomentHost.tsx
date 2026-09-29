/**
 * O1/O3 — moments organisateur reçus EN DIRECT (`organizer_milestone`).
 *
 * Échelle de célébration (round 2) :
 *   - vente ordinaire : rien ici ;
 *   - palier (10/50/100…) : aucune carte, seulement la puce discrète sur
 *     l'événement (via `recordMilestone`) ;
 *   - premier participant : carte sobre, coche dessinée, « Partager pour
 *     accélérer » — pas de confettis ;
 *   - complet : carte avec tampon « COMPLET » + célébration (vibration +
 *     confettis), UNE fois dans la vie de l'événement (clé partagée avec la
 *     carte de « Mes événements », qui restera ensuite statique).
 *
 * Rien n'est rejoué au montage : seuls les jalons survenus app ouverte jouent.
 * Un seul moment à la fois ; la carte s'efface seule après 7 s.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { subscribeLiveNotifications } from '../../lib/notifications/liveBus';
import { recordMilestone } from '../../lib/organizerMilestones';
import { OrganizerMilestone, toOrganizerMilestone } from '../../lib/utils/organizerMoments';
import { navigationRef } from '../../navigation/navigationRef';
import { DrawCheck, Stamp, markFirstSeen } from '../ui/motion';
import { feedback } from '../../utils/feedback';
import { haptics } from '../../utils/haptics';
import { Durations } from '../../constants/motion';
import { FontFamily, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatPriceAmount, displayCurrency } from '../../lib/utils/priceFormatters';
import { getEventUrl } from '../../constants/urls';
import ConfettiEffect from '../ui/ConfettiEffect';

const VISIBLE_MS = 7000;
/** Clé partagée avec la carte « Mes événements » (O3) : UNE fête par événement. */
export const SOLD_OUT_SEEN_KEY = 'ez:moments:sold-out';

// Les cartes d'une liste ne peuvent pas porter les confettis (clip, recyclage) :
// elles demandent à l'hôte racine de les lancer.
const confettiListeners = new Set<() => void>();
export function requestOrganizerConfetti(): void {
  confettiListeners.forEach((l) => l());
}

export default function OrganizerMomentHost() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { colors } = useTheme();
  const [moment, setMoment] = useState<OrganizerMilestone | null>(null);
  const [confetti, setConfetti] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const show = useCallback((m: OrganizerMilestone) => {
    setMoment(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMoment(null), VISIBLE_MS);
  }, []);

  useEffect(() => {
    return subscribeLiveNotifications((n) => {
      const m = toOrganizerMilestone(n);
      if (!m || seen.current.has(m.key)) return;
      seen.current.add(m.key);
      recordMilestone(m);
      if (m.kind === 'first') {
        show(m);
        return;
      }
      if (m.kind === 'sold_out') {
        // La fête ne joue qu'une fois dans la vie de l'événement : si « Mes
        // événements » l'a déjà jouée, la carte reste sobre.
        markFirstSeen(SOLD_OUT_SEEN_KEY, m.eventId)
          .then((first) => {
            show(m);
            if (first) {
              feedback.celebrate();
              if (!reduced) {
                setConfetti(Date.now());
                setTimeout(() => setConfetti(0), 4000);
              }
            }
          })
          .catch(() => show(m));
      }
      // kind === 'count' : la puce suffit (recordMilestone).
    });
  }, [reduced, show]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const l = () => {
      if (reduced) return;
      setConfetti(Date.now());
      setTimeout(() => setConfetti(0), 4000);
    };
    confettiListeners.add(l);
    return () => {
      confettiListeners.delete(l);
    };
  }, [reduced]);

  const view = useCallback(() => {
    const id = moment?.eventId;
    setMoment(null);
    if (id && navigationRef.isReady()) {
      (navigationRef as any).navigate('EventRegistrations', { eventId: id });
    }
  }, [moment]);

  const share = useCallback(async () => {
    if (!moment) return;
    const url = getEventUrl(moment.eventId);
    try {
      const res = await Share.share({
        message: t('organizerMoments.share.message', { title: moment.eventTitle, url }),
        url,
      });
      if (res.action === Share.sharedAction) haptics.light();
    } catch {
      /* partage annulé */
    }
    setMoment(null);
  }, [moment, t]);

  return (
    <>
      {confetti > 0 && <ConfettiEffect key={confetti} count={40} />}
      {moment && (
        <Animated.View
          key={moment.key}
          entering={(reduced ? FadeIn : FadeInDown).duration(Durations.enter)}
          exiting={(reduced ? FadeOut : FadeOutDown).duration(Durations.exit)}
          style={[styles.wrap, { bottom: insets.bottom + 96 }]}
          pointerEvents="box-none"
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            {moment.kind === 'first' ? (
              <View style={[styles.checkDisc, { backgroundColor: `${colors.success}1F` }]}>
                <DrawCheck size={20} color={colors.success} strokeWidth={3} delay={Durations.enter} />
              </View>
            ) : (
              <Stamp label={t('organizerMoments.stamp.soldOut')} color={colors.error} size="sm" play={!reduced} />
            )}
            <View style={styles.texts}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {moment.kind === 'first' ? t('organizerMoments.toast.firstTitle') : t('organizerMoments.toast.soldOutTitle')}
              </Text>
              <Text style={[styles.sub, { color: colors.gray500 }]} numberOfLines={2}>
                {moment.kind === 'first'
                  ? [
                      moment.eventTitle,
                      moment.participantName || t('organizerMoments.toast.someone'),
                      moment.amount
                        ? `${formatPriceAmount(moment.amount)} ${displayCurrency(moment.currency || undefined)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `${moment.eventTitle} · ${t('organizerMoments.toast.soldOutLine')}`}
              </Text>
              <View style={styles.actions}>
                {moment.kind === 'first' && (
                  <Pressable
                    onPress={share}
                    style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.text }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.btnText, { color: colors.background }]}>{t('organizerMoments.toast.share')}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={view}
                  style={[styles.btn, { borderColor: colors.gray200 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, { color: colors.text }]}>{t('organizerMoments.toast.view')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 1000, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  checkDisc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: FontFamily.bold, fontSize: 15 },
  sub: { fontFamily: FontFamily.medium, fontSize: 12.5, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  btnPrimary: {},
  btnText: { fontFamily: FontFamily.semiBold, fontSize: 12.5 },
});
