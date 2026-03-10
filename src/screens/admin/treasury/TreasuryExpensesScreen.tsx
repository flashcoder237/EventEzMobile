import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { useAlert } from '../../../contexts/AlertContext';
import { treasuryAPI } from '../../../api';
import { RootStackParamList, Expense } from '../../../types';
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

const statusVariant = (s: string): 'warning' | 'success' | 'destructive' | 'info' | 'secondary' => {
  switch (s) {
    case 'pending': return 'warning';
    case 'approved': case 'paid': return 'success';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

const statusLabel = (s: string): string => {
  switch (s) {
    case 'pending': return 'En attente';
    case 'approved': return 'Approuve';
    case 'rejected': return 'Rejete';
    case 'paid': return 'Paye';
    default: return s;
  }
};

export default function TreasuryExpensesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const { showSuccess, showError } = useAlert();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await treasuryAPI.getExpenses();
      const data = res.data?.results || res.data || [];
      setExpenses(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur depenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      await treasuryAPI.approveExpense(id);
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' as const } : e));
      showSuccess('Succes', 'Depense approuvee');
    } catch (error) {
      showError('Erreur', 'Impossible d\'approuver');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await treasuryAPI.rejectExpense(id, 'Rejete par l\'administrateur');
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected' as const } : e));
      showSuccess('Succes', 'Depense rejetee');
    } catch (error) {
      showError('Erreur', 'Impossible de rejeter');
    }
  };

  const totalPending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      <View style={styles.cardRow}>
        <View style={[styles.icon, { backgroundColor: isDark ? '#2D2B1B' : '#FEF3C7' }]}>
          <Ionicons name={item.is_recurring ? 'repeat-outline' : 'receipt-outline'} size={20} color="#F59E0B" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.gray900 }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.category, { color: colors.gray500 }]}>{item.category}</Text>
        </View>
        <Badge label={statusLabel(item.status)} variant={statusVariant(item.status)} size="sm" />
      </View>
      <View style={[styles.cardFooter, { borderTopColor: colors.gray100 }]}>
        <Text style={[styles.amount, { color: colors.gray900 }]}>{item.amount.toLocaleString()} {platformCurrency}</Text>
        <Text style={[styles.date, { color: colors.gray400 }]}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#10B981' }]} onPress={() => handleApprove(item.id)}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.actionText}>Approuver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleReject(item.id)}>
            <Ionicons name="close" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Rejeter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Depenses</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{totalPending.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.gray400 }]}>En attente</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{totalApproved.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.gray400 }]}>Approuve</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{expenses.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.gray400 }]}>Total</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aucune depense</Text>
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
  headerTitle: { ...TextStyles.h3 },
  summary: { flexDirection: 'row', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg },
  summaryLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginHorizontal: Spacing.md },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  category: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1 },
  amount: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  date: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  actions: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: 4 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: 4 },
  actionText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.xs, color: '#FFFFFF' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.base },
});
