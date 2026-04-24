import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI } from '../../api';
import { Payment, RootStackParamList } from '../../types';
import { SkeletonList, PaymentCardSkeleton } from '../../components/ui/Skeleton';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { StaggeredItem } from '../../components/ui/Animations';
import Badge from '../../components/ui/Badge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'refunded';

interface PaymentWithEvent extends Payment {
  event_title?: string;
}

interface PaymentSection {
  title: string;
  data: PaymentWithEvent[];
}

const statusConfig: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { color: '#E0A800', label: 'En attente', icon: 'time' },
  processing: { color: '#3B82F6', label: 'En cours', icon: 'sync' },
  completed: { color: '#10B981', label: 'Complété', icon: 'checkmark-circle' },
  failed: { color: '#EF4444', label: 'Échoué', icon: 'close-circle' },
  refunded: { color: '#6366F1', label: 'Remboursé', icon: 'refresh-circle' },
  cancelled: { color: '#6B7280', label: 'Annulé', icon: 'ban' },
};

const methodConfig: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  mtn_money: { label: 'MTN Money', icon: 'phone-portrait', color: '#E0A800' },
  orange_money: { label: 'Orange Money', icon: 'phone-portrait', color: '#FF6600' },
  credit_card: { label: 'Carte bancaire', icon: 'card', color: '#3B82F6' },
  card: { label: 'Carte bancaire', icon: 'card', color: '#3B82F6' },
  bank_transfer: { label: 'Virement', icon: 'business', color: '#10B981' },
};

const getPaymentBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  switch (status) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'failed': return 'destructive';
    case 'refunded': return 'secondary';
    case 'cancelled': return 'secondary';
    default: return 'warning';
  }
};

