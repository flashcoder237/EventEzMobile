import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { walletAPI, payoutsAPI } from '../../api/client';
import { OrganizerWallet, WalletTransaction, Payout, RootStackParamList } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
  Gradients,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WalletScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [wallet, setWallet] = useState<OrganizerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletRes, transactionsRes, payoutsRes] = await Promise.all([
        walletAPI.getWallet(),
        walletAPI.getTransactions({ page_size: 20 }),
        payoutsAPI.getPayouts({ status: 'pending' }),
      ]);

      setWallet(walletRes.data);
      setTransactions(transactionsRes.data.results || transactionsRes.data || []);
      setPendingPayouts(payoutsRes.data.results || payoutsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement données portefeuille:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRequestPayout = () => {
    if (!wallet?.can_withdraw) {
      Alert.alert(
        'Retrait impossible',
        `Le montant minimum pour effectuer un retrait est de ${formatPrice(wallet?.minimum_payout || 10000)} FCFA`
      );
      return;
    }
    navigation.navigate('PayoutRequest');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return 'arrow-down-circle';
      case 'debit':
        return 'arrow-up-circle';
      case 'fee':
        return 'remove-circle';
      case 'refund':
        return 'return-down-back';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return Colors.success;
      case 'debit':
      case 'fee':
        return Colors.error;
      case 'refund':
        return Colors.warning;
      default:
        return Colors.gray500;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Balance Card */}
        <LinearGradient colors={Gradients.primary} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>
            {formatPrice(wallet?.available_balance || 0)} <Text style={styles.balanceCurrency}>FCFA</Text>
          </Text>

          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>En attente</Text>
              <Text style={styles.balanceItemValue}>
                {formatPrice(wallet?.pending_balance || 0)} FCFA
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Total gagné</Text>
              <Text style={styles.balanceItemValue}>
                {formatPrice(wallet?.total_earnings || 0)} FCFA
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.withdrawButton,
              !wallet?.can_withdraw && styles.withdrawButtonDisabled,
            ]}
            onPress={handleRequestPayout}
            disabled={!wallet?.can_withdraw}
          >
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.withdrawButtonText}>Demander un retrait</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="trending-up" size={24} color={Colors.success} />
            </View>
            <Text style={styles.statValue}>{formatPrice(wallet?.total_earnings || 0)}</Text>
            <Text style={styles.statLabel}>Revenus totaux</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.errorLight }]}>
              <Ionicons name="trending-down" size={24} color={Colors.error} />
            </View>
            <Text style={styles.statValue}>{formatPrice(wallet?.total_withdrawn || 0)}</Text>
            <Text style={styles.statLabel}>Total retiré</Text>
          </View>
        </View>

        {/* Pending Payouts */}
        {pendingPayouts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retraits en cours</Text>
            {pendingPayouts.map((payout) => (
              <View key={payout.id} style={styles.payoutCard}>
                <View style={styles.payoutIcon}>
                  <Ionicons name="hourglass-outline" size={24} color={Colors.warning} />
                </View>
                <View style={styles.payoutContent}>
                  <Text style={styles.payoutAmount}>
                    {formatPrice(payout.amount)} FCFA
                  </Text>
                  <Text style={styles.payoutMethod}>
                    {payout.payout_method === 'mtn_money' ? 'MTN Money' :
                     payout.payout_method === 'orange_money' ? 'Orange Money' : 'Virement bancaire'}
                  </Text>
                </View>
                <View style={styles.payoutStatus}>
                  <Text style={styles.payoutStatusText}>En attente</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>Aucune transaction</Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: `${getTransactionColor(transaction.transaction_type)}20` },
                  ]}
                >
                  <Ionicons
                    name={getTransactionIcon(transaction.transaction_type) as any}
                    size={20}
                    color={getTransactionColor(transaction.transaction_type)}
                  />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionDescription} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                  {transaction.event_title && (
                    <Text style={styles.transactionEvent} numberOfLines={1}>
                      {transaction.event_title}
                    </Text>
                  )}
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(transaction.transaction_type) },
                  ]}
                >
                  {transaction.transaction_type === 'credit' ? '+' : '-'}
                  {formatPrice(transaction.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Bank Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de paiement</Text>
          <View style={styles.bankCard}>
            {wallet?.mobile_money_number ? (
              <>
                <View style={styles.bankRow}>
                  <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
                  <Text style={styles.bankLabel}>Mobile Money</Text>
                </View>
                <Text style={styles.bankValue}>
                  {wallet.mobile_money_provider} - {wallet.mobile_money_number}
                </Text>
              </>
            ) : wallet?.bank_account_number ? (
              <>
                <View style={styles.bankRow}>
                  <Ionicons name="business-outline" size={20} color={Colors.primary} />
                  <Text style={styles.bankLabel}>Compte bancaire</Text>
                </View>
                <Text style={styles.bankValue}>{wallet.bank_name}</Text>
                <Text style={styles.bankValue}>{wallet.bank_account_name}</Text>
                <Text style={styles.bankAccountNumber}>
                  **** **** {wallet.bank_account_number.slice(-4)}
                </Text>
              </>
            ) : (
              <View style={styles.noBankInfo}>
                <Ionicons name="alert-circle-outline" size={24} color={Colors.warning} />
                <Text style={styles.noBankText}>
                  Aucune information de paiement configurée
                </Text>
                <TouchableOpacity
                  style={styles.addBankButton}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <Text style={styles.addBankButtonText}>Configurer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  balanceCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  balanceCurrency: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
  },
  balanceDetails: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  balanceItemValue: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.md,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  withdrawButtonDisabled: {
    opacity: 0.6,
  },
  withdrawButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 4,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  payoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  payoutAmount: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  payoutMethod: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  payoutStatus: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  payoutStatusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.warning,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  transactionDescription: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  transactionEvent: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  bankCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bankLabel: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  bankValue: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 4,
  },
  bankAccountNumber: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
    marginTop: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noBankInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  noBankText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  addBankButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
  },
  addBankButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
});
