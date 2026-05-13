import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useOrganizerWallet } from '../../hooks/useOrganizerWallet';
import { analyticsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';
import { AnalyticsDashboardScreenSkeleton } from '../../components/ui/Skeleton';
import ExportButton from '../../components/common/ExportButton';
import { KPICard, BarChart } from '../../components/charts';
import { displayCurrency } from '../../lib/utils/priceFormatters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TimeRange = '7d' | '30d' | '90d' | '1y';

export default function AnalyticsDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showError } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: walletCurrency } = useOrganizerWallet();
  const platformCurrency = displayCurrency(walletCurrency);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [hasFetchError, setHasFetchError] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const buildDateRange = (range: TimeRange) => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - days * 86400_000);
    const start = startDate.toISOString().slice(0, 10);
    return { start_date: start, end_date: end };
  };

  // Nombre de barres à afficher selon la période — équilibre entre densité et lisibilité.
  // 7d → 7 barres (jour par jour) ; 30d → 10 ; 90d → 12 (par semaine) ; 1y → 12 (mois).
  const chartBarCount: Record<TimeRange, number> = { '7d': 7, '30d': 10, '90d': 12, '1y': 12 };

  const fetchAnalytics = async () => {
    let failures = 0;
    try {
      const params = buildDateRange(timeRange);
      const [summaryRes, revenueRes, registrationRes] = await Promise.all([
        analyticsAPI.getDashboardSummary(params).catch((err) => {
          failures += 1;
          if (__DEV__) console.error('summary failed', err);
          return { data: null };
        }),
        analyticsAPI.getRevenueAnalytics(params).catch((err) => {
          failures += 1;
          if (__DEV__) console.error('revenue failed', err);
          return { data: null };
        }),
        analyticsAPI.getRegistrationAnalytics(params).catch((err) => {
          failures += 1;
          if (__DEV__) console.error('registration failed', err);
          return { data: null };
        }),
      ]);

      setSummary(summaryRes.data);
      setRevenueData(revenueRes.data);
      setRegistrationData(registrationRes.data);

      // Alerte UNIQUEMENT en panne totale (3/3 endpoints échoués). En partiel
      // (1-2 fails), on rend les sections disponibles sans bloquer l'écran
      // d'un alert intrusif — la valeur 0/—  parle d'elle-même + le banner
      // hasFetchError donne le contexte si besoin.
      if (failures >= 3) {
        setHasFetchError(true);
        showError(
          t('organizer.analyticsDashboard.dataUnavailableTitle'),
          t('organizer.analyticsDashboard.dataUnavailableMessage')
        );
      } else {
        setHasFetchError(failures > 0);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur analytics:', error);
      setHasFetchError(true);
      // Erreur globale (ex: Promise.all rejeté avant catch individuel) — on
      // garde l'alert mais avec un message plus utile : la cause probable
      // est le réseau ou une perte d'auth.
      showError(
        t('organizer.analyticsDashboard.networkErrorTitle'),
        t('organizer.analyticsDashboard.networkErrorMessage')
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const timeRanges: { key: TimeRange; label: string; eyebrow: string }[] = [
    { key: '7d', label: t('organizer.analyticsDashboard.range7d'), eyebrow: t('organizer.analyticsDashboard.range7dEyebrow') },
    { key: '30d', label: t('organizer.analyticsDashboard.range30d'), eyebrow: t('organizer.analyticsDashboard.range30dEyebrow') },
    { key: '90d', label: t('organizer.analyticsDashboard.range90d'), eyebrow: t('organizer.analyticsDashboard.range90dEyebrow') },
    { key: '1y', label: t('organizer.analyticsDashboard.range1y'), eyebrow: t('organizer.analyticsDashboard.range1yEyebrow') },
  ];

  // Backend retourne une structure imbriquée (event_summary, revenue_summary, registration_summary, trends).
  // On fallback aussi sur les endpoints dédiés (revenue / registrations) si l'organisateur a appelé
  // ces actions ou si dashboard_summary n'a pas la donnée.
  const totalRevenue =
    summary?.revenue_summary?.total_revenue ??
    revenueData?.total_revenue ??
    0;
  const totalRegistrations =
    summary?.registration_summary?.summary?.total_registrations ??
    registrationData?.summary?.total_registrations ??
    0;
  const totalEvents = summary?.event_summary?.total_events ?? 0;
  const avgAttendance = summary?.event_summary?.avg_fill_rate ?? 0;

  const revenueTrend = summary?.trends?.revenue_trend ?? 0;
  const registrationTrend = summary?.trends?.registration_trend ?? 0;
  const hasTrendData = (summary?.trends?.revenue_trend ?? null) !== null
    || (summary?.trends?.registration_trend ?? null) !== null;

  // Libellé de la période de comparaison — backend compare la période courante
  // à la même durée glissée juste avant. Exemple : timeRange='30d' → "vs 30
  // jours précédents". Sert au subtitle des KPI cards et au bandeau hero.
  const compareLabel = (() => {
    switch (timeRange) {
      case '7d': return t('organizer.analyticsDashboard.compare7d');
      case '30d': return t('organizer.analyticsDashboard.compare30d');
      case '90d': return t('organizer.analyticsDashboard.compare90d');
      case '1y': return t('organizer.analyticsDashboard.compare1y');
    }
  })();

  // KPI cards via le composant partagé `<KPICard variant="editorial" />`.

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>DATA</WatermarkNumeral>
        <AnalyticsDashboardScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>DATA</WatermarkNumeral>

      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('organizer.analyticsDashboard.eyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.analyticsDashboard.title')}</Text>
          </View>
          <ExportButton
            endpoint="/analytics/export/"
            filename={`analytics_${timeRange}`}
            params={buildDateRange(timeRange)}
            compact
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('Reports')}
            style={[styles.headerCtaPill, Shadows.buttonPrimary]}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="document-text" size={14} color={Colors.white} />
            <Text style={styles.headerCtaText}>{t('organizer.analyticsDashboard.reportsCta')}</Text>
          </TouchableOpacity>
        </View>

        {/* === TIME RANGE CHIPS === */}
        <View style={styles.chipsRow}>
          {timeRanges.map((range) => {
            const active = timeRange === range.key;
            return (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.text}
                    : {
                        backgroundColor: colors.card,
                        borderColor: hairline,
                        borderWidth: 1,
                      },
                ]}
                onPress={() => setTimeRange(range.key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? Colors.white : colors.gray700 },
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* === REVENUE HERO CARD === */}
        <StaggeredItem index={0}>
          <View style={[styles.heroCard, Shadows.lg]}>
            <LinearGradient
              colors={['#0F172A', '#1E1B4B', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />
            <Text style={styles.heroWatermark}>{platformCurrency}</Text>

            <View style={styles.heroTopRow}>
              <Text style={styles.heroEyebrow}>{t('organizer.analyticsDashboard.heroEyebrow')}</Text>
              <View style={styles.heroPeriodPill}>
                <Text style={styles.heroPeriodText}>
                  {timeRanges.find((r) => r.key === timeRange)?.eyebrow}
                </Text>
              </View>
            </View>

            <View style={styles.heroAmountRow}>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {totalRevenue.toLocaleString()}
              </Text>
              <Text style={styles.heroCurrency}>{platformCurrency}</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroBottomRow}>
              <View style={styles.heroBottomCell}>
                <Text style={styles.heroBottomEyebrow}>{t('organizer.analyticsDashboard.heroBottomRegistrations')}</Text>
                <View style={styles.heroBottomValueRow}>
                  <Text style={styles.heroBottomValue}>{totalRegistrations}</Text>
                  {registrationTrend !== 0 && (
                    <Ionicons
                      name={registrationTrend > 0 ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={registrationTrend > 0 ? '#BEFF5A' : '#FFA5A5'}
                    />
                  )}
                </View>
              </View>
              <View style={styles.heroBottomDivider} />
              <View style={styles.heroBottomCell}>
                <Text style={styles.heroBottomEyebrow}>{t('organizer.analyticsDashboard.heroBottomEvents')}</Text>
                <Text style={styles.heroBottomValue}>{totalEvents}</Text>
              </View>
            </View>
            {hasTrendData && (
              <Text style={styles.heroCompareLabel}>{compareLabel}</Text>
            )}
          </View>
        </StaggeredItem>

        {/* === KPI GRID === */}
        <StaggeredItem index={1}>
          <View style={styles.kpiGrid}>
            <KPICard variant="editorial"
              eyebrow={t('eyebrow.revenue')}
              label={t('organizer.analyticsDashboard.kpiRevenueLabel')}
              value={totalRevenue.toLocaleString()}
              suffix={platformCurrency}
              icon="cash-outline"
              color="#10B981"
              trend={revenueTrend}
              subtitle={compareLabel}
            />
            <KPICard variant="editorial"
              eyebrow={t('eyebrow.registered')}
              label={t('organizer.analyticsDashboard.kpiRegistrationsLabel')}
              value={totalRegistrations}
              icon="people-outline"
              color="#4F46E5"
              trend={registrationTrend}
              subtitle={compareLabel}
            />
          </View>
        </StaggeredItem>

        <StaggeredItem index={2}>
          <View style={styles.kpiGrid}>
            <KPICard variant="editorial"
              eyebrow={t('eyebrow.eventsShort')}
              label={t('organizer.analyticsDashboard.kpiEventsLabel')}
              value={totalEvents}
              icon="calendar-outline"
              color="#A855F7"
            />
            <KPICard variant="editorial"
              eyebrow={t('eyebrow.attendance')}
              label={t('organizer.analyticsDashboard.kpiAttendanceLabel')}
              value={`${Math.round(avgAttendance)}%`}
              icon="checkmark-circle-outline"
              color="#F59E0B"
            />
          </View>
        </StaggeredItem>

        {/* === REGISTRATIONS CHART === */}
        <StaggeredItem index={3}>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
            <View style={styles.chartHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chartEyebrow, { color: colors.accent }]}>
                  {t('organizer.analyticsDashboard.chartRegistrationsEyebrow')}
                </Text>
                <Text style={[styles.chartTitle, { color: colors.text }]}>{t('organizer.analyticsDashboard.chartRegistrationsTitle')}</Text>
                <Text style={[styles.chartSubtitle, { color: colors.gray500 }]}>
                  {timeRange === '7d'
                    ? t('organizer.analyticsDashboard.chartSubtitle7d')
                    : timeRange === '30d'
                    ? t('organizer.analyticsDashboard.chartSubtitle30d')
                    : timeRange === '90d'
                    ? t('organizer.analyticsDashboard.chartSubtitle90d')
                    : t('organizer.analyticsDashboard.chartSubtitle1y')}
                </Text>
              </View>
              <View style={[styles.chartLegend, { backgroundColor: '#4F46E515' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
                <Text style={styles.legendText}>{t('organizer.analyticsDashboard.legendRegistrations')}</Text>
              </View>
            </View>
            <View style={[styles.chartArea, { borderTopColor: hairline }]}>
              {registrationData?.timeline && (registrationData.timeline as any[]).length > 0 ? (
                <BarChart
                  data={(registrationData.timeline as any[])
                    .slice(-chartBarCount[timeRange])
                    .map((i: any) => ({ label: i.label || '', value: i.count || 0 }))}
                  gradientColors={['#4F46E5', '#312E81']}
                  height={150}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="bar-chart-outline" size={36} color={colors.gray300} />
                  <Text style={[styles.noDataEyebrow, { color: colors.accent }]}>{t('organizer.analyticsDashboard.noDataEyebrow')}</Text>
                  <Text style={[styles.noDataText, { color: colors.gray500 }]}>
                    {t('organizer.analyticsDashboard.noDataRegistrations')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </StaggeredItem>

        {/* === REVENUE CHART === */}
        <StaggeredItem index={4}>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
            <View style={styles.chartHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chartEyebrow, { color: colors.accent }]}>
                  {t('organizer.analyticsDashboard.chartRevenueEyebrow')}
                </Text>
                <Text style={[styles.chartTitle, { color: colors.text }]}>{t('organizer.analyticsDashboard.chartRevenueTitle')}</Text>
                <Text style={[styles.chartSubtitle, { color: colors.gray500 }]}>
                  {t('organizer.analyticsDashboard.chartSubtitleRevenue', { currency: platformCurrency })}
                </Text>
              </View>
              <View style={[styles.chartLegend, { backgroundColor: '#10B98115' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendText, { color: '#059669' }]}>{t('organizer.analyticsDashboard.legendRevenue')}</Text>
              </View>
            </View>
            <View style={[styles.chartArea, { borderTopColor: hairline }]}>
              {revenueData?.timeline && (revenueData.timeline as any[]).length > 0 ? (
                <BarChart
                  data={(revenueData.timeline as any[])
                    .slice(-chartBarCount[timeRange])
                    .map((i: any) => ({ label: i.label || '', value: i.amount || 0 }))}
                  gradientColors={['#10B981', '#047857']}
                  height={150}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="trending-up" size={36} color={colors.gray300} />
                  <Text style={[styles.noDataEyebrow, { color: colors.accent }]}>{t('organizer.analyticsDashboard.noDataEyebrow')}</Text>
                  <Text style={[styles.noDataText, { color: colors.gray500 }]}>
                    {t('organizer.analyticsDashboard.noDataRevenue')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </StaggeredItem>

        {/* === QUICK LINKS === */}
        <StaggeredItem index={5}>
          <View style={styles.quickLinksHeader}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('organizer.analyticsDashboard.quickLinksEyebrow')}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('organizer.analyticsDashboard.quickLinksTitle')}</Text>
          </View>
          <View style={[styles.quickLinksCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
            <TouchableOpacity
              style={[styles.quickLink, { borderBottomColor: hairline }]}
              onPress={() => navigation.navigate('Reports')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: '#4F46E515' }]}>
                <Ionicons name="document-text-outline" size={16} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickLinkTitle, { color: colors.text }]}>{t('organizer.analyticsDashboard.linkReportsTitle')}</Text>
                <Text style={[styles.quickLinkSub, { color: colors.gray500 }]}>
                  {t('organizer.analyticsDashboard.linkReportsSub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickLink, { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('MyEvents')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: '#A855F715' }]}>
                <Ionicons name="calendar-outline" size={16} color="#A855F7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickLinkTitle, { color: colors.text }]}>{t('organizer.analyticsDashboard.linkMyEventsTitle')}</Text>
                <Text style={[styles.quickLinkSub, { color: colors.gray500 }]}>
                  {t('organizer.analyticsDashboard.linkMyEventsSub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </StaggeredItem>

        <View style={{ height: 140 }} />
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: Spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  headerCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  headerCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // === CHIPS ===
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    flex: 1,
    alignItems: 'center',
  },
  chipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  // === HERO CARD ===
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 200,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  heroCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(190,255,90,0.12)',
  },
  heroWatermark: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 60,
    letterSpacing: -3,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 60,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  heroEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroPeriodPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroPeriodText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: Spacing.md,
  },
  heroAmount: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 42,
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 44,
  },
  heroCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.md,
  },
  heroBottomRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroBottomCell: {
    flex: 1,
  },
  heroBottomDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBottomEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroBottomValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBottomValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.7,
    lineHeight: 24,
  },
  heroCompareLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.55)',
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // === KPI GRID ===
  kpiGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // === CHART CARD ===
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chartEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  chartTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  chartSubtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#312E81',
  },
  chartArea: {
    width: '100%',
    height: 160,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  noDataEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 6,
  },
  noDataText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // === QUICK LINKS ===
  quickLinksHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
  },
  quickLinksCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  quickLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
  },
  quickLinkSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
});
