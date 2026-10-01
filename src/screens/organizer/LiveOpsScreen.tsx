import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LiveDot, RollingText } from '../../components/ui/motion';
import { useMotionGate, useScreenFocused } from '../../components/ui/motion/useMotionGate';
import { useOrganizerTopic } from '../../hooks/useRealtime';
import { Curves, Durations } from '../../constants/motion';
import {
  checkinKey,
  LiveOpsMoment,
  newCheckins,
  pickLiveOpsMoment, crossedLiveOpsNotch,
  PEAK_MIN_ENTRIES,
} from '../../lib/utils/organizerMoments';
import { appDateLocale } from '../../lib/utils/dateFormatters';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { centeredContent, WIDE_MAX } from '../../constants/layout';
import { registrationsAPI } from '../../api';
import { haptics } from '../../utils/haptics';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'LiveOps'>;

// R2 O8 — les check-ins sont désormais POUSSÉS (topic `organizer:{uuid}`) ;
// le polling ne sert plus que de filet de sécurité (socket coupée).
const POLL_MS = 60000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RecentItem {
  holder_name?: string;
  ticket_type?: string;
  checked_in_at: string;
}

interface LiveOps {
  event_title: string;
  tickets_sold: number;
  checked_in: number;
  remaining: number;
  check_in_percentage: number;
  cadence_15min: number;
  cadence_60min: number;
  revenue: number;
  currency: string;
  recent: RecentItem[];
  timeline: { bucket_minutes: number; start: string; buckets: number[] };
  /** O8 — heure du tout premier check-in (« Portes ouvertes à 18:42 »). */
  first_check_in_at?: string | null;
}

function timeAgo(iso: string, t: (k: string, o?: any) => string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('organizer.liveOps.justNow');
  if (min < 60) return t('organizer.liveOps.minAgo', { count: min });
  const h = Math.floor(min / 60);
  return t('organizer.liveOps.hourAgo', { count: h });
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
  }
}

