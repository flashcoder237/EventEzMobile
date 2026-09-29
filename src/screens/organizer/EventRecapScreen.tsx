/**
 * O13 — Bilan d'un événement terminé.
 *
 * Le seul moment de fin de cycle du produit : présents / attendus, recettes,
 * note moyenne (les étoiles se remplissent une à une, UNE fois), le mot qui
 * reste (jamais sous 4★ — c'est le backend qui le choisit), les derniers avis,
 * et deux suites naturelles : remercier les participants, voir les fonds.
 *
 * Données : `GET /api/events/{id}/recap/` (organisateur / équipe seulement).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { eventsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { BorderRadius, FontFamily, Spacing } from '../../constants/theme';
import { centeredContent, WIDE_MAX } from '../../constants/layout';
import { Durations } from '../../constants/motion';
import { CountUpText, useFirstSeen } from '../../components/ui/motion';
import { useMotionGate } from '../../components/ui/motion/useMotionGate';
import { formatPriceAmount, displayCurrency } from '../../lib/utils/priceFormatters';
import { shortMonthLabel } from '../../lib/utils/dateFormatters';
import { tintFor } from '../../lib/utils/themeTint';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EventRecap'>;

interface Review {
  rating: number;
  comment?: string;
  author?: string;
  created_at: string;
}

interface Recap {
  event_id: string;
  event_title: string;
  theme_tint?: any;
  attendance: { attended: number; expected: number; rate: number | null; first_check_in_at?: string | null };
  revenue: { amount: number; currency: string };
  sold_out_at?: string | null;
  reviews: { count: number; average: number | null; best_comment: Review | null; latest: Review[] };
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${shortMonthLabel(d)}`;
}

export default function EventRecapScreen() {
  const navigation = useNavigation<Nav>();
  const { eventId } = useRoute<Route>().params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });

  const [data, setData] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventsAPI.getEventRecap(eventId);
      setData(res.data as Recap);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Les étoiles ne se remplissent qu'à la toute première ouverture du bilan.
  const firstView = useFirstSeen('ez:moments:recap', data ? data.event_id : null);
  const animateStars = firstView === true && canAnimate;

  const tint = tintFor(data?.theme_tint, isDark);
  const avg = data?.reviews.average ?? null;
  const rate = data?.attendance.rate;

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizerMoments.recap.title')}</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.gray400} />
          <Text style={[styles.muted, { color: colors.gray500 }]}>{t('organizerMoments.recap.error')}</Text>
          <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.rule, { backgroundColor: tint }]} />
          <Text style={[styles.eyebrow, { color: tint }]}>{t('organizerMoments.recap.eyebrow')}</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
            {data.event_title}
          </Text>
          {!!data.sold_out_at && (
            <Text style={[styles.muted, { color: colors.gray500 }]}>
              {t('organizerMoments.recap.soldOutAt', { date: dayLabel(data.sold_out_at) })}
            </Text>
          )}

          <View style={styles.grid}>
            <View style={[styles.cell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cellLabel, { color: colors.gray500 }]}>{t('organizerMoments.recap.attended')}</Text>
              <CountUpText
                value={data.attendance.attended}
                countKey={`recap-attended:${data.event_id}`}
                group
                style={[styles.cellValue, { color: colors.text }]}
              />
              <Text style={[styles.cellHint, { color: colors.gray500 }]}>
                {t('organizerMoments.recap.attendedOf', {
                  attended: formatPriceAmount(data.attendance.attended),
                  expected: formatPriceAmount(data.attendance.expected),
                })}
                {rate != null ? ` · ${t('organizerMoments.recap.rate', { rate: Math.round(rate) })}` : ''}
              </Text>
            </View>
            <View style={[styles.cell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cellLabel, { color: colors.gray500 }]}>{t('organizerMoments.recap.revenue')}</Text>
              <CountUpText
                value={Math.round(data.revenue.amount)}
                countKey={`recap-revenue:${data.event_id}`}
                group
                style={[styles.cellValue, { color: colors.text }]}
              />
              <Text style={[styles.cellHint, { color: colors.gray500 }]}>{displayCurrency(data.revenue.currency)}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('organizerMoments.recap.rating')}</Text>
            {avg == null ? (
              <Text style={[styles.muted, { color: colors.gray500 }]}>{t('organizerMoments.recap.noReviews')}</Text>
            ) : (
              <>
                <View style={styles.starsRow} accessible accessibilityLabel={`${avg.toFixed(1)} / 5`}>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const filled = avg >= i + 0.75 ? 'star' : avg >= i + 0.25 ? 'star-half' : 'star-outline';
                    const star = <Ionicons name={filled as any} size={26} color="#F59E0B" />;
                    return animateStars ? (
                      <Animated.View key={i} entering={FadeIn.delay(i * 120).duration(Durations.respond)}>
                        {star}
                      </Animated.View>
                    ) : (
                      <View key={i}>{star}</View>
                    );
                  })}
                  <Text style={[styles.avgText, { color: colors.text }]}>{avg.toFixed(1).replace('.', ',')}</Text>
                </View>
                <Text style={[styles.muted, { color: colors.gray500 }]}>
                  {t('organizerMoments.recap.reviews', { count: data.reviews.count })}
                </Text>
              </>
            )}
          </View>

          {!!data.reviews.best_comment?.comment && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('organizerMoments.recap.best')}</Text>
              <Text style={[styles.quote, { color: colors.text }]}>« {data.reviews.best_comment.comment} »</Text>
              {!!data.reviews.best_comment.author && (
                <Text style={[styles.muted, { color: colors.gray500 }]}>— {data.reviews.best_comment.author}</Text>
              )}
            </View>
          )}

          {data.reviews.latest.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('organizerMoments.recap.latest')}</Text>
              {data.reviews.latest.map((r, i) => (
                <View
                  key={`${r.created_at}-${i}`}
                  style={[styles.reviewRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.gray100 }]}
                >
                  <Text style={styles.reviewStars}>{'★'.repeat(Math.max(0, Math.min(5, r.rating)))}</Text>
                  {!!r.comment && (
                    <Text style={[styles.reviewText, { color: colors.text }]} numberOfLines={3}>
                      {r.comment}
                    </Text>
                  )}
                  {!!r.author && <Text style={[styles.muted, { color: colors.gray500 }]}>{r.author}</Text>}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primary, { backgroundColor: colors.text }]}
            onPress={() => navigation.navigate('EventRegistrations', { eventId })}
            accessibilityRole="button"
          >
            <Ionicons name="heart-outline" size={18} color={colors.background} />
            <Text style={[styles.primaryText, { color: colors.background }]}>{t('organizerMoments.recap.thank')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondary, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Wallet')}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>{t('organizerMoments.recap.funds')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.full },
  retryText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 13 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 15 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md, ...centeredContent(WIDE_MAX) },
  rule: { width: 40, height: 3, borderRadius: 2 },
  eyebrow: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.6 },
  title: { fontFamily: FontFamily.displayExtraBold, fontSize: 26, letterSpacing: -0.8 },
  muted: { fontFamily: FontFamily.medium, fontSize: 13 },
  grid: { flexDirection: 'row', gap: Spacing.sm },
  cell: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: 4 },
  cellLabel: { fontFamily: FontFamily.medium, fontSize: 12 },
  cellValue: { fontFamily: FontFamily.displayExtraBold, fontSize: 28, letterSpacing: -0.6 },
  cellHint: { fontFamily: FontFamily.medium, fontSize: 11.5 },
  card: { borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: 8 },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 14 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  avgText: { fontFamily: FontFamily.bold, fontSize: 18, marginLeft: 8 },
  quote: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 22 },
  reviewRow: { paddingVertical: 10, gap: 4 },
  reviewStars: { color: '#F59E0B', fontSize: 13, letterSpacing: 1 },
  reviewText: { fontFamily: FontFamily.regular, fontSize: 13.5, lineHeight: 19 },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: BorderRadius.full, marginTop: Spacing.sm,
  },
  primaryText: { fontFamily: FontFamily.bold, fontSize: 14 },
  secondary: { alignItems: 'center', paddingVertical: 13, borderRadius: BorderRadius.full, borderWidth: 1 },
  secondaryText: { fontFamily: FontFamily.semiBold, fontSize: 14 },
});
