import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../contexts/ThemeContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { treasuryAPI } from '../../../api/client';
import { RootStackParamList, TreasuryOverview, PlatformTransaction } from '../../../types';
import { KPICard } from '../../../components/charts';
import Badge from '../../../components/ui/Badge';
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

export default function TreasuryOverviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<TreasuryOverview | null>(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await treasuryAPI.getOverview();
      setOverview(res.data);
    } catch (error) {
      if (__DEV__) console.error('Erreur tresorerie:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOverview();
    setRefreshing(false);
  };

  const wallet = overview?.wallet;
  const transactions = overview?.recent_transactions || [];

  const menuItems = [
    { icon: 'people-outline' as const, title: 'Personnel & Paie', screen: 'TreasuryStaff' as const, color: '#4F46E5' },
    { icon: 'receipt-outline' as const, title: 'Depenses', screen: 'TreasuryExpenses' as const, color: '#F59E0B' },
    { icon: 'pie-chart-outline' as const, title: 'Actionnaires', screen: 'TreasuryShareholders' as const, color: '#A855F7' },
    { icon: 'document-text-outline' as const, title: 'Rapports financiers', screen: 'TreasuryReports' as const, color: '#10B981' },
  ];

  const formatAmount = (amount: number) => `${amount.toLocaleString()} ${platformCurrency}`;

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'commission': case 'subscription': return '#10B981';
      case 'expense': case 'payroll': case 'dividend': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Tresorerie</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }, Shadows.card]}>
          <Text style={[styles.balanceLabel, { color: colors.gray500 }]}>Solde net</Text>
          <Text style={[styles.balanceValue, { color: colors.gray900 }]}>
            {formatAmount(wallet?.net_balance || 0)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Ionicons name="arrow-up-circle" size={16} color="#10B981" />
              <Text style={[styles.balanceStatText, { color: '#10B981' }]}>
                {formatAmount(wallet?.total_revenue || 0)}
              </Text>
            </View>
            <View style={styles.balanceStat}>
              <Ionicons name="arrow-down-circle" size={16} color="#EF4444" />
              <Text style={[styles.balanceStatText, { color: '#EF4444' }]}>
                {formatAmount(wallet?.total_expenses || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KPICard title="Commissions" value={formatAmount(wallet?.total_commissions || 0)} icon="trending-up" color="#4F46E5" />
          <KPICard title="Paie" value={formatAmount(wallet?.total_payroll || 0)} icon="people-outline" color="#A855F7" />
        </View>
        <View style={styles.kpiRow}>
          <KPICard title="Depenses" value={formatAmount(wallet?.total_expenses || 0)} icon="card-outline" color="#F59E0B" />
          <KPICard title="Dividendes" value={formatAmount(wallet?.total_dividends || 0)} icon="pie-chart-outline" color="#10B981" />
        </View>

        {/* Menu */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Gestion</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuItem, idx < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.gray100 }]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.menuTitle, { color: colors.gray900 }]}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Transactions recentes</Text>
        <View style={[styles.transactionsCard, { backgroundColor: colors.card }]}>
          {transactions.length > 0 ? transactions.slice(0, 5).map((tx: PlatformTransaction, idx: number) => (
            <View
              key={tx.id}
              style={[styles.txRow, idx < Math.min(transactions.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.gray100 }]}
            >
              <View style={[styles.txDot, { backgroundColor: getTransactionColor(tx.transaction_type) }]} />
              <View style={styles.txInfo}>
                <Text style={[styles.txDesc, { color: colors.gray900 }]} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={[styles.txDate, { color: colors.gray400 }]}>
                  {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: getTransactionColor(tx.transaction_type) }]}>
                {tx.transaction_type === 'commission' || tx.transaction_type === 'subscription' ? '+' : '-'}
                {tx.amount.toLocaleString()}
              </Text>
            </View>
          )) : (
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aucune transaction</Text>
          )}
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
  balanceCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.xl, marginBottom: Spacing.md, alignItems: 'center' },
  balanceLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginBottom: Spacing.xs },
  balanceValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['3xl'] },
  balanceRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { ...TextStyles.h4, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  menuCard: { borderRadius: BorderRadius['2xl'], ...Shadows.card, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  menuIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSizes.base },
  transactionsCard: { borderRadius: BorderRadius['2xl'], ...Shadows.card, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  txDot: { width: 8, height: 8, borderRadius: 4 },
  txInfo: { flex: 1 },
  txDesc: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  txDate: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  txAmount: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, textAlign: 'center', padding: Spacing.xl },
});
