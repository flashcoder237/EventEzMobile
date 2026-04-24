import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useOrganizerWallet } from '../../hooks/useOrganizerWallet';
import { analyticsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { KPICard, ChartWrapper } from '../../components/charts';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = '7d' | '30d' | '90d' | '1y';

export default function AnalyticsDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  // Strategie "Event mono-devise" : tous les events de l'organisateur sont
  // dans la devise de son wallet → on lit directement celle-ci.
  const { currency: walletCurrency } = useOrganizerWallet();
  const platformCurrency = walletCurrency === 'XAF' || walletCurrency === 'XOF' ? 'FCFA' : walletCurrency;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const params = { period: timeRange };
      const [summaryRes, revenueRes, registrationRes] = await Promise.all([
        analyticsAPI.getDashboardSummary(params).catch(() => ({ data: null })),
        analyticsAPI.getRevenueAnalytics(params).catch(() => ({ data: null })),
        analyticsAPI.getRegistrationAnalytics(params).catch(() => ({ data: null })),
      ]);

      setSummary(summaryRes.data);
      setRevenueData(revenueRes.data);
      setRegistrationData(registrationRes.data);
    } catch (error) {
      if (__DEV__) console.error('Erreur analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7j' },
    { key: '30d', label: '30j' },
    { key: '90d', label: '90j' },
    { key: '1y', label: '1 an' },
  ];

  const totalRevenue = summary?.total_revenue || revenueData?.total || 0;
  const totalRegistrations = summary?.total_registrations || registrationData?.total || 0;
  const totalEvents = summary?.total_events || 0;
  const avgAttendance = summary?.avg_attendance_rate || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TA PERFORMANCE</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Time Range Selector */}
        <View style={[styles.timeRangeContainer, { backgroundColor: colors.gray100 }]}>
          {timeRanges.map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[
                styles.timeRangeButton,
                timeRange === range.key && { backgroundColor: colors.card },
              ]}
              onPress={() => setTimeRange(range.key)}
            >
              <Text style={[
                styles.timeRangeText,
                { color: colors.gray500 },
                timeRange === range.key && { color: colors.primary },
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KPICard
            title="Revenus"
            value={`${totalRevenue.toLocaleString()} ${platformCurrency}`}
            icon="cash-outline"
            color="#10B981"
            trend={summary?.revenue_trend ? { value: summary.revenue_trend, label: 'vs prev' } : undefined}
          />
          <KPICard
            title="Inscriptions"
            value={totalRegistrations}
            icon="people-outline"
            color="#4F46E5"
            trend={summary?.registration_trend ? { value: summary.registration_trend, label: 'vs prev' } : undefined}
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            title="Evenements"
            value={totalEvents}
            icon="calendar-outline"
            color="#A855F7"
          />
          <KPICard
            title="Taux presence"
            value={`${Math.round(avgAttendance)}%`}
            icon="checkmark-circle-outline"
            color="#F59E0B"
          />
        </View>

        {/* Registrations Chart Placeholder */}
        <ChartWrapper title="Inscriptions" subtitle={`Derniers ${timeRange === '7d' ? '7 jours' : timeRange === '30d' ? '30 jours' : timeRange === '90d' ? '90 jours' : '12 mois'}`}>
          <View style={[styles.chartPlaceholder, { backgroundColor: colors.gray50 }]}>
            {registrationData?.timeline ? (
              <View style={styles.barChart}>
                {(registrationData.timeline as any[]).slice(-7).map((item: any, idx: number) => {
                  const maxVal = Math.max(...(registrationData.timeline as any[]).slice(-7).map((i: any) => i.count || 0), 1);
                  const height = ((item.count || 0) / maxVal) * 100;
                  return (
                    <View key={idx} style={styles.barColumn}>
                      <View style={[styles.bar, { height, backgroundColor: '#4F46E5' }]} />
                      <Text style={[styles.barLabel, { color: colors.gray400 }]}>
                        {item.label || idx + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="bar-chart-outline" size={40} color={colors.gray300} />
                <Text style={[styles.noDataText, { color: colors.gray400 }]}>
                  Pas encore de donnees
                </Text>
              </View>
            )}
          </View>
        </ChartWrapper>

        {/* Revenue Chart Placeholder */}
        <ChartWrapper title="Revenus" subtitle="Evolution des revenus">
          <View style={[styles.chartPlaceholder, { backgroundColor: colors.gray50 }]}>
            {revenueData?.timeline ? (
              <View style={styles.barChart}>
                {(revenueData.timeline as any[]).slice(-7).map((item: any, idx: number) => {
                  const maxVal = Math.max(...(revenueData.timeline as any[]).slice(-7).map((i: any) => i.amount || 0), 1);
                  const height = ((item.amount || 0) / maxVal) * 100;
                  return (
                    <View key={idx} style={styles.barColumn}>
                      <View style={[styles.bar, { height, backgroundColor: '#10B981' }]} />
                      <Text style={[styles.barLabel, { color: colors.gray400 }]}>
                        {item.label || idx + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="trending-up" size={40} color={colors.gray300} />
                <Text style={[styles.noDataText, { color: colors.gray400 }]}>
                  Pas encore de donnees
                </Text>
              </View>
            )}
          </View>
        </ChartWrapper>

        {/* Quick Links */}
        <View style={[styles.quickLinksCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.quickLinksTitle, { color: colors.gray900 }]}>Actions rapides</Text>
          <TouchableOpacity
            style={[styles.quickLink, { borderBottomColor: colors.gray100 }]}
            onPress={() => navigation.navigate('Reports')}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLinkText, { color: colors.gray700 }]}>Voir les rapports</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickLink, { borderBottomColor: colors.gray100 }]}
            onPress={() => navigation.navigate('MyEvents')}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLinkText, { color: colors.gray700 }]}>Mes evenements</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { ...TextStyles.h3, letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  timeRangeContainer: { flexDirection: 'row', borderRadius: BorderRadius.xl, padding: 4, marginBottom: Spacing.lg },
  timeRangeButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, alignItems: 'center' },
  timeRangeText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  chartPlaceholder: { width: '100%', height: 160, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%', height: 140, paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  barColumn: { alignItems: 'center', flex: 1 },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
  noDataContainer: { alignItems: 'center', gap: Spacing.sm },
  noDataText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  quickLinksCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.md, marginTop: Spacing.md, ...Shadows.card },
  quickLinksTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, marginBottom: Spacing.md },
  quickLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, gap: Spacing.md },
  quickLinkText: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
});