export default function MyPaymentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [payments, setPayments] = useState<PaymentWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await paymentsAPI.getPayments();
      const data = response.data?.results || response.data || [];
      setPayments(data);
    } catch (error) {
      if (__DEV__) console.error('Error fetching payments:', error);
      showError('Erreur', 'Impossible de charger vos paiements');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => p.status === 'completed' ? sum + (Number(p.amount) || 0) : sum, 0);
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending' || p.status === 'processing').length;
    const failed = payments.filter(p => p.status === 'failed').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;

    const now = new Date();
    const thisMonthTotal = payments
      .filter(p => {
        const pDate = new Date(p.created_at);
        return p.status === 'completed' &&
          pDate.getMonth() === now.getMonth() &&
          pDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { total, completed, pending, failed, refunded, thisMonthTotal };
  }, [payments]);

  const sections = useMemo(() => {
    let result = [...payments];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter(p => p.status === 'pending' || p.status === 'processing');
      } else {
        result = result.filter(p => p.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => {
        const eventTitle = p.event_title || p.registration_details?.event_detail?.title || '';
        return eventTitle.toLowerCase().includes(query) ||
          p.transaction_id?.toLowerCase().includes(query) ||
          p.payment_method?.toLowerCase().includes(query);
      });
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const grouped: Record<string, PaymentWithEvent[]> = {};
    result.forEach(payment => {
      const date = new Date(payment.created_at);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const capitalizedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);

      if (!grouped[capitalizedKey]) grouped[capitalizedKey] = [];
      grouped[capitalizedKey].push(payment);
    });

    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [payments, statusFilter, searchQuery]);

  const formatAmount = (amount: number | string) => Number(amount).toLocaleString('fr-FR');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getEventTitle = (payment: PaymentWithEvent) =>
    payment.event_title || payment.registration_details?.event_detail?.title || 'Paiement';

  const getStatusConfig = (status: string) => statusConfig[status] || statusConfig.pending;

  const getMethodConfig = (method: string) => {
    const key = method?.toLowerCase().replace(/\s+/g, '_');
    return methodConfig[key] || { label: method || 'Paiement', icon: 'cash', color: colors.gray500 };
  };

  const renderSectionHeader = ({ section }: { section: PaymentSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>
        {section.title.toUpperCase()}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.gray500 }]}>
        {section.data.length} paiement{section.data.length > 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderPayment = ({ item, index }: { item: PaymentWithEvent; index: number }) => {
    const status = getStatusConfig(item.status || 'pending');
    const method = getMethodConfig(item.payment_method);
    const canRefund = item.status === 'completed';

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.paymentCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${getEventTitle(item)}, ${formatAmount(item.amount)} ${item.currency || 'XAF'}, ${status.label}`}
        >
          <View style={[styles.methodIcon, { backgroundColor: `${method.color}15` }]}>
            <Ionicons name={method.icon} size={20} color={method.color} />
          </View>

          <View style={styles.paymentContent}>
            <View style={styles.paymentHeader}>
              <Text style={[styles.paymentTitle, { color: colors.text }]} numberOfLines={1}>
                {getEventTitle(item)}
              </Text>
              <Badge
                label={status.label}
                variant={getPaymentBadgeVariant(item.status || 'pending')}
                size="sm"
              />
            </View>

            <View style={styles.paymentMeta}>
              <Text style={[styles.methodText, { color: colors.gray500 }]}>{method.label}</Text>
              <View style={[styles.metaDot, { backgroundColor: colors.gray300 }]} />
              <Text style={[styles.dateText, { color: colors.gray500 }]}>{formatDate(item.created_at)}</Text>
              {item.transaction_id && (
                <>
                  <View style={[styles.metaDot, { backgroundColor: colors.gray300 }]} />
                  <Text style={[styles.txnText, { color: colors.gray400 }]}>
                    #{item.transaction_id.slice(-6)}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.paymentFooter}>
              <View style={styles.amountContainer}>
                <Text style={[styles.amount, { color: colors.text }]}>{formatAmount(item.amount)}</Text>
                <Text style={[styles.currency, { color: colors.gray500 }]}>{item.currency || 'XAF'}</Text>
              </View>

              {canRefund && (
                <TouchableOpacity
                  style={[styles.refundButton, { backgroundColor: 'rgba(99,102,241,0.12)' }]}
                  onPress={() => navigation.navigate('RefundRequest', { paymentId: item.id })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-circle-outline" size={14} color="#6366F1" />
                  <Text style={styles.refundButtonText}>Remboursement</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="card-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun paiement</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || statusFilter !== 'all'
          ? 'Aucun paiement ne correspond à vos critères.'
          : "Vous n'avez pas encore effectué de paiement."}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: hairline }]}>
      <TouchableOpacity
        style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={[styles.headerEyebrow, { color: colors.accent }]}>HISTORIQUE</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes paiements</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {renderHeader()}
        <View style={{ padding: Spacing.lg }}>
          <SkeletonList count={6} Component={PaymentCardSkeleton} />
        </View>
      </SafeAreaView>
    );
  }

  const QuickStat = ({ filterKey, label, icon, color, value }: {
    filterKey: StatusFilter;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    value: number;
  }) => {
    const active = statusFilter === filterKey;
    return (
      <TouchableOpacity
        style={[
          styles.quickStatItem,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
          active && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
        ]}
        onPress={() => setStatusFilter(active ? 'all' : filterKey)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <View style={[styles.quickStatIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.quickStatValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.quickStatLabel, { color: colors.gray500 }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {renderHeader()}

      {/* Hero Stat */}
      <View
        style={[
          styles.mainStatsCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={styles.mainStatRow}>
          <View style={[styles.mainStatIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="wallet" size={24} color={colors.primary} />
          </View>
          <View style={styles.mainStatContent}>
            <Text style={[styles.mainStatEyebrow, { color: colors.gray500 }]}>TOTAL DÉPENSÉ</Text>
            <View style={styles.mainStatValueRow}>
              <Text style={[styles.mainStatValue, { color: colors.text }]}>
                {formatAmount(stats.total)}
              </Text>
              <Text style={[styles.mainStatCurrency, { color: colors.gray500 }]}>
                {platformCurrency}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.mainStatDivider, { backgroundColor: hairline }]} />
        <View style={styles.monthlyStatRow}>
          <Ionicons name="trending-up" size={14} color={colors.success} />
          <Text style={[styles.monthlyStatText, { color: colors.gray500 }]}>
            Ce mois: {formatAmount(stats.thisMonthTotal)} {platformCurrency}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <QuickStat filterKey="completed" label="Complétés" icon="checkmark-circle" color="#10B981" value={stats.completed} />
        <QuickStat filterKey="pending" label="Attente" icon="time" color="#E0A800" value={stats.pending} />
        <QuickStat filterKey="failed" label="Échoués" icon="close-circle" color="#EF4444" value={stats.failed} />
        <QuickStat filterKey="refunded" label="Rembours." icon="refresh-circle" color="#6366F1" value={stats.refunded} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <Ionicons name="search" size={16} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher par événement, transaction..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderPayment}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
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
  mainStatsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  mainStatRow: { flexDirection: 'row', alignItems: 'center' },
  mainStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mainStatContent: { flex: 1 },
  mainStatEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  mainStatValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  mainStatValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
  },
  mainStatCurrency: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  mainStatDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  monthlyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  monthlyStatText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  quickStatItem: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  quickStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickStatValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.md,
  },
  quickStatLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  sectionCount: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  paymentCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentContent: { flex: 1 },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentTitle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    marginRight: Spacing.sm,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  methodText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  dateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  txnText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  amount: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.md,
    letterSpacing: -0.3,
  },
  currency: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  refundButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: '#6366F1',
  },
  arrowContainer: { paddingLeft: Spacing.sm },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
