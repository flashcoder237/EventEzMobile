/**
 * Signaux « plateforme vivante » (micro-delight R2, V1–V5, V9, V10).
 *
 * Honnêteté : chaque composant n'affiche QUE ce que le serveur renvoie. Un
 * champ `null` (sous le seuil, événement terminé, organisateur sur son propre
 * événement…) ne rend rien — aucune valeur n'est inventée côté client.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { FontFamily } from '../../../constants/theme';
import { Durations, Curves } from '../../../constants/motion';
import { useMotionGate } from '../../ui/motion';
import { parseLastSale, type EventPulse } from '../../../lib/realtime/pulse';
import { countdownHaptic } from '../../../lib/utils/hapticCountdown';
import { haptics } from '../../../utils/haptics';

// ── V1 — « N personnes regardent » ──────────────────────────────────────────

export const WatchingLine = memo(function WatchingLine({ pulse }: { pulse: EventPulse | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const w = pulse?.watching;
  if (!w || !(w.count > 0)) return null;
  const label = w.at_least
    ? t('liveSignals.watchingAtLeast', { count: w.count })
    : t('liveSignals.watching', { count: w.count });
  return (
    // La clé change avec le chiffre : un fondu court, pas de boucle.
    <Animated.View key={label} entering={FadeIn.duration(Durations.respond)} style={styles.signalRow}>
      <Ionicons name="eye-outline" size={14} color={colors.gray500} />
      <Text style={[styles.signalText, { color: colors.gray600 }]} accessibilityRole="text">
        {label}
      </Text>
    </Animated.View>
  );
});

// ── V2 — « Réservé il y a N min » ───────────────────────────────────────────

export const LastSaleLine = memo(function LastSaleLine({ pulse }: { pulse: EventPulse | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sale = parseLastSale(pulse?.last_sale);
  if (!sale) return null;
  const label =
    sale.kind === 'just_now'
      ? t('liveSignals.lastSaleJustNow')
      : sale.kind === 'minutes'
      ? t('liveSignals.lastSaleMinutes', { count: sale.minutes })
      : sale.kind === 'this_hour'
      ? t('liveSignals.lastSaleThisHour')
      : t('liveSignals.lastSaleToday');
  return (
    <Animated.View key={label} entering={FadeIn.duration(Durations.respond)} style={styles.signalRow}>
      <Ionicons name="ticket-outline" size={14} color={colors.gray500} />
      <Text style={[styles.signalText, { color: colors.gray600 }]}>{label}</Text>
    </Animated.View>
  );
});

// ── S3/V — « N personnes déjà sur place » ───────────────────────────────────

export const OnSiteLine = memo(function OnSiteLine({ pulse }: { pulse: EventPulse | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = pulse?.on_site;
  if (!s || !(s.count > 0)) return null;
  const label = s.at_least
    ? t('liveSignals.onSiteAtLeast', { count: s.count })
    : t('liveSignals.onSite', { count: s.count });
  return (
    <Animated.View key={label} entering={FadeIn.duration(Durations.respond)} style={styles.signalRow}>
      <Ionicons name="people-outline" size={14} color={colors.gray500} />
      <Text style={[styles.signalText, { color: colors.gray600 }]}>{label}</Text>
    </Animated.View>
  );
});

// ── V4 — « Awa et 2 de vos connexions y vont » ──────────────────────────────

export interface ConnectionsGoing {
  count: number;
  users: { id: number | string; first_name?: string | null; profile_picture?: string | null }[];
}

export const ConnectionsGoingLine = memo(function ConnectionsGoingLine({
  data,
}: {
  data: ConnectionsGoing | null | undefined;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  if (!data || !Array.isArray(data.users) || data.users.length === 0 || !(data.count > 0)) return null;
  const users = data.users.slice(0, 3);
  const name = users[0]?.first_name || t('liveSignals.someone');
  const name2 = users[1]?.first_name || t('liveSignals.someone');
  const label =
    data.count === 1
      ? t('liveSignals.connectionsOne', { name })
      : data.count === 2 && users.length >= 2
      ? t('liveSignals.connectionsTwo', { name, name2 })
      : t('liveSignals.connectionsMany', { name, count: data.count - 1 });
  return (
    <View style={styles.connRow} accessibilityLabel={`${t('liveSignals.connectionsA11y')} : ${label}`}>
      <View style={styles.avatarStack}>
        {users.map((u, i) => (
          // Les avatars se posent un par un (fondu décalé), puis plus rien ne bouge.
          <Animated.View
            key={String(u.id)}
            entering={canAnimate ? FadeIn.delay(i * 80).duration(Durations.enter) : undefined}
            style={[
              styles.avatar,
              {
                marginLeft: i > 0 ? -10 : 0,
                zIndex: 3 - i,
                backgroundColor: colors.primaryBg,
                borderColor: colors.surface,
              },
            ]}
          >
            {u.profile_picture ? (
              <Image
                source={{ uri: u.profile_picture }}
                style={styles.avatarImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {(u.first_name || '?').charAt(0).toUpperCase()}
              </Text>
            )}
          </Animated.View>
        ))}
      </View>
      <Text style={[styles.connText, { color: colors.gray700 }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
});

// ── V5 — organisateur joignable ─────────────────────────────────────────────

export interface Reachability {
  online: boolean;
  typical_response_minutes: number | null;
}

export function formatResponseDuration(minutes: number, t: (k: string, o?: any) => string): string {
  if (minutes >= 1440) return t('liveSignals.durDay');
  if (minutes >= 60) return t('liveSignals.durHours', { count: Math.round(minutes / 60) });
  return t('liveSignals.durMinutes', { count: minutes });
}

export const ReachabilityLine = memo(function ReachabilityLine({
  data,
}: {
  data: Reachability | null | undefined;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!data) return null;
  if (data.online) {
    return (
      <View style={styles.signalRow}>
        <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.signalText, { color: colors.gray600 }]}>{t('liveSignals.online')}</Text>
      </View>
    );
  }
  if (typeof data.typical_response_minutes !== 'number' || data.typical_response_minutes <= 0) return null;
  return (
    <View style={styles.signalRow}>
      <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.gray500} />
      <Text style={[styles.signalText, { color: colors.gray600 }]}>
        {t('liveSignals.repliesWithin', {
          duration: formatResponseDuration(data.typical_response_minutes, t),
        })}
      </Text>
    </View>
  );
});

// ── V3 — jauge d'un tarif qui avance en direct ──────────────────────────────

const GLOW_W = 18;

/**
 * Remplissage (vendu / total) d'un tarif. Au montage : posé, sans animation.
 * Sur une BAISSE réelle de la disponibilité pendant que la jauge est à
 * l'écran : elle avance (scaleX, timing) et une seule lueur passe au bout.
 */
