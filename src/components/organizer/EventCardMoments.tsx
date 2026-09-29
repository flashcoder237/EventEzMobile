/**
 * Moments d'une carte de « Mes événements » (round 2, lot O).
 *
 *   - O3 « Complet » : barre qui se remplit à 100 % (scaleX), un reflet, tampon
 *     « COMPLET », vibration + confettis — UNE fois dans la vie de
 *     l'événement (clé partagée avec l'hôte des moments en direct), puis
 *     badge statique.
 *   - O2 palier : puce discrète « 100 inscrits » quand un jalon arrive en
 *     direct (rien au chargement).
 *   - O4 « EN LIGNE » : tampon vert la première fois qu'un événement validé
 *     récemment (< 14 j) est vu, à poser sur la bannière.
 *
 * Transform / opacité uniquement ; rien ne bouge au repos.
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Event } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { Curves, Durations } from '../../constants/motion';
import { FontFamily } from '../../constants/theme';
import { FirstSeenStamp, GlintSweep, Stamp, useFirstSeen } from '../ui/motion';
import { useMotionGate } from '../ui/motion/useMotionGate';
import { feedback } from '../../utils/feedback';
import { haptics } from '../../utils/haptics';
import { useEventMilestone } from '../../lib/organizerMilestones';
import { isRecentValidation } from '../../lib/utils/organizerMoments';
import { SOLD_OUT_SEEN_KEY, requestOrganizerConfetti } from '../moments/OrganizerMomentHost';

const ONLINE_SEEN_KEY = 'ez:moments:validated';

/** O3 + O2 — sous les statistiques de la carte. */
function EventCardMomentsComponent({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const milestone = useEventMilestone(event.id);
  const soldOut = event.is_sold_out === true || milestone?.kind === 'sold_out';
  const first = useFirstSeen(SOLD_OUT_SEEN_KEY, soldOut ? event.id : null);
  const play = first === true && canAnimate;

  const fill = useSharedValue(1);
  useEffect(() => {
    if (!soldOut) return;
    if (play) {
      fill.value = 0.9;
      fill.value = withTiming(1, { duration: Durations.inform, easing: Curves.out });
    } else {
      fill.value = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soldOut, play]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  if (soldOut) {
    return (
      <View style={styles.soldRow} accessibilityRole="text" accessibilityLabel={t('organizerMoments.toast.soldOutTitle')}>
        <View style={[styles.track, { backgroundColor: colors.gray100 }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.error }, fillStyle]} />
          {play && <GlintSweep playOnMount delay={Durations.inform} />}
        </View>
        {first === null ? null : (
          <Stamp
            label={t('organizerMoments.stamp.soldOut')}
            color={colors.error}
            size="sm"
            play={play}
            delay={play ? Durations.inform + 120 : 0}
            onImpact={
              play
                ? () => {
                    feedback.celebrate();
                    requestOrganizerConfetti();
                  }
                : undefined
            }
          />
        )}
      </View>
    );
  }

  if (milestone?.kind === 'count' && milestone.count) {
    return (
      <Animated.View entering={canAnimate ? FadeIn.duration(Durations.enter) : undefined} style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: `${colors.primary}14` }]}>
          <Text style={[styles.chipText, { color: colors.primary }]}>
            {t('organizerMoments.chip.count', { count: milestone.count })}
          </Text>
        </View>
      </Animated.View>
    );
  }
  return null;
}

export const EventCardMoments = memo(EventCardMomentsComponent);

/** O4 — tampon « EN LIGNE » à poser en absolu sur la bannière. */
function OnlineStampComponent({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const recent = isRecentValidation(event, Date.now());
  if (!recent) return null;
  return (
    <View style={styles.onlineWrap} pointerEvents="none">
      <FirstSeenStamp
        storageKey={ONLINE_SEEN_KEY}
        id={event.id}
        label={t('organizerMoments.stamp.online')}
        color={colors.success}
        size="sm"
        onImpact={() => haptics.success()}
        style={styles.onlineStamp}
      />
    </View>
  );
}

export const OnlineStamp = memo(OnlineStampComponent);

const styles = StyleSheet.create({
  soldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFillObject, borderRadius: 3, transformOrigin: 'left center' },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontFamily: FontFamily.semiBold, fontSize: 11.5 },
  onlineWrap: { position: 'absolute', right: 12, bottom: 12 },
  onlineStamp: { backgroundColor: 'rgba(255,255,255,0.92)' },
});

export default EventCardMoments;
