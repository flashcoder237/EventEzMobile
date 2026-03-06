import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI } from '../../api/client';
import { Payment, RootStackParamList } from '../../types';
import { SkeletonList, PaymentCardSkeleton } from '../../components/ui/Skeleton';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
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

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'En attente', icon: 'time' },
  processing: { color: '#3B82F6', bg: '#DBEAFE', label: 'En cours', icon: 'sync' },
  completed: { color: '#10B981', bg: '#D1FAE5', label: 'Complete', icon: 'checkmark-circle' },
  failed: { color: '#EF4444', bg: '#FEE2E2', label: 'Echoue', icon: 'close-circle' },
  refunded: { color: '#8B5CF6', bg: '#EDE9FE', label: 'Rembourse', icon: 'refresh-circle' },
  cancelled: { color: '#6B7280', bg: '#F3F4F6', label: 'Annule', icon: 'ban' },
};

const methodConfig: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  mtn_money: { label: 'MTN Money', icon: 'phone-portrait', color: '#FFCC00' },
  orange_money: { label: 'Orange Money', icon: 'phone-portrait', color: '#FF6600' },
  credit_card: { label: 'Carte bancaire', icon: 'card', color: '#3B82F6' },
  card: { label: 'Carte bancaire', icon: 'card', color: '#3B82F6' },
  bank_transfer: { label: 'Virement', icon: 'business', color: '#10B981' },
};