export default function LiveOpsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [data, setData] = useState<LiveOps | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const { canAnimate } = useMotionGate();
  // O8 — un seul moment par rafraîchissement, rien au premier chargement.
  const prevRef = useRef<LiveOps | null>(null);
  const [moment, setMoment] = useState<{ kind: LiveOpsMoment; key: number } | null>(null);
  const [freshKeys, setFreshKeys] = useState<Set<string>>(new Set());
  const [pendingNew, setPendingNew] = useState(0);
  const scrollYRef = useRef(0);
  // Liste affichée : figée tant que l'organisateur lit plus bas (puce « +3 »).
  const [shown, setShown] = useState<LiveOps | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await registrationsAPI.getLiveOps(eventId);
      const next = res.data as LiveOps;
      const prev = prevRef.current;
      prevRef.current = next;
      const m = pickLiveOpsMoment(prev, next);
      // H4 — palier de remplissage franchi en montant : un cran (50/75/90/100 %).
      if (crossedLiveOpsNotch(prev?.check_in_percentage, next.check_in_percentage) != null) {
        haptics.pattern('notch');
      }
      if (m) setMoment({ kind: m, key: Date.now() });
      const fresh = newCheckins(prev?.recent, next.recent);
      setData(next);
      if (!prev) {
        setShown(next);
      } else if (fresh.length && scrollYRef.current > 8) {
        // En cours de lecture : on n'insère rien sous le doigt, une puce propose.
        setPendingNew((n) => n + fresh.length);
      } else {
        setShown(next);
        setFreshKeys(new Set(fresh.map(checkinKey)));
      }
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // R2 O8 — check-in poussé : on relit le direct (la logique d'insertion par le
  // haut et les moments du lot O s'appliquent telles quelles). Le serveur
  // limite déjà à une diffusion toutes les 10 s.
  const focused = useScreenFocused();
  const topicEventId = UUID_RE.test(String(eventId))
    ? String(eventId)
    : (data as any)?.event_id && UUID_RE.test(String((data as any).event_id))
    ? String((data as any).event_id)
    : null;
  useOrganizerTopic(topicEventId, () => {
    load();
  }, focused);

  // Polling tant que l'écran est au premier plan (stoppé au blur → batterie).
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, POLL_MS);
      // Point « live » : LiveDot (radar unique, se met en pause tout seul
      // écran masqué / app en arrière-plan / animations réduites).
      return () => {
        clearInterval(id);
      };
    }, [load]),
  );

  useEffect(() => {
    if (!freshKeys.size) return;
    const id = setTimeout(() => setFreshKeys(new Set()), 1200);
    return () => clearTimeout(id);
  }, [freshKeys]);

  const showPending = useCallback(() => {
    setPendingNew(0);
    setShown(prevRef.current);
  }, []);

  // Barre de progression : scaleX (transform) au lieu d'une largeur en %.
  const progress = useSharedValue(0);
  const pctTarget = Math.min(100, data?.check_in_percentage ?? 0) / 100;
  useEffect(() => {
    progress.value = canAnimate
      ? withTiming(pctTarget, { duration: Durations.inform, easing: Curves.out })
      : pctTarget;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pctTarget, canAnimate]);
  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  let momentLabel: string | null = null;
  if (moment && data) {
    if (moment.kind === 'doors' && data.first_check_in_at) {
      const time = new Date(data.first_check_in_at).toLocaleTimeString(appDateLocale(), {
        hour: '2-digit',
        minute: '2-digit',
      });
      momentLabel = t('organizerMoments.liveOps.doors', { time });
    } else if (moment.kind === 'nearly_full') {
      momentLabel = t('organizerMoments.liveOps.nearlyFull');
    } else if (moment.kind === 'peak') {
      const b = data.timeline?.buckets ?? [];
      momentLabel = t('organizerMoments.liveOps.peak', { count: b.length ? b[b.length - 1] : 0 });
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const pct = data?.check_in_percentage ?? 0;
  // Garde défensive : le backend peut renvoyer un objet LiveOps sans `timeline`
  // (ou timeline=null) → `data.timeline.buckets` planterait. On sécurise l'accès.
  const buckets = data?.timeline?.buckets ?? [];
  const maxBucket = Math.max(1, ...buckets);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.liveTag}>
            <LiveDot size={7} color="#EF4444" />
            <Text style={styles.liveTagText}>{t('organizer.liveOps.live')}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.gray400} />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>
            {t('organizer.liveOps.error')}
          </Text>
          <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={64}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('organizer.liveOps.eyebrow')}</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {data?.event_title}
          </Text>

          {/* % validés — hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <RollingText value={`${pct}%`} style={[styles.heroPct, { color: colors.primary }]} />
            {!!momentLabel && (
              <Animated.View
                key={moment?.key}
                entering={canAnimate ? FadeInDown.duration(Durations.enter) : undefined}
                style={[styles.momentChip, { backgroundColor: `${colors.success}18` }]}
              >
                <Text style={[styles.momentText, { color: colors.success }]}>{momentLabel}</Text>
              </Animated.View>
            )}
            <Text style={[styles.heroLabel, { color: colors.gray500 }]}>
              {t('organizer.liveOps.arrived', { checked: data?.checked_in ?? 0, sold: data?.tickets_sold ?? 0 })}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary }, progressStyle]} />
            </View>
          </View>

          {/* Stat grid */}
          <View style={styles.grid}>
            <Stat
              icon="enter-outline" tint={colors.success}
              value={String(data?.cadence_15min ?? 0)}
              label={t('organizer.liveOps.last15')}
              colors={colors}
            />
            <Stat
              icon="time-outline" tint={colors.warning}
              value={String(data?.remaining ?? 0)}
              label={t('organizer.liveOps.remaining')}
              colors={colors}
            />
            <Stat
              icon="pulse-outline" tint={colors.primary}
              value={String(data?.cadence_60min ?? 0)}
              label={t('organizer.liveOps.last60')}
              colors={colors}
            />
            <Stat
              icon="cash-outline" tint={colors.accent}
              value={data ? formatMoney(data.revenue, data.currency) : '—'}
              label={t('organizer.liveOps.revenue')}
              colors={colors}
              small
            />
          </View>

          {/* Timeline mini bar chart */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('organizer.liveOps.cadenceTitle')}</Text>
            <View style={styles.chart}>
              {buckets.map((b, i) => {
                // O8 — le pic de la tranche courante (≥ 10 entrées) en dégradé.
                const isPeak = i === buckets.length - 1 && b >= PEAK_MIN_ENTRIES && b >= maxBucket;
                return (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(4, (b / maxBucket) * 100)}%`,
                          backgroundColor: b > 0 ? colors.primary : colors.surface,
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      {isPeak && (
                        <LinearGradient
                          colors={[colors.accent, colors.primary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.chartHint, { color: colors.gray400 }]}>
              {t('organizer.liveOps.chartHint', { minutes: (buckets.length || 8) * (data?.timeline?.bucket_minutes ?? 15) })}
            </Text>
          </View>

          {/* Recent activity */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.recentHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('organizer.liveOps.recentTitle')}</Text>
              {pendingNew > 0 && (
                <TouchableOpacity
                  onPress={showPending}
                  style={[styles.newChip, { backgroundColor: `${colors.success}18` }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.momentText, { color: colors.success }]}>
                    {t('organizerMoments.liveOps.newCount', { count: pendingNew })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {((shown ?? data)?.recent ?? []).length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.gray400 }]}>{t('organizer.liveOps.recentEmpty')}</Text>
            ) : (
              ((shown ?? data)?.recent ?? []).map((r, i) => (
                <Animated.View
                  key={checkinKey(r)}
                  entering={canAnimate && freshKeys.has(checkinKey(r)) ? FadeInDown.duration(Durations.enter) : undefined}
                  style={[
                    styles.recentRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.border : colors.gray100 },
                  ]}
                >
                  {freshKeys.has(checkinKey(r)) && (
                    <Animated.View
                      pointerEvents="none"
                      exiting={canAnimate ? FadeOut.duration(Durations.inform) : undefined}
                      style={[StyleSheet.absoluteFill, { backgroundColor: `${colors.success}14`, borderRadius: 10 }]}
                    />
                  )}
                  <View style={[styles.recentAvatar, { backgroundColor: `${colors.success}18` }]}>
                    <Ionicons name="checkmark" size={16} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                      {r.holder_name || t('organizer.liveOps.guest')}
                    </Text>
                    {!!r.ticket_type && (
                      <Text style={[styles.recentType, { color: colors.gray500 }]} numberOfLines={1}>{r.ticket_type}</Text>
                    )}
                  </View>
                  <Text style={[styles.recentTime, { color: colors.gray400 }]}>{timeAgo(r.checked_in_at, t)}</Text>
                </Animated.View>
              ))
            )}
          </View>

          <Text style={[styles.autoNote, { color: colors.gray400 }]}>{t('organizer.liveOps.autoRefresh')}</Text>
        </ScrollView>
      )}
    </View>
  );
}

function Stat({
  icon, value, label, tint, colors, small,
}: {
  icon: any; value: string; label: string; tint: string; colors: any; small?: boolean;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: colors.text, fontSize: small ? 18 : 26 }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.gray500 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  errorText: { fontFamily: FontFamily.medium, fontSize: 14, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.full },
  retryText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 13 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveTagText: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.5, color: '#EF4444' },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md, ...centeredContent(WIDE_MAX) },
  eyebrow: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.6 },
  title: { fontFamily: FontFamily.displayExtraBold, fontSize: 26, letterSpacing: -0.8, marginTop: 2 },

  heroCard: {
    borderWidth: 1, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, alignItems: 'center', gap: 8,
  },
  heroPct: { fontFamily: FontFamily.displayExtraBold, fontSize: 56, letterSpacing: -2, lineHeight: 60 },
  heroLabel: { fontFamily: FontFamily.medium, fontSize: 14 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  progressFill: { ...StyleSheet.absoluteFillObject, borderRadius: 4, transformOrigin: 'left center' },
  momentChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  momentText: { fontFamily: FontFamily.bold, fontSize: 12 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: Spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    flexBasis: '47.5%', flexGrow: 1, borderWidth: 1, borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: 6,
  },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.5 },
  statLabel: { fontFamily: FontFamily.medium, fontSize: 11, letterSpacing: 0.3 },

  card: { borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.md },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 14, letterSpacing: -0.2, marginBottom: Spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  chartHint: { fontFamily: FontFamily.regular, fontSize: 11, marginTop: 8 },

  emptyText: { fontFamily: FontFamily.regular, fontSize: 13, paddingVertical: Spacing.md, textAlign: 'center' },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10 },
  recentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  recentName: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  recentType: { fontFamily: FontFamily.regular, fontSize: 12, marginTop: 1 },
  recentTime: { fontFamily: FontFamily.medium, fontSize: 11 },

  autoNote: { fontFamily: FontFamily.regular, fontSize: 11, textAlign: 'center', marginTop: 4 },
});
