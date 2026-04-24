import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
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
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
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
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWell, { backgroundColor: '#F59E0B15' }]}>
          <Ionicons name={item.is_recurring ? 'repeat-outline' : 'receipt-outline'} size={18} color="#F59E0B" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.category, { color: colors.gray500 }]} numberOfLines={1}>{item.category}</Text>
        </View>
        <Badge label={statusLabel(item.status)} variant={statusVariant(item.status)} size="sm" />
      </View>
      <View style={[styles.cardFooter, { borderTopColor: hairline }]}>
        <Text style={[styles.amount, { color: colors.text }]}>{item.amount.toLocaleString()} {platformCurrency}</Text>
        <Text style={[styles.date, { color: colors.gray500 }]}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      {item.status === 'pending' && (
        <View style={[styles.actions, { borderTopColor: hairline }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}
            onPress={() => handleApprove(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={14} color="#10B981" />
            <Text style={[styles.actionText, { color: '#10B981' }]}>Approuver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}
            onPress={() => handleReject(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Rejeter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>LES SORTIES</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dépenses</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{totalPending.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>EN ATTENTE</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: hairline }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{totalApproved.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>APPROUVÉ</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: hairline }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{expenses.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>TOTAL</Text>
          </View>
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
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>Aucune dépense</Text>
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg, letterSpacing: -0.3 },
  summaryLabel: { fontFamily: FontFamily.bold, fontSize: 9, letterSpacing: 1.2 },
  summaryDivider: { width: 1, height: 32 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginHorizontal: Spacing.md },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  category: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  amount: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  date: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  actions: {
    flexDirection: 'row',
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  actionText: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },
});