export const LiveFillBar = memo(function LiveFillBar({
  available,
  total,
  color,
}: {
  available: number;
  total: number;
  color: string;
}) {
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const ratio = total > 0 ? Math.min(1, Math.max(0, (total - available) / total)) : 0;
  const fill = useSharedValue(ratio);
  const glow = useSharedValue(0);
  const prevAvailable = useRef(available);

  useEffect(() => {
    const dropped = available < prevAvailable.current;
    prevAvailable.current = available;
    if (!dropped || !canAnimate) {
      fill.value = ratio;
      return;
    }
    fill.value = withTiming(ratio, { duration: Durations.inform, easing: Curves.out });
    glow.value = withSequence(
      withTiming(1, { duration: Durations.respond, easing: Curves.out }),
      withTiming(0, { duration: Durations.glint, easing: Curves.inOut }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, ratio, canAnimate]);

  const trackW = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    // La lueur suit le bout de la barre (transform uniquement).
    transform: [{ translateX: Math.max(0, fill.value * trackW.value - GLOW_W) }],
  }));

  if (!(total > 0)) return null;
  return (
    <View
      style={[styles.track, { backgroundColor: colors.gray100 }]}
      accessibilityElementsHidden
      onLayout={(e) => {
        trackW.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
    </View>
  );
});

// ── V9 — place gardée 15 min ────────────────────────────────────────────────

function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const SeatHeldBanner = memo(function SeatHeldBanner({
  expiresAt,
  onBook,
}: {
  expiresAt: string | null | undefined;
  onBook: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const end = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState(() => Date.now());
  const expired = !Number.isFinite(end) || now >= end;
  // H5 — crans haptiques (T-5 min, T-1 min, 5 dernières secondes) seulement
  // quand l'écran est affiché et l'app au premier plan.
  const { focused, appActive } = useMotionGate();
  const visibleRef = useRef(focused && appActive);
  visibleRef.current = focused && appActive;

  useEffect(() => {
    if (!Number.isFinite(end) || Date.now() >= end) return;
    let prevLeft = end - Date.now();
    // Compte à rebours réel ; l'horloge s'ARRÊTE à l'expiration.
    const timer = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const leftMs = end - n;
      const h = countdownHaptic(prevLeft, leftMs);
      prevLeft = leftMs;
      if (h && visibleRef.current) haptics.pattern(h);
      if (n >= end) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);

  if (!Number.isFinite(end)) return null;
  const left = formatClock(end - now);
  return (
    <Animated.View
      entering={FadeIn.duration(Durations.enter)}
      style={[styles.seatBanner, { backgroundColor: colors.primaryBg, borderColor: `${colors.primary}33` }]}
    >
      <View style={styles.seatTop}>
        <Ionicons name="time-outline" size={18} color={colors.primary} />
        <Text style={[styles.seatTitle, { color: colors.gray900 }]}>{t('liveSignals.seatHeldTitle')}</Text>
        {!expired && (
          <Text
            style={[styles.seatClock, { color: colors.primary }]}
            accessibilityLabel={t('liveSignals.seatHeldA11y', { time: left })}
          >
            {left}
          </Text>
        )}
      </View>
      <Text style={[styles.seatBody, { color: colors.gray700 }]}>
        {expired ? t('liveSignals.seatHeldExpired') : t('liveSignals.seatHeldBody')}
      </Text>
      {!expired && (
        <TouchableOpacity
          onPress={onBook}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={[styles.seatCta, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.seatCtaText}>{t('liveSignals.seatHeldCta')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

// ── V11 — présence dans une session en cours ────────────────────────────────

/** « 38 présents · 75 % de la salle » — seulement si le serveur l'envoie
 *  (session en cours et au moins 10 présents), sinon rien. */
export const SessionAttendanceLine = memo(function SessionAttendanceLine({
  count,
  rate,
}: {
  count: number | null | undefined;
  rate: number | null | undefined;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (typeof count !== 'number' || count <= 0 || typeof rate !== 'number') return null;
  return (
    <View style={styles.signalRow}>
      <Ionicons name="people" size={13} color={colors.accent} />
      <Text style={[styles.signalText, { color: colors.gray600 }]}>
        {t('liveSignals.sessionAttendance', { count, rate: Math.round(rate * 100) })}
      </Text>
    </View>
  );
});

// ── V10 — pouls de la ville ─────────────────────────────────────────────────

export interface CityPulse {
  city: string;
  bookings_24h: { count: number; at_least: boolean } | null;
  live_events: number | null;
}

export const CityPulseLine = memo(function CityPulseLine({ data }: { data: CityPulse | null | undefined }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!data) return null;
  const b = data.bookings_24h;
  const live = typeof data.live_events === 'number' && data.live_events > 0 ? data.live_events : 0;
  if (!(b && b.count > 0) && !live) return null;
  const parts: string[] = [];
  if (b && b.count > 0) {
    parts.push(
      b.at_least
        ? t('liveSignals.cityPulseAtLeast', { count: b.count, city: data.city })
        : t('liveSignals.cityPulse', { count: b.count, city: data.city }),
    );
  }
  if (live) parts.push(t('liveSignals.cityLive', { count: live }));
  return (
    <Animated.View entering={FadeIn.duration(Durations.enter)} style={styles.signalRow}>
      <Ionicons name="pulse-outline" size={14} color={colors.accent} />
      <Text style={[styles.signalText, { color: colors.gray600 }]} numberOfLines={2}>
        {parts.join(' · ')}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  signalText: { fontFamily: FontFamily.medium, fontSize: 13, flexShrink: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  avatarStack: { flexDirection: 'row' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontFamily: FontFamily.bold, fontSize: 12 },
  connText: { fontFamily: FontFamily.medium, fontSize: 14, flex: 1 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  fill: { ...StyleSheet.absoluteFillObject, transformOrigin: 'left' } as any,
  glow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: GLOW_W,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  seatBanner: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, marginTop: 12 },
  seatTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seatTitle: { fontFamily: FontFamily.bold, fontSize: 15, flex: 1 },
  seatClock: { fontFamily: FontFamily.bold, fontSize: 16, fontVariant: ['tabular-nums'] },
  seatBody: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  seatCta: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  seatCtaText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 14 },
});
