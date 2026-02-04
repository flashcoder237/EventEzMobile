import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI } from '../../api/client';
import { Payment, RootStackParamList } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'refunded';

interface PaymentWithEvent extends Payment {
  event_title?: string;
  registration_details?: {
    event_detail?: {
      title?: string;
    };
  };
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { color: Colors.warning, bg: Colors.warningLight, label: 'En attente', icon: 'time' },
  processing: { color: '#3B82F6', bg: '#DBEAFE', label: 'En cours', icon: 'sync' },
  completed: { color: Colors.success, bg: Colors.successLight, label: 'Complété', icon: 'checkmark-circle' },
  failed: { color: Colors.error, bg: Colors.errorLight, label: 'Échoué', icon: 'close-circle' },
  refunded: { color: '#8B5CF6', bg: '#EDE9FE', label: 'Remboursé', icon: 'refresh-circle' },
  cancelled: { color: Colors.gray500, bg: Colors.gray100, label: 'Annulé', icon: 'ban' },
};

const methodConfig: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  mtn_money: { label: 'MTN Money', icon: 'phone-portrait', color: '#FFCC00' },
  orange_money: { label: 'Orange Money', icon: 'phone-portrait', color: '#FF6600' },
  credit_card: { label: 'Carte bancaire', icon: 'card', color: '#3B82F6' },
  card: { label: 'Carte bancaire', icon: 'card', color: '#3B82F6' },
  bank_transfer: { label: 'Virement', icon: 'business', color: '#10B981' },
};

export default function MyPaymentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useAlert();

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
    return { total, completed, pending, failed };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
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

    // Sort by date (most recent first)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [payments, statusFilter, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number | string) => {
    return Number(amount).toLocaleString('fr-FR');
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
    return methodConfig[key] || { label: method, icon: 'cash', color: Colors.gray500 };
  };

  const canRequestRefund = (payment: PaymentWithEvent) => {
    return payment.status === 'completed';
  };

  const renderPayment = ({ item }: { item: PaymentWithEvent }) => {
    const status = getStatusConfig(item.status || 'pending');
    const method = getMethodConfig(item.payment_method);
    const canRefund = canRequestRefund(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          // Could navigate to payment details
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
            <Ionicons name={method.icon} size={20} color={method.color} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {getEventTitle(item)}
            </Text>
            <Text style={styles.cardSubtitle}>{method.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.gray400} />
              <Text style={styles.infoText}>{formatDate(item.created_at)}</Text>
            </View>
            {item.transaction_id && (
              <View style={styles.infoRow}>
                <Ionicons name="receipt-outline" size={14} color={Colors.gray400} />
                <Text style={styles.infoText}>#{item.transaction_id.slice(-8)}</Text>
              </View>
            )}
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
            <Text style={styles.currency}>{item.currency || 'XAF'}</Text>
          </View>
        </View>

        {canRefund && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.refundButton}
              onPress={() => navigation.navigate('RefundRequest', { paymentId: item.id })}
            >
              <Ionicons name="refresh-circle-outline" size={16} color="#8B5CF6" />
              <Text style={styles.refundButtonText}>Demander un remboursement</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="card-outline" size={48} color={Colors.gray300} />
      </View>
      <Text style={styles.emptyTitle}>Aucun paiement</Text>
      <Text style={styles.emptyText}>
        {searchQuery || statusFilter !== 'all'
          ? 'Aucun paiement ne correspond à vos critères.'
          : 'Vous n\'avez pas encore effectué de paiement.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mes Paiements</Text>
          <Text style={styles.headerSubtitle}>Gérez et suivez vos paiements</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatAmount(stats.total)}</Text>
          <Text style={styles.statLabel}>Total XAF</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.statValue}>{stats.completed}</Text>
          </View>
          <Text style={styles.statLabel}>Complétés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="time" size={14} color={Colors.warning} />
            <Text style={styles.statValue}>{stats.pending}</Text>
          </View>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par événement, transaction..."
            placeholderTextColor={Colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'completed', 'pending', 'failed', 'refunded'] as StatusFilter[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive
            ]}>
              {status === 'all' ? 'Tous' :
               status === 'completed' ? 'Complétés' :
               status === 'pending' ? 'En attente' :
               status === 'failed' ? 'Échoués' : 'Remboursés'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results info */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {filteredPayments.length} paiement{filteredPayments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Payments List */}
      <FlatList
        data={filteredPayments}
        renderItem={renderPayment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />
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
    backgroundColor: '#7C3AED',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
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
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    paddingVertical: 0,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  filterChipTextActive: {
    color: Colors.white,
  },

  // Results
  resultsInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  resultsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  cardSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  cardInfo: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  currency: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#EDE9FE',
  },
  refundButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: '#8B5CF6',
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
    ...TextStyles.h4,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.gray500,
    textAlign: 'center',
  },
});
