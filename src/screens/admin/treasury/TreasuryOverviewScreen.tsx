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
import { RootStackParamList, TreasuryOverview, PlatformTransaction } from '../../../types';
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

export default function TreasuryOverviewScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.treasury.overview.watermark')} title={t('admin.treasury.overview.guardTitle')}>
      <TreasuryOverviewContent />
    </RoleGuard>
  );
}

function TreasuryOverviewContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
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

  const menuItems: { icon: keyof typeof Ionicons.glyphMap; title: string; screen: string; color: string }[] = [
    { icon: 'people-outline', title: t('admin.treasury.overview.menuStaff'), screen: 'TreasuryStaff', color: '#4F46E5' },
    { icon: 'receipt-outline', title: t('admin.treasury.overview.menuExpenses'), screen: 'TreasuryExpenses', color: '#F59E0B' },
    { icon: 'pie-chart-outline', title: t('admin.treasury.overview.menuShareholders'), screen: 'TreasuryShareholders', color: '#A855F7' },
    { icon: 'document-text-outline', title: t('admin.treasury.overview.menuReports'), screen: 'TreasuryReports', color: '#10B981' },
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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.treasury.overview.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.treasury.overview.title')}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Card */}
        <View
          style={[
            styles.balanceCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <Text style={[styles.balanceEyebrow, { color: colors.gray500 }]}>{t('admin.treasury.overview.balanceEyebrow')}</Text>
          <Text style={[styles.balanceValue, { color: colors.text }]}>
            {formatAmount(wallet?.net_balance || 0)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Ionicons name="arrow-up-circle" size={14} color="#10B981" />
              <Text style={[styles.balanceStatText, { color: '#10B981' }]}>
                {formatAmount(wallet?.total_revenue || 0)}
              </Text>
            </View>
            <View style={[styles.balanceStatDivider, { backgroundColor: hairline }]} />
            <View style={styles.balanceStat}>
              <Ionicons name="arrow-down-circle" size={14} color="#EF4444" />
              <Text style={[styles.balanceStatText, { color: '#EF4444' }]}>
                {formatAmount(wallet?.total_expenses || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KPICard title={t('admin.treasury.overview.kpiCommissions')} value={formatAmount(wallet?.total_commissions || 0)} icon="trending-up" color="#4F46E5" />
          <KPICard title={t('admin.treasury.overview.kpiPayroll')} value={formatAmount(wallet?.total_payroll || 0)} icon="people-outline" color="#A855F7" />
        </View>
        <View style={styles.kpiRow}>
          <KPICard title={t('admin.treasury.overview.kpiExpenses')} value={formatAmount(wallet?.total_expenses || 0)} icon="card-outline" color="#F59E0B" />
          <KPICard title={t('admin.treasury.overview.kpiDividends')} value={formatAmount(wallet?.total_dividends || 0)} icon="pie-chart-outline" color="#10B981" />
        </View>

        {/* Menu */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.treasury.overview.sectionManagement')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuItem, idx < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: hairline }]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWell, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.treasury.overview.sectionRecent')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {transactions.length > 0 ? transactions.slice(0, 5).map((tx: PlatformTransaction, idx: number) => (
            <View
              key={tx.id}
              style={[styles.txRow, idx < Math.min(transactions.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: hairline }]}
            >
              <View style={[styles.txDot, { backgroundColor: getTransactionColor(tx.transaction_type) }]} />
              <View style={styles.txInfo}>
                <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={[styles.txDate, { color: colors.gray500 }]}>
                  {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: getTransactionColor(tx.transaction_type) }]}>
                {tx.transaction_type === 'commission' || tx.transaction_type === 'subscription' ? '+' : '-'}
                {tx.amount.toLocaleString()}
              </Text>
            </View>
          )) : (
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('admin.treasury.overview.noTransactions')}</Text>
          )}
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
  balanceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  balanceEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['3xl'],
    letterSpacing: -0.8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  balanceStatDivider: { width: 1, height: 14 },
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  txDot: { width: 8, height: 8, borderRadius: 4 },
  txInfo: { flex: 1 },
  txDesc: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  txDate: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  txAmount: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, textAlign: 'center', padding: Spacing.xl },
});