const FILTER_TABS: { key: StatusFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tous', icon: 'grid-outline' },
  { key: 'completed', label: 'Completes', icon: 'checkmark-circle-outline' },
  { key: 'pending', label: 'En attente', icon: 'time-outline' },
  { key: 'failed', label: 'Echoues', icon: 'close-circle-outline' },
  { key: 'refunded', label: 'Rembourses', icon: 'refresh-circle-outline' },
];

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
      console.error('Error fetching payments:', error);
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

  // Stats
  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => p.status === 'completed' ? sum + (Number(p.amount) || 0) : sum, 0);
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending' || p.status === 'processing').length;
    const failed = payments.filter(p => p.status === 'failed').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;

    // This month total
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

  // Filtered and grouped payments
  const sections = useMemo(() => {
    let result = [...payments];

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter(p => p.status === 'pending' || p.status === 'processing');
      } else {
        result = result.filter(p => p.status === statusFilter);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => {
        const eventTitle = p.event_title || p.registration_details?.event_detail?.title || '';
        return eventTitle.toLowerCase().includes(query) ||
          p.transaction_id?.toLowerCase().includes(query) ||
          p.payment_method?.toLowerCase().includes(query);
      });
    }

    // Sort by date
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Group by month
    const grouped: Record<string, PaymentWithEvent[]> = {};
    result.forEach(payment => {
      const date = new Date(payment.created_at);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const capitalizedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);

      if (!grouped[capitalizedKey]) {
        grouped[capitalizedKey] = [];
      }
      grouped[capitalizedKey].push(payment);
    });

    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [payments, statusFilter, searchQuery]);

  const formatAmount = (amount: number | string) => {
    return Number(amount).toLocaleString('fr-FR');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getEventTitle = (payment: PaymentWithEvent) => {
    return payment.event_title ||
      payment.registration_details?.event_detail?.title ||
      'Paiement';
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const getMethodConfig = (method: string) => {
    const key = method?.toLowerCase().replace(/\s+/g, '_');
    return methodConfig[key] || { label: method || 'Paiement', icon: 'cash', color: colors.gray500 };
  };

  const renderSectionHeader = ({ section }: { section: PaymentSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{section.title}</Text>
      <Text style={[styles.sectionCount, { color: colors.gray500 }]}>{section.data.length} paiement{section.data.length > 1 ? 's' : ''}</Text>
    </View>
  );

  const renderPayment = ({ item, index }: { item: PaymentWithEvent; index: number }) => {
    const status = getStatusConfig(item.status || 'pending');
    const method = getMethodConfig(item.payment_method);
    const canRefund = item.status === 'completed';

    return (
      <StaggeredItem index={index}>
      <TouchableOpacity
        style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
        onPress={() => {
          // Navigate to payment details if needed
        }}
        activeOpacity={0.7}
      >
        {/* Method Icon */}
        <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
          <Ionicons name={method.icon} size={20} color={method.color} />
        </View>

        {/* Content */}
        <View style={styles.paymentContent}>
          <View style={styles.paymentHeader}>
            <Text style={[styles.paymentTitle, { color: colors.gray900 }]} numberOfLines={1}>{getEventTitle(item)}</Text>
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
                <Text style={[styles.txnText, { color: colors.gray400 }]}>#{item.transaction_id.slice(-6)}</Text>
              </>
            )}
          </View>

          <View style={styles.paymentFooter}>
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: colors.gray900 }]}>{formatAmount(item.amount)}</Text>
              <Text style={[styles.currency, { color: colors.gray500 }]}>{item.currency || 'XAF'}</Text>
            </View>

            {canRefund && (
              <TouchableOpacity
                style={[styles.refundButton, { backgroundColor: isDark ? colors.card : '#EDE9FE' }]}
                onPress={() => navigation.navigate('RefundRequest', { paymentId: item.id })}
              >
                <Ionicons name="refresh-circle-outline" size={16} color="#8B5CF6" />
                <Text style={styles.refundButtonText}>Remboursement</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
        </View>
      </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="card-outline" size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Aucun paiement</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || statusFilter !== 'all'
          ? 'Aucun paiement ne correspond a vos criteres.'
          : 'Vous n\'avez pas encore effectue de paiement.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={{ padding: 16 }}>
          <SkeletonList count={6} Component={PaymentCardSkeleton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Mes Paiements</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Stats Card */}
      <View style={[styles.mainStatsCard, { backgroundColor: colors.card }]}>
        <View style={styles.mainStatRow}>
          <View style={[styles.mainStatIcon, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="wallet" size={28} color={colors.primary} />
          </View>
          <View style={styles.mainStatContent}>
            <Text style={[styles.mainStatLabel, { color: colors.gray500 }]}>Total depense</Text>
            <View style={styles.mainStatValueRow}>
              <Text style={[styles.mainStatValue, { color: colors.gray900 }]}>{formatAmount(stats.total)}</Text>
              <Text style={[styles.mainStatCurrency, { color: colors.gray500 }]}>{platformCurrency}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.mainStatDivider, { backgroundColor: colors.gray100 }]} />
        <View style={styles.monthlyStatRow}>
          <Ionicons name="trending-up" size={16} color={colors.success} />
          <Text style={[styles.monthlyStatText, { color: colors.gray600 }]}>Ce mois: {formatAmount(stats.thisMonthTotal)} {platformCurrency}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <TouchableOpacity
          style={[styles.quickStatItem, { backgroundColor: colors.card, borderColor: colors.gray100 }, statusFilter === 'completed' && [styles.quickStatItemActive, { borderColor: colors.primary, backgroundColor: colors.primaryBg }]]}
          onPress={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
        >
          <View style={[styles.quickStatIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          </View>
          <Text style={[styles.quickStatValue, { color: colors.gray900 }]}>{stats.completed}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.gray500 }]}>Completes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickStatItem, { backgroundColor: colors.card, borderColor: colors.gray100 }, statusFilter === 'pending' && [styles.quickStatItemActive, { borderColor: colors.primary, backgroundColor: colors.primaryBg }]]}
          onPress={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <View style={[styles.quickStatIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={16} color="#F59E0B" />
          </View>
          <Text style={[styles.quickStatValue, { color: colors.gray900 }]}>{stats.pending}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.gray500 }]}>En attente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickStatItem, { backgroundColor: colors.card, borderColor: colors.gray100 }, statusFilter === 'failed' && [styles.quickStatItemActive, { borderColor: colors.primary, backgroundColor: colors.primaryBg }]]}
          onPress={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
        >
          <View style={[styles.quickStatIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
          </View>
          <Text style={[styles.quickStatValue, { color: colors.gray900 }]}>{stats.failed}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.gray500 }]}>Echoues</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickStatItem, { backgroundColor: colors.card, borderColor: colors.gray100 }, statusFilter === 'refunded' && [styles.quickStatItemActive, { borderColor: colors.primary, backgroundColor: colors.primaryBg }]]}
          onPress={() => setStatusFilter(statusFilter === 'refunded' ? 'all' : 'refunded')}
        >
          <View style={[styles.quickStatIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="refresh-circle" size={16} color="#8B5CF6" />
          </View>
          <Text style={[styles.quickStatValue, { color: colors.gray900 }]}>{stats.refunded}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.gray500 }]}>Rembourses</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          <Ionicons name="search" size={18} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.gray900 }]}
            placeholder="Rechercher par evenement, transaction..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Filter Indicator */}
      {statusFilter !== 'all' && (
        <View style={[styles.filterIndicator, { backgroundColor: colors.primaryBg }]}>
          <Text style={[styles.filterIndicatorText, { color: colors.primary }]}>
            Filtre: {FILTER_TABS.find(t => t.key === statusFilter)?.label}
          </Text>
          <TouchableOpacity onPress={() => setStatusFilter('all')}>
            <Ionicons name="close" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsInfo}>
        <Text style={[styles.resultsText, { color: colors.gray500 }]}>
          {sections.reduce((sum, s) => sum + s.data.length, 0)} paiement{sections.reduce((sum, s) => sum + s.data.length, 0) !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Payments List */}
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TextStyles.h4,
  },

  // Main Stats Card
  mainStatsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  mainStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mainStatContent: {
    flex: 1,
  },
  mainStatLabel: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginBottom: 2,
  },
  mainStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  mainStatValue: {
    fontSize: FontSizes['3xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  mainStatCurrency: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  mainStatDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Spacing.md,
  },
  monthlyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  monthlyStatText: {
    ...TextStyles.label,
    color: Colors.gray600,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  quickStatItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  quickStatLabel: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing.sm,
  },
  searchInput: {
    ...TextStyles.small,
    flex: 1,
    color: Colors.gray900,
    paddingVertical: 0,
  },

  // Filter Indicator
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
  },
  filterIndicatorText: {
    ...TextStyles.label,
    color: Colors.primary,
  },

  // Results
  resultsInfo: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  resultsText: {
    ...TextStyles.small,
    color: Colors.gray500,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  sectionCount: {
    ...TextStyles.caption,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },

  // Payment Card
  paymentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    alignItems: 'center',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentContent: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentTitle: {
    ...TextStyles.smallBold,
    flex: 1,
    color: Colors.gray900,
    marginRight: Spacing.sm,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  methodText: {
    ...TextStyles.caption,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.gray300,
    marginHorizontal: 6,
  },
  dateText: {
    ...TextStyles.caption,
  },
  txnText: {
    ...TextStyles.caption,
    color: Colors.gray400,
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
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  currency: {
    ...TextStyles.caption,
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: '#EDE9FE',
  },
  refundButtonText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: '#8B5CF6',
  },
  arrowContainer: {
    paddingLeft: Spacing.sm,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.gray500,
    textAlign: 'center',
  },
});
