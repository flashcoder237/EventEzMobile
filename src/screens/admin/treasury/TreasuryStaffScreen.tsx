import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { useAlert } from '../../../contexts/AlertContext';
import { treasuryAPI } from '../../../api';
import { RootStackParamList, StaffMember, StaffPayment } from '../../../types';
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

type TabType = 'staff' | 'payments';

export default function TreasuryStaffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
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
      showSuccess('Succes', 'Paie generee avec succes');
      fetchData();
    } catch (error) {
      showError('Erreur', 'Impossible de generer la paie');
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const renderStaff = ({ item }: { item: StaffMember }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(item.user?.first_name?.[0] || item.user?.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
            {item.user?.first_name ? `${item.user.first_name} ${item.user.last_name || ''}` : item.user?.email || 'Staff'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>{item.role}</Text>
        </View>
        <Badge label={item.is_active ? 'Actif' : 'Inactif'} variant={item.is_active ? 'success' : 'secondary'} size="sm" />
      </View>
      <View style={[styles.cardFooter, { borderTopColor: colors.gray100 }]}>
        <Text style={[styles.salary, { color: colors.primary }]}>
          {item.monthly_salary.toLocaleString()} {platformCurrency}/mois
        </Text>
        <Text style={[styles.hiredDate, { color: colors.gray400 }]}>
          Depuis {new Date(item.hired_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );

  const renderPayment = ({ item }: { item: StaffPayment }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      <View style={styles.cardRow}>
        <View style={[styles.paymentIcon, { backgroundColor: isDark ? '#1A2E1A' : '#D1FAE5' }]}>
          <Ionicons name="cash-outline" size={20} color="#10B981" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
            {item.staff?.user?.first_name || 'Staff'} {item.staff?.user?.last_name || ''}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
            {new Date(item.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <Badge
          label={item.status === 'paid' ? 'Paye' : item.status === 'pending' ? 'En attente' : 'Echoue'}
          variant={item.status === 'paid' ? 'success' : item.status === 'pending' ? 'warning' : 'destructive'}
          size="sm"
        />
      </View>
      <View style={[styles.cardFooter, { borderTopColor: colors.gray100 }]}>
        <Text style={[styles.salary, { color: colors.gray900 }]}>{item.amount.toLocaleString()} {platformCurrency}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Personnel & Paie</Text>
        <TouchableOpacity
          style={[styles.payrollBtn, { backgroundColor: '#4F46E5' }]}
          onPress={handleGeneratePayroll}
          disabled={generatingPayroll}
        >
          {generatingPayroll ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.gray100 }]}>
        {(['staff', 'payments'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: colors.gray500 }, activeTab === tab && { color: colors.primary }]}>
              {tab === 'staff' ? `Personnel (${staff.length})` : `Paiements (${payments.length})`}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>
              {activeTab === 'staff' ? 'Aucun personnel' : 'Aucun paiement'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3, flex: 1, textAlign: 'center' },
  payrollBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm, color: '#FFFFFF' },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginHorizontal: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  cardSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1 },
  salary: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  hiredDate: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.base },
});
