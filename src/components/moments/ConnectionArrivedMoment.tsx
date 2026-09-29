/**
 * R2 V8 — « Karim est arrivé · Lui écrire ».
 *
 * Le backend pousse `connection_arrived` (in_app uniquement) quand une de mes
 * connexions est scannée à un événement où nous avons tous deux activé le
 * networking, et que je suis déjà sur place. Au plus 3 par événement, jamais
 * pendant une session : c'est le serveur qui filtre, ici on affiche.
 *
 * Rien n'est rejoué au montage : seules les arrivées survenues app ouverte.
 * Une carte à la fois, effacée seule après 6 s.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, FadeOutUp } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { subscribeLiveNotifications, LiveNotification } from '../../lib/notifications/liveBus';
import { navigationRef } from '../../navigation/navigationRef';
import { feedback } from '../../utils/feedback';
import { Durations } from '../../constants/motion';
import { FontFamily, Spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTheme } from '../../contexts/ThemeContext';

interface Arrival {
  key: string;
  userId: string | null;
  name: string | null;
  avatar: string | null;
  eventTitle: string | null;
}

const VISIBLE_MS = 6000;

export function toArrival(n: LiveNotification): Arrival | null {
  if (n?.notification_type !== 'connection_arrived') return null;
  const x = n.extra_data || {};
  return {
    key: String(n.id ?? `${x.event_id}-${x.connection_user_id}`),
    userId: x.connection_user_id != null ? String(x.connection_user_id) : null,
    name: x.connection_name ? String(x.connection_name) : null,
    avatar: x.connection_avatar ? String(x.connection_avatar) : null,
    eventTitle: x.event_title ? String(x.event_title) : null,
  };
}

export default function ConnectionArrivedMoment() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeLiveNotifications((n) => {
      const a = toArrival(n);
      if (!a || seen.current.has(a.key)) return;
      seen.current.add(a.key);
      setArrival(a);
      feedback.moment('connectionArrived');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setArrival(null), VISIBLE_MS);
    });
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const open = useCallback(() => {
    const a = arrival;
    setArrival(null);
    if (!a || !navigationRef.isReady()) return;
    if (a.userId) {
      (navigationRef as any).navigate('Conversation', {
        userId: a.userId,
        ...(a.name ? { userName: a.name } : null),
      });
    } else {
      (navigationRef as any).navigate('Messages');
    }
  }, [arrival]);

  if (!arrival) return null;
  const line = arrival.name
    ? t('liveSignals.connectionArrived', { name: arrival.name })
    : t('liveSignals.connectionArrivedFallback');

  return (
    <Animated.View
      key={arrival.key}
      entering={(reduced ? FadeIn : FadeInUp).duration(Durations.enter)}
      exiting={(reduced ? FadeOut : FadeOutUp).duration(Durations.exit)}
      style={[styles.wrap, { top: insets.top + Spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${line}. ${t('liveSignals.connectionArrivedCta')}`}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primaryBg }]}>
          {arrival.avatar ? (
            <Image source={{ uri: arrival.avatar }} style={styles.avatarImg} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <Text style={[styles.initial, { color: colors.primary }]}>
              {(arrival.name || '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.texts}>
          <Text style={[styles.line, { color: colors.gray900 }]} numberOfLines={1}>{line}</Text>
          {!!arrival.eventTitle && (
            <Text style={[styles.sub, { color: colors.gray500 }]} numberOfLines={1}>{arrival.eventTitle}</Text>
          )}
        </View>
        <View style={[styles.cta, { backgroundColor: colors.primary }]}>
          <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
          <Text style={styles.ctaText}>{t('liveSignals.connectionArrivedCta')}</Text>
        </View>
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  initial: { fontFamily: FontFamily.bold, fontSize: 14 },
  texts: { flex: 1, minWidth: 0 },
  line: { fontFamily: FontFamily.bold, fontSize: 14 },
  sub: { fontFamily: FontFamily.medium, fontSize: 12, marginTop: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  ctaText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 12 },
});
