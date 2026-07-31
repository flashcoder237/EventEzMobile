import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { registrationsAPI } from '../../api';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'LiveOps'>;

const POLL_MS = 15000;

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
  const pulse = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  const load = useCallback(async () => {
    try {
      const res = await registrationsAPI.getLiveOps(eventId);
      setData(res.data as LiveOps);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Polling tant que l'écran est au premier plan (stoppé au blur → batterie).
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, POLL_MS);
      // Pulsation « live » — coupée en reduced-motion (indicateur statique).
      let anim: ReturnType<typeof Animated.loop> | undefined;
      if (reducedMotion) {
        pulse.setValue(1);
      } else {
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          ]),
        );
        anim.start();
      }
      return () => {
        clearInterval(id);
        anim?.stop();
      };
    }, [load, pulse, reducedMotion]),
  );

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
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
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
            <Text style={[styles.heroPct, { color: colors.primary }]}>{pct}%</Text>
            <Text style={[styles.heroLabel, { color: colors.gray500 }]}>
              {t('organizer.liveOps.arrived', { checked: data?.checked_in ?? 0, sold: data?.tickets_sold ?? 0 })}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, pct)}%` }]} />
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
              {buckets.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(4, (b / maxBucket) * 100)}%`,
                        backgroundColor: b > 0 ? colors.primary : colors.surface,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <Text style={[styles.chartHint, { color: colors.gray400 }]}>
              {t('organizer.liveOps.chartHint', { minutes: (buckets.length || 8) * (data?.timeline?.bucket_minutes ?? 15) })}
            </Text>
          </View>

          {/* Recent activity */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('organizer.liveOps.recentTitle')}</Text>
            {(data?.recent ?? []).length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.gray400 }]}>{t('organizer.liveOps.recentEmpty')}</Text>
            ) : (
              (data?.recent ?? []).map((r, i) => (
                <View key={i} style={[styles.recentRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? colors.border : colors.gray100 }]}>
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
                </View>
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
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  liveTagText: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.5, color: '#EF4444' },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md },
  eyebrow: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.6 },
  title: { fontFamily: FontFamily.displayExtraBold, fontSize: 26, letterSpacing: -0.8, marginTop: 2 },

  heroCard: {
    borderWidth: 1, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, alignItems: 'center', gap: 8,
  },
  heroPct: { fontFamily: FontFamily.displayExtraBold, fontSize: 56, letterSpacing: -2, lineHeight: 60 },
  heroLabel: { fontFamily: FontFamily.medium, fontSize: 14 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

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
