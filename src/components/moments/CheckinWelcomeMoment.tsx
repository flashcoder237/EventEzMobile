/**
 * S3 — « Vous êtes entré · 20:14 · 213e ».
 *
 * Quelques secondes après le vrai scan au portique, le backend pousse une
 * notification `checkin_welcome` (WebSocket). Ce moment la transforme en une
 * carte teintée aux couleurs de l'événement, en haut de l'écran, avec UNE
 * vibration « succès ». Toucher la carte ouvre le billet, qui est passé en
 * mode « sur place ».
 *
 * Rien n'est rejoué au montage : seul un check-in survenu app ouverte joue.
 * Un seul moment à la fois ; la carte s'efface seule après 6 s.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { subscribeLiveNotifications, LiveNotification } from '../../lib/notifications/liveBus';
import { navigationRef } from '../../navigation/navigationRef';
import { tintBase } from '../../lib/utils/themeTint';
import { feedback } from '../../utils/feedback';
import { Durations } from '../../constants/motion';
import { FontFamily, Spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ongoingEvent } from '../../services/ongoingEventNotification';

interface Moment {
  key: string;
  title: string;
  time: string | null;
  rank: number | null;
  tint: string;
  registrationId: string | null;
}

const VISIBLE_MS = 6000;

export function toCheckinMoment(n: LiveNotification): Moment | null {
  if (n?.notification_type !== 'checkin_welcome') return null;
  const x = n.extra_data || {};
  const rank = Number(x.arrival_rank);
  return {
    key: String(n.id ?? `${x.registration_id}-${x.checked_in_at}`),
    title: String(x.event_title || n.title || ''),
    time: x.arrival_time ? String(x.arrival_time) : null,
    rank: Number.isFinite(rank) && rank > 0 ? rank : null,
    tint: tintBase(x.theme_tint),
    registrationId: x.registration_id ? String(x.registration_id) : null,
  };
}

export default function CheckinWelcomeMoment() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [moment, setMoment] = useState<Moment | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeLiveNotifications((n) => {
      const m = toCheckinMoment(n);
      if (!m || seen.current.has(m.key)) return;
      seen.current.add(m.key);
      // X2 — billet scanné : la notification « jour J » épinglée disparaît.
      if (m.registrationId) ongoingEvent.onCheckedIn(m.registrationId).catch(() => {});
      setMoment(m);
      // R2 V12 — son + vibration de la signature « arrivée ».
      feedback.moment('arrival');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMoment(null), VISIBLE_MS);
    });
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const open = useCallback(() => {
    const regId = moment?.registrationId;
    setMoment(null);
    if (regId && navigationRef.isReady()) {
      (navigationRef as any).navigate('RegistrationDetails', { registrationId: regId });
    }
  }, [moment]);

  if (!moment) return null;

  const parts = [
    t('moments.checkin.entered', { defaultValue: 'Vous êtes entré' }),
    moment.time,
    moment.rank ? t('moments.checkin.rank', { count: moment.rank, defaultValue: '{{count}}e' }) : null,
  ].filter(Boolean);

  return (
    <Animated.View
      key={moment.key}
      entering={(reduced ? FadeIn : FadeInUp).duration(Durations.enter)}
      exiting={(reduced ? FadeOut : FadeOutUp).duration(Durations.exit)}
      style={[styles.wrap, { top: insets.top + Spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${parts.join(' · ')}. ${moment.title}`}
        style={[styles.card, { backgroundColor: moment.tint }]}
      >
        <View style={styles.icon}>
          <Ionicons name="checkmark" size={18} color={moment.tint} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.line} numberOfLines={1}>{parts.join(' · ')}</Text>
          {!!moment.title && <Text style={styles.sub} numberOfLines={1}>{moment.title}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 1000, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0 },
  line: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 15 },
  sub: { color: 'rgba(255,255,255,0.85)', fontFamily: FontFamily.medium, fontSize: 12, marginTop: 1 },
});
