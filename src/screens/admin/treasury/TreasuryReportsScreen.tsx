import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../contexts/ThemeContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { treasuryAPI } from '../../../api';
import { RootStackParamList } from '../../../types';
import { KPICard, ChartWrapper } from '../../../components/charts';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TreasuryReportsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Rapports financiers</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Net Profit Card */}
        <View style={[styles.profitCard, { backgroundColor: netProfit >= 0 ? (isDark ? '#0A2E1A' : '#D1FAE5') : (isDark ? '#2E0A0A' : '#FEE2E2') }]}>
          <Text style={[styles.profitLabel, { color: netProfit >= 0 ? '#059669' : '#DC2626' }]}>
            {netProfit >= 0 ? 'Benefice net' : 'Perte nette'}
          </Text>
          <Text style={[styles.profitValue, { color: netProfit >= 0 ? '#059669' : '#DC2626' }]}>
            {formatAmount(Math.abs(netProfit))}
          </Text>
          <Text style={[styles.profitMargin, { color: netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
            Marge: {margin}%
          </Text>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <KPICard title="Revenus" value={formatAmount(revenue)} icon="trending-up" color="#10B981" />
          <KPICard title="Depenses" value={formatAmount(expenses)} icon="trending-down" color="#EF4444" />
        </View>

        {/* P&L Breakdown */}
        <ChartWrapper title="Compte de resultat" subtitle="Repartition revenus/depenses">
          <View style={styles.plBreakdown}>
            {/* Revenue Section */}
            <View style={styles.plSection}>
              <Text style={[styles.plSectionTitle, { color: '#10B981' }]}>Revenus</Text>
              {[
                { label: 'Commissions', value: profitLoss?.commissions || summary?.commissions || 0 },
                { label: 'Abonnements', value: profitLoss?.subscriptions || summary?.subscriptions || 0 },
              ].map((item) => (
                <View key={item.label} style={styles.plRow}>
                  <Text style={[styles.plLabel, { color: colors.gray600 }]}>{item.label}</Text>
                  <Text style={[styles.plValue, { color: colors.gray900 }]}>{formatAmount(item.value)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.plDivider, { backgroundColor: colors.gray100 }]} />

            {/* Expenses Section */}
            <View style={styles.plSection}>
              <Text style={[styles.plSectionTitle, { color: '#EF4444' }]}>Depenses</Text>
              {[
                { label: 'Masse salariale', value: profitLoss?.payroll || summary?.payroll || 0 },
                { label: 'Depenses operationnelles', value: profitLoss?.operational_expenses || summary?.operational || 0 },
                { label: 'Dividendes verses', value: profitLoss?.dividends || summary?.dividends || 0 },
              ].map((item) => (
                <View key={item.label} style={styles.plRow}>
                  <Text style={[styles.plLabel, { color: colors.gray600 }]}>{item.label}</Text>
                  <Text style={[styles.plValue, { color: colors.gray900 }]}>{formatAmount(item.value)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.plDivider, { backgroundColor: colors.gray300 }]} />

            {/* Total */}
            <View style={styles.plRow}>
              <Text style={[styles.plTotalLabel, { color: colors.gray900 }]}>Resultat net</Text>
              <Text style={[styles.plTotalValue, { color: netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                {formatAmount(netProfit)}
              </Text>
            </View>
          </View>
        </ChartWrapper>

        {/* Monthly Ratios */}
        <View style={[styles.ratiosCard, { backgroundColor: colors.card }, Shadows.card]}>
          <Text style={[styles.ratiosTitle, { color: colors.gray900 }]}>Ratios cles</Text>
          {[
            { label: 'Marge nette', value: `${margin}%`, color: margin >= 0 ? '#10B981' : '#EF4444' },
            { label: 'Ratio depenses/revenus', value: revenue > 0 ? `${Math.round((expenses / revenue) * 100)}%` : '0%', color: colors.gray900 },
            { label: 'Paie / Revenus', value: revenue > 0 ? `${Math.round(((profitLoss?.payroll || 0) / revenue) * 100)}%` : '0%', color: colors.gray900 },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.ratioRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.gray100 }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  profitCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md },
  profitLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, marginBottom: Spacing.xs },
  profitValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['3xl'] },
  profitMargin: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, marginTop: Spacing.xs },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  plBreakdown: { width: '100%' },
  plSection: { marginBottom: Spacing.sm },
  plSectionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, marginBottom: Spacing.xs },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  plLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  plValue: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  plDivider: { height: 1, marginVertical: Spacing.sm },
  plTotalLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  plTotalValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.md },
  ratiosCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.md, marginTop: Spacing.md },
  ratiosTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, marginBottom: Spacing.md },
  ratioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  ratioLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  ratioValue: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
});
