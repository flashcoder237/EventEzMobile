import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { useAlert } from '../../../contexts/AlertContext';
import { treasuryAPI } from '../../../api';
import { RootStackParamList, StaffMember, StaffPayment } from '../../../types';
import Badge from '../../../components/ui/Badge';
import RoleGuard from '../../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'staff' | 'payments';

export default function TreasuryStaffScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.treasury.staff.watermark')} title={t('admin.treasury.staff.guardTitle')}>
      <TreasuryStaffContent />
    </RoleGuard>
  );
}

function TreasuryStaffContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const { showSuccess, showError } = useAlert();
  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, paymentsRes] = await Promise.all([
        treasuryAPI.getStaffMembers().catch(() => ({ data: [] })),
        treasuryAPI.getStaffPayments().catch(() => ({ data: [] })),
      ]);
      setStaff(staffRes.data?.results || staffRes.data || []);
      setPayments(paymentsRes.data?.results || paymentsRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleGeneratePayroll = async () => {
    const now = new Date();
    setGeneratingPayroll(true);
    try {
      await treasuryAPI.generatePayroll({ month: now.getMonth() + 1, year: now.getFullYear() });
      showSuccess(t('common.success'), t('admin.treasury.staff.payrollSuccess'));
      fetchData();
    } catch (error) {
      showError(t('common.error'), t('admin.treasury.staff.payrollError'));
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const renderStaff = ({ item }: { item: StaffMember }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(item.user?.first_name?.[0] || item.user?.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.user?.first_name ? `${item.user.first_name} ${item.user.last_name || ''}` : item.user?.email || 'Staff'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>{item.role}</Text>
        </View>
        <Badge label={item.is_active ? t('admin.treasury.staff.active') : t('admin.treasury.staff.inactive')} variant={item.is_active ? 'success' : 'secondary'} size="sm" />
      </View>
      <View style={[styles.cardFooter, { borderTopColor: hairline }]}>
        <Text style={[styles.salary, { color: colors.primary }]}>
          {item.monthly_salary.toLocaleString()} {platformCurrency}{t('admin.treasury.staff.perMonth')}
        </Text>
        <Text style={[styles.hiredDate, { color: colors.gray500 }]}>
          {t('admin.treasury.staff.since', { date: new Date(item.hired_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) })}
        </Text>
      </View>
    </View>
  );

  const renderPayment = ({ item }: { item: StaffPayment }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.paymentIcon, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="cash-outline" size={18} color="#10B981" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.staff?.user?.first_name || 'Staff'} {item.staff?.user?.last_name || ''}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
            {new Date(item.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <Badge
          label={item.status === 'paid' ? t('admin.treasury.staff.statusPaid') : item.status === 'pending' ? t('admin.treasury.staff.statusPending') : t('admin.treasury.staff.statusFailed')}
          variant={item.status === 'paid' ? 'success' : item.status === 'pending' ? 'warning' : 'destructive'}
          size="sm"
        />
      </View>
      <View style={[styles.cardFooter, { borderTopColor: hairline }]}>
        <Text style={[styles.salary, { color: colors.text }]}>{item.amount.toLocaleString()} {platformCurrency}</Text>
      </View>
    </View>
  );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'staff', label: t('admin.treasury.staff.tabStaff'), count: staff.length },
    { key: 'payments', label: t('admin.treasury.staff.tabPayments'), count: payments.length },
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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.treasury.staff.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.treasury.staff.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={handleGeneratePayroll}
          disabled={generatingPayroll}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('admin.treasury.staff.generatePayroll')}
        >
          {generatingPayroll ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="calculator-outline" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.text, borderColor: colors.text }
                    : { backgroundColor: colors.card, borderColor: hairline },
                ]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? colors.background : colors.gray600 }]}>
                  {t.label} ({t.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={activeTab === 'staff' ? staff as any[] : payments as any[]}
        renderItem={activeTab === 'staff' ? renderStaff as any : renderPayment as any}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>
              {activeTab === 'staff' ? t('admin.treasury.staff.emptyStaff') : t('admin.treasury.staff.emptyPayments')}
            </Text>
          </View>
        }
      />
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
    gap: Spacing.sm,
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
  filtersRow: {
    paddingVertical: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, marginHorizontal: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  cardSubtitle: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  salary: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  hiredDate: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },
});
