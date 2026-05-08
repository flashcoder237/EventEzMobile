import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { treasuryAPI } from '../../../api';
import { RootStackParamList } from '../../../types';
import { KPICard } from '../../../components/charts';
import RoleGuard from '../../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TreasuryReportsScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.treasury.reports.watermark')} title={t('admin.treasury.reports.guardTitle')}>
      <TreasuryReportsContent />
    </RoleGuard>
  );
}

function TreasuryReportsContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [plRes, sumRes] = await Promise.all([
        treasuryAPI.getProfitLoss().catch(() => ({ data: null })),
        treasuryAPI.getFinancialSummary().catch(() => ({ data: null })),
      ]);
      setProfitLoss(plRes.data);
      setSummary(sumRes.data);
    } catch (error) {
      if (__DEV__) console.error('Erreur rapports financiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const formatAmount = (amount: number) => `${amount.toLocaleString()} ${platformCurrency}`;

  const revenue = profitLoss?.total_revenue || summary?.total_revenue || 0;
  const expenses = profitLoss?.total_expenses || summary?.total_expenses || 0;
  const netProfit = profitLoss?.net_profit || (revenue - expenses);
  const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
  const profitable = netProfit >= 0;
  const profitColor = profitable ? '#10B981' : '#EF4444';

  const revenueRows = [
    { label: t('admin.treasury.reports.rowCommissions'), value: profitLoss?.commissions || summary?.commissions || 0 },
    { label: t('admin.treasury.reports.rowSubscriptions'), value: profitLoss?.subscriptions || summary?.subscriptions || 0 },
  ];

  const expenseRows = [
    { label: t('admin.treasury.reports.rowPayroll'), value: profitLoss?.payroll || summary?.payroll || 0 },
    { label: t('admin.treasury.reports.rowOperational'), value: profitLoss?.operational_expenses || summary?.operational || 0 },
    { label: t('admin.treasury.reports.rowDividends'), value: profitLoss?.dividends || summary?.dividends || 0 },
  ];

  const ratios = [
    { label: t('admin.treasury.reports.ratioMargin'), value: `${margin}%`, color: profitable ? '#10B981' : '#EF4444' },
    { label: t('admin.treasury.reports.ratioExpenses'), value: revenue > 0 ? `${Math.round((expenses / revenue) * 100)}%` : '0%', color: colors.text },
    { label: t('admin.treasury.reports.ratioPayroll'), value: revenue > 0 ? `${Math.round(((profitLoss?.payroll || 0) / revenue) * 100)}%` : '0%', color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.treasury.reports.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.treasury.reports.title')}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Net Profit Card */}
        <View
          style={[
            styles.profitCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <Text style={[styles.profitEyebrow, { color: colors.gray500 }]}>
            {profitable ? t('admin.treasury.reports.netProfit') : t('admin.treasury.reports.netLoss')}
          </Text>
          <Text style={[styles.profitValue, { color: profitColor }]}>
            {formatAmount(Math.abs(netProfit))}
          </Text>
          <View style={[styles.profitBadge, { backgroundColor: `${profitColor}15` }]}>
            <Ionicons
              name={profitable ? 'trending-up' : 'trending-down'}
              size={14}
              color={profitColor}
            />
            <Text style={[styles.profitBadgeText, { color: profitColor }]}>
              {t('admin.treasury.reports.marginBadge', { percent: margin })}
            </Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <KPICard title={t('admin.treasury.reports.kpiRevenue')} value={formatAmount(revenue)} icon="trending-up" color="#10B981" />
          <KPICard title={t('admin.treasury.reports.kpiExpenses')} value={formatAmount(expenses)} icon="trending-down" color="#EF4444" />
        </View>

        {/* P&L Breakdown */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.treasury.reports.sectionPL')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <View style={{ padding: Spacing.md }}>
            <Text style={[styles.plSectionTitle, { color: '#10B981' }]}>{t('admin.treasury.reports.plRevenue')}</Text>
            {revenueRows.map((item) => (
              <View key={item.label} style={styles.plRow}>
                <Text style={[styles.plLabel, { color: colors.gray600 }]}>{item.label}</Text>
                <Text style={[styles.plValue, { color: colors.text }]}>{formatAmount(item.value)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.plDivider, { backgroundColor: hairline }]} />

          <View style={{ padding: Spacing.md }}>
            <Text style={[styles.plSectionTitle, { color: '#EF4444' }]}>{t('admin.treasury.reports.plExpenses')}</Text>
            {expenseRows.map((item) => (
              <View key={item.label} style={styles.plRow}>
                <Text style={[styles.plLabel, { color: colors.gray600 }]}>{item.label}</Text>
                <Text style={[styles.plValue, { color: colors.text }]}>{formatAmount(item.value)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.plDivider, { backgroundColor: hairline }]} />

          <View style={[styles.plTotalRow, { padding: Spacing.md }]}>
            <Text style={[styles.plTotalLabel, { color: colors.text }]}>{t('admin.treasury.reports.plNetResult')}</Text>
            <Text style={[styles.plTotalValue, { color: profitColor }]}>{formatAmount(netProfit)}</Text>
          </View>
        </View>

        {/* Monthly Ratios */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.treasury.reports.sectionRatios')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {ratios.map((item, idx) => (
            <View
              key={item.label}
              style={[styles.ratioRow, idx < ratios.length - 1 && { borderBottomWidth: 1, borderBottomColor: hairline }]}
            >
              <Text style={[styles.ratioLabel, { color: colors.gray600 }]}>{item.label}</Text>
              <Text style={[styles.ratioValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  profitCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  profitEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  profitValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['3xl'],
    letterSpacing: -0.8,
    marginBottom: Spacing.sm,
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  profitBadgeText: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  plSectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  plLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  plValue: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  plDivider: { height: 1 },
  plTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plTotalLabel: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.base, letterSpacing: -0.3 },
  plTotalValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.base, letterSpacing: -0.3 },
  ratioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  ratioLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  ratioValue: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
});
