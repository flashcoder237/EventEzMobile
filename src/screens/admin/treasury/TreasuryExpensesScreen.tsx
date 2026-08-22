import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
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
import { useFeedback } from '../../../contexts/FeedbackContext';
import { treasuryAPI } from '../../../api';
import { fetchAllPages } from '../../../lib/utils/fetchAllPages';
import { RootStackParamList, Expense } from '../../../types';
import Badge from '../../../components/ui/Badge';
import RoleGuard from '../../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../../constants/theme';
import { getApiErrorMessage } from '../../../lib/utils/errorHandling';
import { FormErrors } from '../../../lib/validation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const statusVariant = (s: string): 'warning' | 'success' | 'destructive' | 'info' | 'secondary' => {
  switch (s) {
    case 'pending': return 'warning';
    case 'approved': case 'paid': return 'success';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

export default function TreasuryExpensesScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.treasury.expenses.watermark')} title={t('admin.treasury.expenses.guardTitle')}>
      <TreasuryExpensesContent />
    </RoleGuard>
  );
}

// Catégories proposées en preset — l'admin peut taper sa propre valeur via le
// champ catégorie. Aligné avec les buckets compta classiques.
const EXPENSE_CATEGORIES = [
  'infrastructure',
  'marketing',
  'software',
  'travel',
  'office',
  'legal',
  'tax',
  'other',
] as const;

function TreasuryExpensesContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const { showSuccess, showError } = useAlert();
  const { toastSuccess } = useFeedback();
  const statusLabel = (s: string): string => {
    switch (s) {
      case 'pending': return t('admin.treasury.expenses.statusPending');
      case 'approved': return t('admin.treasury.expenses.statusApproved');
      case 'rejected': return t('admin.treasury.expenses.statusRejected');
      case 'paid': return t('admin.treasury.expenses.statusPaid');
      default: return s;
    }
  };
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Création d'une dépense
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  // Erreurs de validation client, affichées sous le champ fautif du modal.
  const [createErrors, setCreateErrors] = useState<FormErrors<'title' | 'amount'>>({});
  const [createCategory, setCreateCategory] = useState<string>('other');
  const [createDescription, setCreateDescription] = useState('');
  const [createIsRecurring, setCreateIsRecurring] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateAmount('');
    setCreateCategory('other');
    setCreateDescription('');
    setCreateIsRecurring(false);
    setCreateErrors({});
  };

  const closeCreateModal = () => {
    if (createLoading) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const submitCreateExpense = async () => {
    const trimmedTitle = createTitle.trim();
    const numericAmount = parseFloat(createAmount.replace(',', '.'));
    // Validation client → erreurs inline sous le champ fautif du modal.
    const nextErrors: FormErrors<'title' | 'amount'> = {};
    if (!trimmedTitle) {
      nextErrors.title = t('admin.treasury.expenses.validationTitleMessage');
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = t('admin.treasury.expenses.validationAmountMessage');
    }
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setCreateLoading(true);
    try {
      const res = await treasuryAPI.createExpense({
        title: trimmedTitle,
        amount: numericAmount,
        category: createCategory,
        description: createDescription.trim() || undefined,
        is_recurring: createIsRecurring,
      });
      const newExpense: Expense | undefined = res.data;
      if (newExpense?.id) {
        setExpenses(prev => [newExpense, ...prev]);
      } else {
        await fetchExpenses();
      }
      showSuccess(t('admin.treasury.expenses.createSuccess'), t('admin.treasury.expenses.createSuccessDetail'));
      setCreateOpen(false);
      resetCreateForm();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, {
        fallbackKey: 'admin.treasury.expenses.createError',
      });
      showError(t('common.error'), message);
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      // Filtres/pagination côté client → charger toutes les pages (pas juste 20).
      const data = await fetchAllPages((p) => treasuryAPI.getExpenses(p));
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
      toastSuccess(t('admin.treasury.expenses.approveSuccess'));
    } catch (error) {
      showError(t('common.error'), t('admin.treasury.expenses.approveError'));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await treasuryAPI.rejectExpense(id, t('admin.treasury.expenses.rejectReason'));
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected' as const } : e));
      toastSuccess(t('admin.treasury.expenses.rejectSuccess'));
    } catch (error) {
      showError(t('common.error'), t('admin.treasury.expenses.rejectError'));
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
            <Text style={[styles.actionText, { color: '#10B981' }]}>{t('admin.treasury.expenses.approve')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}
            onPress={() => handleReject(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('admin.treasury.expenses.reject')}</Text>
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
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.treasury.expenses.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.treasury.expenses.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={() => { setCreateErrors({}); setCreateOpen(true); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('admin.treasury.expenses.createNew')}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{totalPending.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('admin.treasury.expenses.summaryPending')}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: hairline }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{totalApproved.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('admin.treasury.expenses.summaryApproved')}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: hairline }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{expenses.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('admin.treasury.expenses.summaryTotal')}</Text>
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
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('admin.treasury.expenses.empty')}</Text>
          </View>
        }
      />

      {/* === CREATE EXPENSE MODAL === */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('admin.treasury.expenses.modal.eyebrow')}</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('admin.treasury.expenses.modal.title')}</Text>

              <Text style={[styles.fieldLabel, { color: colors.gray700 }]}>{t('admin.treasury.expenses.modal.fieldTitle')}</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.gray50, borderColor: hairline, color: colors.text },
                  createErrors.title && { borderColor: colors.error },
                ]}
                value={createTitle}
                onChangeText={(text) => {
                  setCreateTitle(text);
                  if (createErrors.title) setCreateErrors((e) => ({ ...e, title: undefined }));
                }}
                placeholder={t('admin.treasury.expenses.modal.fieldTitlePlaceholder')}
                placeholderTextColor={colors.gray400}
                editable={!createLoading}
                maxLength={120}
              />
              {createErrors.title && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{createErrors.title}</Text>
              )}

              <Text style={[styles.fieldLabel, { color: colors.gray700 }]}>{t('admin.treasury.expenses.modal.fieldAmount', { currency: platformCurrency })}</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.gray50, borderColor: hairline, color: colors.text },
                  createErrors.amount && { borderColor: colors.error },
                ]}
                value={createAmount}
                onChangeText={(text) => {
                  setCreateAmount(text);
                  if (createErrors.amount) setCreateErrors((e) => ({ ...e, amount: undefined }));
                }}
                placeholder="0"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
                editable={!createLoading}
              />
              {createErrors.amount && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{createErrors.amount}</Text>
              )}

              <Text style={[styles.fieldLabel, { color: colors.gray700 }]}>{t('admin.treasury.expenses.modal.fieldCategory')}</Text>
              <View style={styles.categoryGrid}>
                {EXPENSE_CATEGORIES.map(cat => {
                  const active = cat === createCategory;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? colors.primary : colors.gray50,
                          borderColor: active ? colors.primary : hairline,
                        },
                      ]}
                      onPress={() => !createLoading && setCreateCategory(cat)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.categoryChipText, { color: active ? '#fff' : colors.gray700 }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.gray700 }]}>{t('admin.treasury.expenses.modal.fieldDescription')}</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.gray50, borderColor: hairline, color: colors.text },
                ]}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder={t('admin.treasury.expenses.modal.fieldDescriptionPlaceholder')}
                placeholderTextColor={colors.gray400}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!createLoading}
                maxLength={500}
              />

              <TouchableOpacity
                style={styles.recurringRow}
                onPress={() => !createLoading && setCreateIsRecurring(v => !v)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: createIsRecurring ? colors.primary : 'transparent',
                      borderColor: createIsRecurring ? colors.primary : colors.gray300,
                    },
                  ]}
                >
                  {createIsRecurring && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  {t('admin.treasury.expenses.modal.recurring')}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.gray100 }]}
                  onPress={closeCreateModal}
                  disabled={createLoading}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: colors.gray700 }]}>{t('admin.treasury.expenses.modal.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }, createLoading && { opacity: 0.6 }]}
                  onPress={submitCreateExpense}
                  disabled={createLoading}
                  activeOpacity={0.85}
                >
                  {createLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('admin.treasury.expenses.modal.create')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // Create-expense modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  fieldError: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  textArea: {
    minHeight: 70,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
