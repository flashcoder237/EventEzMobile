import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { getServiceFeeLabel } from '../../constants/payment';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { walletAPI, payoutsAPI } from '../../api';
import {
  OrganizerWallet,
  WalletTransaction,
  Payout,
  PendingEarning,
  RootStackParamList,
  PayoutMethod,
} from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';
import { StaggeredItem } from '../../components/ui/Animations';
import Badge from '../../components/ui/Badge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'overview' | 'transactions' | 'payouts' | 'pending';

const tabs: { key: TabType; label: string }[] = [
  { key: 'overview', label: 'Aperçu' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'payouts', label: 'Retraits' },
  { key: 'pending', label: 'En attente' },
];

const getPayoutBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  switch (status) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'failed': return 'destructive';
    case 'cancelled': return 'secondary';
    default: return 'warning';
  }
};

export default function WalletScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showAlert, showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { config: commissionConfig } = useCommissionConfig();
  const [wallet, setWallet] = useState<OrganizerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingEarnings, setPendingEarnings] = useState<PendingEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Payout modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('mtn_money');
  const [processingPayout, setProcessingPayout] = useState(false);

  // Bank modal states
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    mobile_money_number: '',
    mobile_money_provider: '',
  });
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletRes, transactionsRes, payoutsRes, pendingRes] = await Promise.all([
        walletAPI.getMyWallet(),
        walletAPI.getTransactions({ limit: 50 }),
        payoutsAPI.getPayouts(),
        walletAPI.getPendingEarnings(),
      ]);

      const walletData = walletRes.data;
      setWallet(walletData);
      setTransactions(transactionsRes.data?.results || transactionsRes.data || []);
      setPayouts(payoutsRes.data?.results || payoutsRes.data || []);
      setPendingEarnings(pendingRes.data?.results || pendingRes.data || []);

      // Pre-fill bank details
      if (walletData) {
        setBankDetails({
          bank_name: walletData.bank_name || '',
          bank_account_name: walletData.bank_account_name || '',
          bank_account_number: walletData.bank_account_number || '',
          mobile_money_number: walletData.mobile_money_number || '',
          mobile_money_provider: walletData.mobile_money_provider || '',
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement données portefeuille:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      showError('Erreur', 'Montant invalide');
      return;
    }

    if (!wallet) return;

    const amount = parseFloat(payoutAmount);
    if (amount > wallet.available_balance) {
      showError('Erreur', 'Solde insuffisant');
      return;
    }

    if (amount < wallet.minimum_payout) {
      showError('Erreur', `Le montant minimum est de ${formatPrice(wallet.minimum_payout)} {wallet?.currency || 'FCFA'}`);
      return;
    }

    setProcessingPayout(true);
    try {
      await payoutsAPI.requestPayout({
        amount,
        payout_method: payoutMethod,
      });
      showSuccess('Succès', 'Demande de retrait envoyée');
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchData();
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Erreur lors de la demande');
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    setSavingBank(true);
    try {
      await walletAPI.updateBankDetails(bankDetails);
      showSuccess('Succès', 'Informations mises à jour');
      setShowBankModal(false);
      fetchData();
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSavingBank(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const getTransactionIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'credit':
        return 'arrow-down-circle';
      case 'debit':
        return 'arrow-up-circle';
      case 'fee':
        return 'receipt';
      case 'refund':
        return 'refresh-circle';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return '#10B981';
      case 'debit':
        return '#EF4444';
      case 'fee':
        return '#F59E0B';
      case 'refund':
        return '#3B82F6';
      default:
        return colors.gray500;
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

  const getPayoutStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string }> = {
      pending: { color: '#F59E0B', bgColor: '#FEF3C7', label: 'En attente' },
      processing: { color: '#3B82F6', bgColor: '#DBEAFE', label: 'En cours' },
      completed: { color: '#10B981', bgColor: '#D1FAE5', label: 'Effectué' },
      failed: { color: '#EF4444', bgColor: '#FEE2E2', label: 'Échoué' },
      cancelled: { color: '#6B7280', bgColor: '#F3F4F6', label: 'Annulé' },
    };
    return configs[status] || configs.pending;
  };

  const renderTransactionItem = (transaction: WalletTransaction, index: number) => (
    <StaggeredItem key={transaction.id} index={index}>
    <View style={[styles.transactionCard, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: `${getTransactionColor(transaction.transaction_type)}20` },
        ]}
      >
        <Ionicons
          name={getTransactionIcon(transaction.transaction_type)}
          size={20}
          color={getTransactionColor(transaction.transaction_type)}
        />
      </View>
      <View style={styles.transactionContent}>
        <Text style={[styles.transactionDescription, { color: colors.gray900 }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        {transaction.event_title && (
          <Text style={[styles.transactionEvent, { color: colors.gray500 }]} numberOfLines={1}>
            {transaction.event_title}
          </Text>
        )}
        <Text style={[styles.transactionDate, { color: colors.gray400 }]}>
          {formatDate(transaction.created_at)}
        </Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text
          style={[
            styles.transactionAmount,
            { color: getTransactionColor(transaction.transaction_type) },
          ]}
        >
          {transaction.transaction_type === 'credit' ? '+' : '-'}
          {formatPrice(Math.abs(transaction.amount))}
        </Text>
        <Text style={[styles.transactionBalance, { color: colors.gray400 }]}>
          Solde: {formatPrice(transaction.balance_after)}
        </Text>
      </View>
    </View>
    </StaggeredItem>
  );

  const renderPayoutItem = (payout: Payout, index: number) => {
    const statusConfig = getPayoutStatusConfig(payout.status);
    return (
      <StaggeredItem key={payout.id} index={index}>
      <View style={[styles.payoutCard, { backgroundColor: colors.card }]}>
        <View style={[styles.payoutIcon, {
          backgroundColor: payout.payout_method === 'bank_transfer' ? '#DBEAFE' : '#FED7AA'
        }]}>
          <Ionicons
            name={payout.payout_method === 'bank_transfer' ? 'business' : 'phone-portrait'}
            size={20}
            color={payout.payout_method === 'bank_transfer' ? '#3B82F6' : '#F97316'}
          />
        </View>
        <View style={styles.payoutContent}>
          <Text style={[styles.payoutAmount, { color: colors.gray900 }]}>
            {formatPrice(payout.amount)} {wallet?.currency || 'FCFA'}
          </Text>
          <Text style={[styles.payoutMethod, { color: colors.gray600 }]}>
            {payout.payout_method === 'mtn_money' ? 'MTN Mobile Money' :
             payout.payout_method === 'orange_money' ? 'Orange Money' : 'Virement bancaire'}
          </Text>
          <Text style={[styles.payoutDestination, { color: colors.gray400 }]}>
            {payout.destination_account} - {payout.destination_name}
          </Text>
        </View>
        <View style={styles.payoutRight}>
          <Badge
            label={statusConfig.label}
            variant={getPayoutBadgeVariant(payout.status)}
            size="sm"
          />
          <Text style={[styles.payoutDate, { color: colors.gray400 }]}>{formatDate(payout.requested_at)}</Text>
          {payout.failure_reason && (
            <Text style={styles.failureReason} numberOfLines={1}>
              {payout.failure_reason}
            </Text>
          )}
        </View>
      </View>
      </StaggeredItem>
    );
  };

  const renderPendingItem = (earning: PendingEarning, index: number) => (
    <StaggeredItem key={earning.id} index={index}>
    <View style={[styles.pendingCard, { backgroundColor: colors.card }]}>
      <View style={styles.pendingIcon}>
        <Ionicons name="time" size={20} color="#F59E0B" />
      </View>
      <View style={styles.pendingContent}>
        <Text style={styles.pendingTitle} numberOfLines={1}>
          {earning.event_title}
        </Text>
        <Text style={styles.pendingRelease}>
          Libération: {formatDate(earning.release_date)}
        </Text>
      </View>
      <View style={styles.pendingRight}>
        <Text style={styles.pendingAmount}>
          {formatPrice(earning.amount)} {wallet?.currency || 'FCFA'}
        </Text>
        <Text style={styles.pendingDays}>
          {earning.days_until_release > 0
            ? `Dans ${earning.days_until_release} jour${earning.days_until_release > 1 ? 's' : ''}`
            : 'Bientôt disponible'
          }
        </Text>
      </View>
    </View>
    </StaggeredItem>
  );

  if (loading) {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LoadingSpinner />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header with gradient */}
          <LinearGradient
        colors={['#4F46E5', '#6366F1', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Portefeuille</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowBankModal(true)}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Balance Display */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>
            {formatPrice(wallet?.available_balance || 0)}
            <Text style={styles.balanceCurrency}> {wallet?.currency || 'FCFA'}</Text>
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.quickStatLabel}>En attente</Text>
            <Text style={styles.quickStatValue}>{formatPrice(wallet?.pending_balance || 0)}</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.quickStatLabel}>Total gagné</Text>
            <Text style={styles.quickStatValue}>{formatPrice(wallet?.total_earnings || 0)}</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.quickStatLabel}>Retiré</Text>
            <Text style={styles.quickStatValue}>{formatPrice(wallet?.total_withdrawn || 0)}</Text>
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[styles.withdrawButton, { backgroundColor: colors.card }, !wallet?.can_withdraw && styles.withdrawButtonDisabled]}
          onPress={() => wallet?.can_withdraw ? setShowPayoutModal(true) : showAlert(
            'Retrait impossible',
            `Le montant minimum pour effectuer un retrait est de ${formatPrice(wallet?.minimum_payout || 10000)} {wallet?.currency || 'FCFA'}`,
            undefined,
            'warning'
          )}
        >
          <Ionicons name="arrow-up-circle" size={20} color={wallet?.can_withdraw ? colors.primary : colors.gray400} />
          <Text style={[styles.withdrawButtonText, !wallet?.can_withdraw && { color: colors.gray400 }]}>
            Demander un retrait
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Commission Info */}
      <View style={styles.commissionInfo}>
        <Ionicons name="information-circle" size={18} color="#F59E0B" />
        <Text style={styles.commissionText}>
          Commission EventEz: {getServiceFeeLabel(commissionConfig)} par vente. Fonds libérés 48h après l'événement.
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsList}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {activeTab === 'overview' && (
          <>
            {/* Recent Transactions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transactions récentes</Text>
                <TouchableOpacity onPress={() => setActiveTab('transactions')}>
                  <Text style={styles.seeAll}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              {transactions.slice(0, 5).length > 0 ? (
                transactions.slice(0, 5).map(renderTransactionItem)
              ) : (
                <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
                  <Ionicons name="receipt-outline" size={40} color={colors.gray300} />
                  <Text style={styles.emptyText}>Aucune transaction</Text>
                </View>
              )}
            </View>

            {/* Recent Payouts */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Derniers retraits</Text>
                <TouchableOpacity onPress={() => setActiveTab('payouts')}>
                  <Text style={styles.seeAll}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              {payouts.slice(0, 3).length > 0 ? (
                payouts.slice(0, 3).map(renderPayoutItem)
              ) : (
                <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
                  <Ionicons name="arrow-up-circle-outline" size={40} color={colors.gray300} />
                  <Text style={styles.emptyText}>Aucun retrait</Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.section}>
            {transactions.length > 0 ? (
              transactions.map(renderTransactionItem)
            ) : (
              <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
                <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
                <Text style={styles.emptyText}>Aucune transaction</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'payouts' && (
          <View style={styles.section}>
            {payouts.length > 0 ? (
              payouts.map(renderPayoutItem)
            ) : (
              <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
                <Ionicons name="arrow-up-circle-outline" size={48} color={colors.gray300} />
                <Text style={styles.emptyText}>Aucun retrait effectué</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'pending' && (
          <View style={styles.section}>
            {pendingEarnings.length > 0 ? (
              pendingEarnings.map(renderPendingItem)
            ) : (
              <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
                <Ionicons name="time-outline" size={48} color={colors.gray300} />
                <Text style={styles.emptyText}>Aucun revenu en attente</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Payout Modal */}
      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demande de retrait</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Solde disponible: {formatPrice(wallet?.available_balance || 0)} {wallet?.currency || 'FCFA'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Montant ({wallet?.currency || 'FCFA'})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="numeric"
                placeholder={`Min: ${formatPrice(wallet?.minimum_payout || 5000)}`}
                placeholderTextColor={colors.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Méthode de retrait</Text>
              <View style={styles.methodsRow}>
                {[
                  { value: 'mtn_money' as PayoutMethod, label: 'MTN', icon: 'phone-portrait', color: '#FBBF24' },
                  { value: 'orange_money' as PayoutMethod, label: 'Orange', icon: 'phone-portrait', color: '#F97316' },
                  { value: 'bank_transfer' as PayoutMethod, label: 'Banque', icon: 'business', color: '#3B82F6' },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.methodButton,
                      payoutMethod === method.value && styles.methodButtonActive,
                    ]}
                    onPress={() => setPayoutMethod(method.value)}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={20}
                      color={payoutMethod === method.value ? colors.primary : colors.gray400}
                    />
                    <Text style={[
                      styles.methodText,
                      payoutMethod === method.value && styles.methodTextActive,
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {payoutMethod !== 'bank_transfer' && !wallet?.mobile_money_number && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Configurez d'abord votre numéro Mobile Money
                </Text>
              </View>
            )}

            {payoutMethod === 'bank_transfer' && !wallet?.bank_account_number && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Configurez d'abord vos informations bancaires
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPayoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, (!payoutAmount || processingPayout) && styles.confirmButtonDisabled]}
                onPress={handleRequestPayout}
                disabled={!payoutAmount || processingPayout}
              >
                {processingPayout ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle" size={18} color={Colors.white} />
                    <Text style={styles.confirmButtonText}>Retirer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bank Details Modal */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBankModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.bankModalScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Informations de paiement</Text>
                <TouchableOpacity onPress={() => setShowBankModal(false)}>
                  <Ionicons name="close" size={24} color={colors.gray500} />
                </TouchableOpacity>
              </View>

              {/* Mobile Money Section */}
              <View style={styles.bankSection}>
                <View style={styles.bankSectionHeader}>
                  <Ionicons name="phone-portrait" size={18} color={colors.primary} />
                  <Text style={styles.bankSectionTitle}>Mobile Money</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Numéro</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                    value={bankDetails.mobile_money_number}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, mobile_money_number: text })}
                    placeholder="Ex: 6XX XXX XXX"
                    placeholderTextColor={colors.gray400}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Opérateur</Text>
                  <View style={styles.pickerRow}>
                    {[
                      { value: 'mtn_money', label: 'MTN Mobile Money' },
                      { value: 'orange_money', label: 'Orange Money' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          bankDetails.mobile_money_provider === option.value && styles.pickerOptionActive,
                        ]}
                        onPress={() => setBankDetails({ ...bankDetails, mobile_money_provider: option.value })}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          bankDetails.mobile_money_provider === option.value && styles.pickerOptionTextActive,
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Bank Account Section */}
              <View style={styles.bankSection}>
                <View style={styles.bankSectionHeader}>
                  <Ionicons name="business" size={18} color={colors.primary} />
                  <Text style={styles.bankSectionTitle}>Compte bancaire</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom de la banque</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                    value={bankDetails.bank_name}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_name: text })}
                    placeholder="Ex: Afriland First Bank"
                    placeholderTextColor={colors.gray400}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Titulaire du compte</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                    value={bankDetails.bank_account_name}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_account_name: text })}
                    placeholder="Nom complet"
                    placeholderTextColor={colors.gray400}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Numéro de compte</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                    value={bankDetails.bank_account_number}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_account_number: text })}
                    placeholder="IBAN ou numéro de compte"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowBankModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, savingBank && styles.confirmButtonDisabled]}
                  onPress={handleUpdateBankDetails}
                  disabled={savingBank}
                >
                  {savingBank ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#4F46E5',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontFamily: FontFamily.displayBold,
    fontSize: 36,
    color: Colors.white,
  },
  balanceCurrency: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.medium,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickStatLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  quickStatValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.sm,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  withdrawButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  withdrawButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#4F46E5',
  },
  commissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  commissionText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: '#92400E',
  },
  tabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tabsList: {
    paddingHorizontal: Spacing.md,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
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
    fontFamily: FontFamily.medium,
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
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  transactionBalance: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  payoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  payoutAmount: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  payoutMethod: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },
  payoutDestination: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 4,
  },
  failureReason: {
    fontSize: FontSizes.xs,
    color: '#EF4444',
    marginTop: 2,
    maxWidth: 100,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  pendingTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  pendingRelease: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  pendingRight: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: '#F59E0B',
  },
  pendingDays: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
  },
  bankModalScroll: {
    flex: 1,
    marginTop: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    gap: Spacing.xs,
  },
  methodButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F3E8FF',
  },
  methodText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  methodTextActive: {
    color: Colors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEF3C7',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#92400E',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  bankSection: {
    marginBottom: Spacing.lg,
  },
  bankSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bankSectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.lg,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  pickerOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F3E8FF',
  },
  pickerOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
});
