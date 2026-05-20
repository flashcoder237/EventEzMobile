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
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { getServiceFeeLabel } from '../../constants/payment';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { WalletScreenSkeleton } from '../../components/ui/Skeleton';
import {
  TourTarget,
  useTour,
  getWalletTourSteps,
  WALLET_TOUR_STORAGE_KEY,
  WALLET_TOUR_DELAY_MS,
} from '../../components/tour';
import { walletAPI, payoutsAPI } from '../../api';
import { useSupportedCountries } from '../../hooks/useSupportedCountries';
import StripeOnboardingBanner from '../../components/organizer/StripeOnboardingBanner';
import {
  OrganizerWallet,
  WalletTransaction,
  Payout,
  PendingEarning,
  RootStackParamList,
} from '../../types';
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
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import ExportButton from '../../components/common/ExportButton';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'overview' | 'transactions' | 'payouts' | 'pending';

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
  const { t } = useTranslation();
  const { showAlert, showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const tabs: { key: TabType; label: string }[] = React.useMemo(() => ([
    { key: 'overview', label: t('organizer.wallet.tabOverview') },
    { key: 'transactions', label: t('organizer.wallet.tabTransactions') },
    { key: 'payouts', label: t('organizer.wallet.tabPayouts') },
    { key: 'pending', label: t('organizer.wallet.tabPending') },
  ]), [t]);
  const { config: commissionConfig } = useCommissionConfig();
  const { countries: supportedCountries } = useSupportedCountries();
  // Codes ISO des pays servis par Stripe uniquement (pas NotchPay/CinetPay).
  // Sert au composant StripeOnboardingBanner pour decider d'afficher
  // ou non le CTA d'onboarding.
  const stripeCountryCodes = React.useMemo(
    () => supportedCountries.filter((c) => c.provider === 'stripe').map((c) => c.code),
    [supportedCountries],
  );
  const biometric = useBiometricConfirm();
  const [wallet, setWallet] = useState<OrganizerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingEarnings, setPendingEarnings] = useState<PendingEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Wallet tour fires once wallet data has loaded — the 3 targets all live
  // inside the overview tab so we also gate on `activeTab === 'overview'`.
  const tour = useTour();
  useEffect(() => {
    if (loading || !wallet || activeTab !== 'overview') return;
    const timer = setTimeout(() => {
      if (tour.isActive) return;
      tour.start(getWalletTourSteps(t), { seenKey: WALLET_TOUR_STORAGE_KEY });
    }, WALLET_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, !!wallet, activeTab]);

  // Payout modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<string>('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<Array<{
    id: string;
    name: string;
    channel: string;
    type: string;
  }>>([]);

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

        try {
          // Pass walletData.country explicitly — the backend falls back to
          // wallet.country if no query param is given, but being explicit
          // here guarantees the right operator list even if the wallet
          // country was set after creation (e.g. organizer moved countries)
          // or if the wallet doesn't exist yet.
          const methodsRes = await payoutsAPI.getAvailableMethods(walletData?.country);
          const methods = (methodsRes.data?.methods || []).filter(
            (m: any) => m.type === 'mobile_money' || m.type === 'bank_transfer'
          );
          setAvailableMethods(methods);
          if (methods.length && !payoutMethod) {
            const firstMM = methods.find((m: any) => m.type === 'mobile_money');
            setPayoutMethod(firstMM?.id || methods[0].id);
          }
        } catch (err) {
          if (__DEV__) console.error('Erreur chargement méthodes:', err);
          showError(
            t('organizer.wallet.methodsErrorTitle'),
            t('organizer.wallet.methodsErrorMessage')
          );
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement données portefeuille:', error);
      showError(
        t('organizer.wallet.loadErrorTitle'),
        t('organizer.wallet.loadError')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelPayout = async (payout: Payout) => {
    showAlert(
      t('organizer.wallet.cancelPayoutTitle'),
      t('organizer.wallet.cancelPayoutMessage', { amount: formatPrice(payout.amount), currency: wallet?.currency || 'XAF' }),
      [
        { text: t('organizer.wallet.keepRequest'), style: 'cancel' },
        {
          text: t('organizer.wallet.cancelPayout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await payoutsAPI.cancelPayout(payout.id);
              showSuccess(t('organizer.wallet.cancelSuccess'), t('organizer.wallet.cancelSuccessMessage'));
              fetchData();
            } catch (error: any) {
              showError(
                t('organizer.wallet.cancelImpossibleTitle'),
                error.response?.data?.detail || t('organizer.wallet.cancelImpossibleMessage')
              );
            }
          },
        },
      ],
      'warning'
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      showError(t('common.error'), t('organizer.wallet.invalidAmount'));
      return;
    }

    if (!wallet) return;

    const amount = parseFloat(payoutAmount);
    if (amount > wallet.available_balance) {
      showError(t('common.error'), t('organizer.wallet.insufficientBalance'));
      return;
    }

    if (amount < wallet.minimum_payout) {
      showError(t('common.error'), t('organizer.wallet.minPayout', { amount: formatPrice(wallet.minimum_payout), currency: wallet?.currency || 'XAF' }));
      return;
    }

    // Confirmation biométrique avant d'envoyer la demande de retrait — pattern
    // standard banking. Catégorie 'payments' : si l'user a désactivé cette
    // catégorie dans Settings, le hook renvoie true sans prompter.
    const confirmed = await biometric.confirm({
      promptMessage: t('organizer.wallet.biometricPayoutPrompt', { amount: formatPrice(amount), currency: wallet?.currency || 'XAF' }),
      category: 'payments',
    });
    if (!confirmed) {
      // L'user a annulé ou la biométrique a échoué — pas d'alerte rouge,
      // juste on ne soumet pas. Le modal reste ouvert pour qu'il puisse
      // réessayer ou modifier le montant.
      return;
    }

    setProcessingPayout(true);
    try {
      await payoutsAPI.requestPayout({
        amount,
        payout_method: payoutMethod,
      });
      showSuccess(t('common.success'), t('organizer.wallet.payoutSuccess'));
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchData();
    } catch (error: any) {
      showError(t('common.error'), error.response?.data?.detail || t('organizer.wallet.payoutError'));
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    // Coordonnées bancaires = données sensibles : un attaquant qui aurait
    // brièvement accès au téléphone pourrait sinon rediriger les futurs
    // payouts vers son propre compte. Catégorie 'payments'.
    const confirmed = await biometric.confirm({
      promptMessage: t('organizer.wallet.biometricBankPrompt'),
      category: 'payments',
    });
    if (!confirmed) return;

    setSavingBank(true);
    try {
      // Seuls les champs bancaires sont modifiables. mobile_money_number /
      // mobile_money_provider sont verrouillés côté backend (figés au téléphone
      // du compte) — les envoyer ne ferait que les voir ignorés silencieusement.
      await walletAPI.updateBankDetails({
        bank_name: bankDetails.bank_name,
        bank_account_name: bankDetails.bank_account_name,
        bank_account_number: bankDetails.bank_account_number,
      });
      showSuccess(t('common.success'), t('organizer.wallet.bankSuccess'));
      setShowBankModal(false);
      fetchData();
    } catch (error: any) {
      showError(t('common.error'), error.response?.data?.detail || t('organizer.wallet.bankError'));
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

  const getPayoutStatusConfig = React.useCallback((status: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string }> = {
      pending: { color: '#F59E0B', bgColor: '#FEF3C7', label: t('organizer.wallet.payoutStatusPending') },
      processing: { color: '#3B82F6', bgColor: '#DBEAFE', label: t('organizer.wallet.payoutStatusProcessing') },
      completed: { color: '#10B981', bgColor: '#D1FAE5', label: t('organizer.wallet.payoutStatusCompleted') },
      failed: { color: '#EF4444', bgColor: '#FEE2E2', label: t('organizer.wallet.payoutStatusFailed') },
      cancelled: { color: '#6B7280', bgColor: '#F3F4F6', label: t('organizer.wallet.payoutStatusCancelled') },
    };
    return configs[status] || configs.pending;
  }, [t]);

  const renderTransactionItem = (transaction: WalletTransaction, index: number) => {
    const txnColor = getTransactionColor(transaction.transaction_type);
    const isCredit = transaction.transaction_type === 'credit';
    const date = new Date(transaction.created_at);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
    const txnEyebrow = transaction.transaction_type === 'credit' ? t('organizer.wallet.txnCredit') :
                       transaction.transaction_type === 'debit' ? t('organizer.wallet.txnDebit') :
                       transaction.transaction_type === 'fee' ? t('organizer.wallet.txnFee') :
                       transaction.transaction_type === 'refund' ? t('organizer.wallet.txnRefund') : t('organizer.wallet.txnDefault');
    return (
      <StaggeredItem key={transaction.id} index={index}>
        <View style={[styles.txnCard, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.sm]}>
          {/* Day tile */}
          <View style={[styles.txnDayTile, { backgroundColor: `${txnColor}12` }]}>
            <Text style={[styles.txnDayNumber, { color: txnColor }]}>{day}</Text>
            <Text style={[styles.txnDayMonth, { color: txnColor }]}>{month}</Text>
          </View>

          <View style={styles.txnBody}>
            <View style={styles.txnTopRow}>
              <View style={[styles.txnEyebrowPill, { backgroundColor: `${txnColor}15` }]}>
                <Ionicons name={getTransactionIcon(transaction.transaction_type)} size={9} color={txnColor} />
                <Text style={[styles.txnEyebrowText, { color: txnColor }]}>{txnEyebrow}</Text>
              </View>
              <Text style={[styles.txnBalance, { color: colors.gray400 }]}>
                {t('organizer.wallet.balanceLabel', { amount: formatPrice(transaction.balance_after) })}
              </Text>
            </View>
            <Text style={[styles.txnTitle, { color: colors.text }]} numberOfLines={1}>
              {transaction.description}
            </Text>
            {transaction.event_title && (
              <Text style={[styles.txnSub, { color: colors.gray500 }]} numberOfLines={1}>
                {transaction.event_title}
              </Text>
            )}
          </View>

          <View style={styles.txnAmountCol}>
            <Text style={[styles.txnSign, { color: isCredit ? '#10B981' : colors.gray400 }]}>
              {isCredit ? '+' : '−'}
            </Text>
            <Text style={[styles.txnAmount, { color: colors.text }]}>
              {formatPrice(Math.abs(transaction.amount))}
            </Text>
            <Text style={[styles.txnCurrency, { color: colors.gray500 }]}>
              {wallet?.currency || 'XAF'}
            </Text>
          </View>
        </View>
      </StaggeredItem>
    );
  };

  const renderPayoutItem = (payout: Payout, index: number) => {
    const statusCfg = getPayoutStatusConfig(payout.status);
    const isBank = payout.payout_method === 'bank_transfer';
    const methodColor = isBank ? '#3B82F6' : '#F97316';
    const methodMeta = availableMethods.find((m: any) => m.id === payout.payout_method);
    const methodLabel = methodMeta?.name || (
      payout.payout_method === 'mtn_money' ? t('organizer.wallet.methodMtn') :
      payout.payout_method === 'orange_money' ? t('organizer.wallet.methodOrange') :
      payout.payout_method === 'wave' ? t('organizer.wallet.methodWave') :
      payout.payout_method === 'mpesa' ? t('organizer.wallet.methodMpesa') :
      payout.payout_method === 'airtel_money' ? t('organizer.wallet.methodAirtel') :
      payout.payout_method === 'bank_transfer' ? t('organizer.wallet.methodBank') :
      payout.payout_method
    );
    const methodMark = isBank ? 'BANK' : (methodMeta?.name?.split(' ')[0]?.toUpperCase() || payout.payout_method.split('_')[0].toUpperCase()).slice(0, 6);
    const canCancel = payout.status === 'pending';
    const statusEyebrow = payout.status === 'completed' ? t('organizer.wallet.payoutStatusCompleted') :
                          payout.status === 'pending' ? t('organizer.wallet.payoutStatusPending') :
                          payout.status === 'processing' ? t('organizer.wallet.payoutStatusProcessing') :
                          payout.status === 'failed' ? t('organizer.wallet.payoutStatusFailed') : t('organizer.wallet.payoutStatusCancelled');
    return (
      <StaggeredItem key={payout.id} index={index}>
        <View style={[styles.payoutCardE, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.sm]}>
          {/* Top row: status pill + method mark + amount */}
          <View style={styles.payoutTopRow}>
            <View style={[styles.payoutStatusPill, { backgroundColor: `${statusCfg.color}15` }]}>
              <View style={[styles.payoutStatusDot, { backgroundColor: statusCfg.color }]} />
              <Text style={[styles.payoutStatusText, { color: statusCfg.color }]}>{statusEyebrow}</Text>
            </View>
            <Text style={[styles.methodMark, { color: colors.gray400 }]}>{methodMark}</Text>
          </View>

          {/* Amount hero */}
          <View style={styles.payoutAmountRow}>
            <Text style={[styles.payoutAmountValue, { color: colors.text }]}>
              {formatPrice(payout.amount)}
            </Text>
            <Text style={[styles.payoutAmountCurrency, { color: colors.gray500 }]}>
              {wallet?.currency || 'XAF'}
            </Text>
          </View>

          {/* Method row */}
          <View style={[styles.payoutMethodRow, { borderTopColor: softBorder }]}>
            <View style={[styles.payoutMethodIcon, { backgroundColor: `${methodColor}15` }]}>
              <Ionicons
                name={isBank ? 'business' : 'phone-portrait'}
                size={14}
                color={methodColor}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payoutMethodLabel, { color: colors.text }]}>{methodLabel}</Text>
              <Text style={[styles.payoutMethodDest, { color: colors.gray500 }]} numberOfLines={1}>
                {payout.destination_account} • {payout.destination_name}
              </Text>
            </View>
            <Text style={[styles.payoutDateE, { color: colors.gray400 }]}>{formatDate(payout.requested_at)}</Text>
          </View>

          {payout.failure_reason && (
            <View style={[styles.payoutFailure, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Ionicons name="warning" size={11} color="#EF4444" />
              <Text style={styles.payoutFailureText} numberOfLines={2}>{payout.failure_reason}</Text>
            </View>
          )}

          {canCancel && (
            <TouchableOpacity
              style={[styles.payoutCancelBtn, { borderColor: softBorder }]}
              onPress={() => handleCancelPayout(payout)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.wallet.payoutCancelA11y')}
            >
              <Ionicons name="close-circle-outline" size={13} color={colors.gray600} />
              <Text style={[styles.payoutCancelText, { color: colors.gray700 }]}>{t('organizer.wallet.payoutCancelBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </StaggeredItem>
    );
  };

  const renderPendingItem = (earning: PendingEarning, index: number) => {
    const days = earning.days_until_release;
    const releaseDate = new Date(earning.release_date);
    const day = String(releaseDate.getDate()).padStart(2, '0');
    const month = releaseDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
    return (
      <StaggeredItem key={earning.id} index={index}>
        <View style={[styles.pendingCardE, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.sm]}>
          {/* Date tile (release date) */}
          <View style={[styles.pendingDateTile, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.pendingDateDay, { color: '#D97706' }]}>{day}</Text>
            <Text style={[styles.pendingDateMonth, { color: '#D97706' }]}>{month}</Text>
          </View>

          <View style={styles.pendingBodyE}>
            <View style={styles.pendingTopRow}>
              <View style={[styles.pendingPill, { backgroundColor: '#FEF3C7' }]}>
                <View style={[styles.pendingPillDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.pendingPillText, { color: '#D97706' }]}>{t('organizer.wallet.pendingStatus')}</Text>
              </View>
              <Text style={[styles.pendingDays, { color: days > 0 ? colors.gray500 : '#10B981' }]}>
                {days > 0 ? t('organizer.wallet.pendingDays', { count: days }) : t('organizer.wallet.pendingSoon')}
              </Text>
            </View>
            <Text style={[styles.pendingTitleE, { color: colors.text }]} numberOfLines={1}>
              {earning.event_title}
            </Text>
            <Text style={[styles.pendingReleaseE, { color: colors.gray500 }]}>
              {t('organizer.wallet.release', { date: formatDate(earning.release_date) })}
            </Text>
          </View>

          <View style={styles.pendingAmountColE}>
            <Text style={[styles.pendingAmountE, { color: colors.text }]}>
              {formatPrice(earning.amount)}
            </Text>
            <Text style={[styles.pendingCurrencyE, { color: colors.gray500 }]}>
              {wallet?.currency || 'XAF'}
            </Text>
          </View>
        </View>
      </StaggeredItem>
    );
  };

  const softBorder = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const canvasBg = isDark ? colors.background : '#F4F3F0';

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>{wallet?.currency || 'XAF'}</WatermarkNumeral>
        <WalletScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>{wallet?.currency || 'XAF'}</WatermarkNumeral>
      <View style={{ flex: 1 }}>
        {/* === EDITORIAL HEADER (tile) === */}
        <View
          style={[
            styles.softHeader,
            {
              backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
              borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
              borderBottomWidth: 1,
            },
          ]}
        >
          <View style={styles.softHeaderRow}>
            <TouchableOpacity
              style={[styles.iconDisc, { backgroundColor: colors.gray100, borderWidth: 0 }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={colors.gray600} />
            </TouchableOpacity>
            <View style={styles.softHeaderTitleCol}>
              <Text style={[styles.softHeaderEyebrow, { color: colors.accent, textAlign: 'left' }]}>
                {t('organizer.wallet.headerEyebrow')}
              </Text>
              <Text style={[styles.softHeaderTitle, { color: colors.text, textAlign: 'left' }]}>{t('organizer.wallet.headerTitle')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.iconDisc, { backgroundColor: colors.gray100, borderWidth: 0 }]}
              onPress={() => setShowBankModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[4]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
        {/* === BLACK CARD HERO (premium credit-card vibe) === */}
        <TourTarget id="wallet-balance">
        <View style={styles.creditCardWrap}>
          <View style={[styles.creditCard, Shadows.lg]}>
            <LinearGradient
              colors={['#0F172A', '#1E1B4B', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Hologram circles */}
            <View style={styles.cardCircle1} />
            <View style={styles.cardCircle2} />
            <View style={styles.cardCircle3} />

            {/* Embossed currency mark */}
            <Text style={styles.cardCurrencyMark}>{wallet?.currency || 'XAF'}</Text>

            <View style={styles.creditCardTopRow}>
              <Text style={styles.creditCardEyebrow}>{t('organizer.wallet.walletPremium')}</Text>
              <View style={styles.creditCardLiveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.creditCardLiveText}>{t('organizer.wallet.live')}</Text>
              </View>
            </View>

            <View style={styles.creditCardBody}>
              <Text style={styles.creditCardCaption}>{t('organizer.wallet.fundsAvailable')}</Text>
              <Text style={styles.creditCardBalance} numberOfLines={1} adjustsFontSizeToFit>
                {formatPrice(wallet?.available_balance || 0)}
              </Text>
              {/* Card number-like dots for deco */}
              <View style={styles.cardDotsRow}>
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
                <Text style={styles.cardLastDigits}>{(wallet?.id || 'XXXX').slice(-4).toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>
        </TourTarget>

        {/* === PRIMARY CTA: PILL WITHDRAW === */}
        <TourTarget id="wallet-withdraw">
        <View style={styles.withdrawWrap}>
          <TouchableOpacity
            style={[
              styles.withdrawPill,
              !wallet?.can_withdraw && { opacity: 0.55 },
              Shadows.buttonPrimary,
            ]}
            onPress={() => wallet?.can_withdraw ? setShowPayoutModal(true) : showAlert(
              t('organizer.wallet.payoutImpossibleTitle'),
              t('organizer.wallet.payoutImpossibleMessage', { amount: formatPrice(wallet?.minimum_payout || 10000), currency: wallet?.currency || 'XAF' }),
              undefined,
              'warning'
            )}
            disabled={!wallet?.can_withdraw}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.withdrawContent}>
              <Text style={styles.withdrawEyebrow}>{t('organizer.wallet.withdrawEyebrow')}</Text>
              <Text style={styles.withdrawLabel}>{t('organizer.wallet.withdrawLabel')}</Text>
            </View>
            <View style={styles.withdrawArrow}>
              <Ionicons name="arrow-up" size={20} color={Colors.white} />
            </View>
          </TouchableOpacity>
        </View>
        </TourTarget>

        {/* === STAT STRIP (mini) === */}
        <View style={[styles.miniStatRow, { backgroundColor: colors.card, borderColor: softBorder }]}>
          <View style={[styles.miniStatCell, { borderRightColor: softBorder }]}>
            <Text style={[styles.miniStatNumber, { color: colors.text }]} numberOfLines={1}>
              {formatPrice(wallet?.pending_balance || 0)}
            </Text>
            <Text style={[styles.miniStatEyebrow, { color: colors.gray500 }]}>{t('organizer.wallet.miniStatPending')}</Text>
          </View>
          <View style={[styles.miniStatCell, { borderRightColor: softBorder }]}>
            <View style={styles.miniStatRowInner}>
              <Text style={[styles.miniStatNumber, { color: colors.text }]} numberOfLines={1}>
                {formatPrice(wallet?.total_earnings || 0)}
              </Text>
              <Ionicons name="trending-up" size={11} color="#10B981" style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.miniStatEyebrow, { color: colors.gray500 }]}>{t('organizer.wallet.miniStatEarned')}</Text>
          </View>
          <View style={styles.miniStatCellLast}>
            <Text style={[styles.miniStatNumber, { color: colors.text }]} numberOfLines={1}>
              {formatPrice(wallet?.total_withdrawn || 0)}
            </Text>
            <Text style={[styles.miniStatEyebrow, { color: colors.gray500 }]}>{t('organizer.wallet.miniStatWithdrawn')}</Text>
          </View>
        </View>

      {/* === COMMISSION CALLOUT === */}
      <View style={[styles.commissionCallout, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
        <View style={[styles.commissionIcon, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="information" size={12} color={Colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.commissionEyebrow}>{t('organizer.wallet.policyEyebrow')}</Text>
          <Text style={styles.commissionTextE}>
            {t('organizer.wallet.policyText', { fee: getServiceFeeLabel(commissionConfig) })}
          </Text>
        </View>
      </View>

      {/* === TAB SEGMENTED CONTROL (sticky) === */}
      <View style={[styles.tabsStickyWrap, { backgroundColor: canvasBg }]}>
        <View style={[styles.tabsBar, { backgroundColor: colors.gray100 }]}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabSeg,
                  active && { backgroundColor: colors.card, ...Shadows.xs },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.tabSegText,
                    { color: active ? colors.text : colors.gray500 },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentWrap}>
        {activeTab === 'overview' && (
          <>
            {/* Phase 2 — Stripe Connect onboarding (Stripe-only countries). */}
            <View style={{ paddingHorizontal: 16 }}>
              <StripeOnboardingBanner
                country={wallet?.country}
                stripeAccountId={wallet?.stripe_account_id}
                onboardingComplete={wallet?.stripe_onboarding_complete}
                payoutsEnabled={wallet?.stripe_payouts_enabled}
                stripeCountries={stripeCountryCodes}
                onComplete={fetchData}
              />
            </View>

            <TourTarget id="wallet-transactions">
            <View style={styles.section}>
              <View style={styles.sectionHeaderE}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.sectionRecentEyebrow')}</Text>
                  <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('organizer.wallet.sectionRecentTitle')}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('transactions')} style={[styles.seeAllPill, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.seeAllPillText, { color: colors.gray700 }]}>{t('organizer.wallet.seeAll')}</Text>
                  <Ionicons name="arrow-forward" size={11} color={colors.gray700} />
                </TouchableOpacity>
              </View>
              {transactions.slice(0, 5).length > 0 ? (
                transactions.slice(0, 5).map(renderTransactionItem)
              ) : (
                <View style={[styles.emptySectionE, { backgroundColor: colors.card, borderColor: softBorder }]}>
                  <Ionicons name="receipt-outline" size={36} color={colors.gray300} />
                  <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('organizer.wallet.emptyLedgerEyebrow')}</Text>
                  <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>{t('organizer.wallet.emptyLedgerText')}</Text>
                </View>
              )}
            </View>
            </TourTarget>

            <View style={styles.section}>
              <View style={styles.sectionHeaderE}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.sectionPayoutsEyebrow')}</Text>
                  <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('organizer.wallet.sectionPayoutsTitle')}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('payouts')} style={[styles.seeAllPill, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.seeAllPillText, { color: colors.gray700 }]}>{t('organizer.wallet.seeAll')}</Text>
                  <Ionicons name="arrow-forward" size={11} color={colors.gray700} />
                </TouchableOpacity>
              </View>
              {payouts.slice(0, 3).length > 0 ? (
                payouts.slice(0, 3).map(renderPayoutItem)
              ) : (
                <View style={[styles.emptySectionE, { backgroundColor: colors.card, borderColor: softBorder }]}>
                  <Ionicons name="arrow-up-circle-outline" size={36} color={colors.gray300} />
                  <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('organizer.wallet.emptyPayoutsEyebrow')}</Text>
                  <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>{t('organizer.wallet.emptyPayoutsText')}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderE}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.tabAllEyebrow')}</Text>
                <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('organizer.wallet.txnsCount', { count: transactions.length })}</Text>
              </View>
              {transactions.length > 0 && (
                <ExportButton
                  endpoint="/wallet/transactions/export/"
                  filename="transactions_wallet"
                />
              )}
            </View>
            {transactions.length > 0 ? (
              transactions.map(renderTransactionItem)
            ) : (
              <View style={[styles.emptySectionE, { backgroundColor: colors.card, borderColor: softBorder }]}>
                <Ionicons name="receipt-outline" size={36} color={colors.gray300} />
                <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('organizer.wallet.emptyLedgerEyebrow')}</Text>
                <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>{t('organizer.wallet.emptyLedgerText')}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'payouts' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderE}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.tabPayoutsEyebrow')}</Text>
                <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('organizer.wallet.payoutsCount', { count: payouts.length })}</Text>
              </View>
            </View>
            {payouts.length > 0 ? (
              payouts.map(renderPayoutItem)
            ) : (
              <View style={[styles.emptySectionE, { backgroundColor: colors.card, borderColor: softBorder }]}>
                <Ionicons name="arrow-up-circle-outline" size={36} color={colors.gray300} />
                <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('organizer.wallet.emptyPayoutsEyebrow')}</Text>
                <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>{t('organizer.wallet.emptyPayoutsText')}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'pending' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderE}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.tabPendingEyebrow')}</Text>
                <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('organizer.wallet.pendingCount', { count: pendingEarnings.length })}</Text>
              </View>
            </View>
            {pendingEarnings.length > 0 ? (
              pendingEarnings.map(renderPendingItem)
            ) : (
              <View style={[styles.emptySectionE, { backgroundColor: colors.card, borderColor: softBorder }]}>
                <Ionicons name="time-outline" size={36} color={colors.gray300} />
                <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('organizer.wallet.emptyPendingEyebrow')}</Text>
                <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>{t('organizer.wallet.emptyPendingText')}</Text>
              </View>
            )}
          </View>
        )}
      </View>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.dramatic]}>
            <View style={styles.modalHeaderE}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('organizer.wallet.modalPayoutEyebrow')}</Text>
                <Text style={[styles.modalTitleE, { color: colors.text }]}>{t('organizer.wallet.modalPayoutTitle')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPayoutModal(false)}
                style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* Available balance pill */}
            <View style={[styles.balancePill, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <Ionicons name="wallet" size={14} color={colors.primary} />
              <Text style={[styles.balancePillLabel, { color: colors.primary }]}>{t('organizer.wallet.balanceAvailable')}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[styles.balancePillValue, { color: colors.text }]}>
                {formatPrice(wallet?.available_balance || 0)} {wallet?.currency || 'XAF'}
              </Text>
            </View>

            <View style={styles.inputGroupE}>
              <Text style={[styles.inputLabelE, { color: colors.gray600 }]}>{t('organizer.wallet.amountLabel', { currency: wallet?.currency || 'XAF' })}</Text>
              <TextInput
                style={[
                  styles.inputE,
                  {
                    backgroundColor: colors.gray100,
                    borderColor: softBorder,
                    color: colors.text,
                  },
                ]}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="numeric"
                placeholder={t('organizer.wallet.amountMinPlaceholder', { amount: formatPrice(wallet?.minimum_payout || 5000) })}
                placeholderTextColor={colors.gray400}
              />
            </View>

            <View style={styles.inputGroupE}>
              <Text style={[styles.inputLabelE, { color: colors.gray600 }]}>{t('organizer.wallet.methodLabel')}</Text>
              <View style={styles.methodsRowE}>
                {availableMethods.length === 0 ? (
                  <Text style={{ color: colors.gray500, fontSize: 13, fontFamily: FontFamily.regular }}>
                    {t('organizer.wallet.noMethodsAvailable')}
                  </Text>
                ) : (
                  availableMethods.map((method: any) => {
                    const isActive = payoutMethod === method.id;
                    const iconName = method.type === 'bank_transfer' ? 'business' : 'phone-portrait';
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.methodChip,
                          isActive
                            ? { backgroundColor: colors.primary, borderColor: colors.primary, ...Shadows.buttonPrimary }
                            : { backgroundColor: colors.card, borderColor: softBorder },
                        ]}
                        onPress={() => setPayoutMethod(method.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={14}
                          color={isActive ? Colors.white : colors.gray600}
                        />
                        <Text style={[
                          styles.methodChipText,
                          { color: isActive ? Colors.white : colors.gray700 },
                        ]}>
                          {method.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>

            {payoutMethod !== 'bank_transfer' && !wallet?.mobile_money_number && (
              <TouchableOpacity
                style={[styles.warningBoxE, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                onPress={() => {
                  setShowPayoutModal(false);
                  setShowBankModal(true);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="warning" size={14} color="#D97706" />
                <Text style={styles.warningTextE}>
                  {t('organizer.wallet.configMomoFirst')}
                </Text>
              </TouchableOpacity>
            )}

            {payoutMethod === 'bank_transfer' && !wallet?.bank_account_number && (
              <TouchableOpacity
                style={[styles.warningBoxE, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                onPress={() => {
                  setShowPayoutModal(false);
                  setShowBankModal(true);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="warning" size={14} color="#D97706" />
                <Text style={styles.warningTextE}>
                  {t('organizer.wallet.configBankFirst')}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActionsE}>
              <TouchableOpacity
                style={[styles.modalCancelE, { backgroundColor: colors.gray100 }]}
                onPress={() => setShowPayoutModal(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalCancelTextE, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              {(() => {
                const destinationMissing =
                  payoutMethod === 'bank_transfer'
                    ? !wallet?.bank_account_number
                    : !wallet?.mobile_money_number;
                const confirmDisabled = !payoutAmount || processingPayout || destinationMissing;
                return (
              <TouchableOpacity
                style={[
                  styles.modalConfirmE,
                  confirmDisabled && { opacity: 0.5 },
                  Shadows.buttonPrimary,
                ]}
                onPress={handleRequestPayout}
                disabled={confirmDisabled}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {processingPayout ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.modalConfirmTextE}>{t('organizer.wallet.withdraw')}</Text>
                    <View style={styles.modalConfirmArrow}>
                      <Ionicons name="arrow-up" size={14} color={Colors.white} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
                );
              })()}
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
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.dramatic]}>
              <View style={styles.modalHeaderE}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('organizer.wallet.modalBankEyebrow')}</Text>
                  <Text style={[styles.modalTitleE, { color: colors.text }]}>{t('organizer.wallet.modalBankTitle')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBankModal(false)}
                  style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              {/* Mobile Money Section — numéro VERROUILLÉ : il est figé au
                  téléphone du compte côté backend (WalletBankDetailsSerializer
                  l'ignore en écriture). On l'affiche en lecture seule plutôt
                  qu'en champ éditable qui ferait croire à un enregistrement
                  silencieusement rejeté. S'il est vide, on guide l'organisateur
                  vers son profil où le numéro de téléphone alimente ce champ. */}
              <View style={styles.bankSectionE}>
                <View style={[styles.bankSectionHeaderE, { borderBottomColor: softBorder }]}>
                  <View style={[styles.bankSectionIcon, { backgroundColor: '#FF660015' }]}>
                    <Ionicons name="phone-portrait" size={14} color="#FF6600" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bankSectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.section01')}</Text>
                    <Text style={[styles.bankSectionTitleE, { color: colors.text }]}>{t('organizer.wallet.mobileMoney')}</Text>
                  </View>
                </View>

                {wallet?.mobile_money_number ? (
                  <View style={styles.inputGroupE}>
                    <Text style={[styles.inputLabelE, { color: colors.gray600 }]}>{t('organizer.wallet.phoneLabel')}</Text>
                    <View style={[styles.mmLockedRow, { backgroundColor: colors.gray100, borderColor: softBorder }]}>
                      <Text style={[styles.mmLockedValue, { color: colors.text }]}>{wallet.mobile_money_number}</Text>
                      <Ionicons name="lock-closed" size={14} color={colors.gray400} />
                    </View>
                    <Text style={[styles.mmLockedHint, { color: colors.gray500 }]}>
                      {t('organizer.wallet.mobileMoneyLockedHint')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.mmEmptyCard, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '26' }]}>
                    <Text style={[styles.mmEmptyText, { color: colors.gray600 }]}>
                      {t('organizer.wallet.mobileMoneyEmptyHint')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.mmEmptyBtn, { backgroundColor: colors.primary }]}
                      onPress={() => { setShowBankModal(false); navigation.navigate('EditProfile'); }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="person-outline" size={14} color={Colors.white} />
                      <Text style={styles.mmEmptyBtnText}>{t('organizer.wallet.mobileMoneyEmptyCta')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={[styles.dividerE, { backgroundColor: softBorder }]} />

              {/* Bank Account Section */}
              <View style={styles.bankSectionE}>
                <View style={[styles.bankSectionHeaderE, { borderBottomColor: softBorder }]}>
                  <View style={[styles.bankSectionIcon, { backgroundColor: '#3B82F615' }]}>
                    <Ionicons name="business" size={14} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bankSectionEyebrow, { color: colors.accent }]}>{t('organizer.wallet.section02')}</Text>
                    <Text style={[styles.bankSectionTitleE, { color: colors.text }]}>{t('organizer.wallet.bankAccount')}</Text>
                  </View>
                </View>

                <View style={styles.inputGroupE}>
                  <Text style={[styles.inputLabelE, { color: colors.gray600 }]}>{t('organizer.wallet.bankNameLabel')}</Text>
                  <TextInput
                    style={[
                      styles.inputE,
                      { backgroundColor: colors.gray100, borderColor: softBorder, color: colors.text },
                    ]}
                    value={bankDetails.bank_name}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_name: text })}
                    placeholder={t('organizer.wallet.bankNamePlaceholder')}
                    placeholderTextColor={colors.gray400}
                  />
                </View>

                <View style={styles.inputGroupE}>
                  <Text style={[styles.inputLabelE, { color: colors.gray600 }]}>{t('organizer.wallet.accountHolderLabel')}</Text>
                  <TextInput
                    style={[
                      styles.inputE,
                      { backgroundColor: colors.gray100, borderColor: softBorder, color: colors.text },
                    ]}
                    value={bankDetails.bank_account_name}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_account_name: text })}
                    placeholder={t('organizer.wallet.accountHolderPlaceholder')}
                    placeholderTextColor={colors.gray400}
                  />
                </View>

                <View style={styles.inputGroupE}>
                  <Text style={[styles.inputLabelE, { color: colors.gray600 }]}>{t('organizer.wallet.accountNumberLabel')}</Text>
                  <TextInput
                    style={[
                      styles.inputE,
                      { backgroundColor: colors.gray100, borderColor: softBorder, color: colors.text },
                    ]}
                    value={bankDetails.bank_account_number}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_account_number: text })}
                    placeholder={t('organizer.wallet.accountNumberPlaceholder')}
                    placeholderTextColor={colors.gray400}
                  />
                </View>
              </View>

              <View style={styles.modalActionsE}>
                <TouchableOpacity
                  style={[styles.modalCancelE, { backgroundColor: colors.gray100 }]}
                  onPress={() => setShowBankModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalCancelTextE, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmE, savingBank && { opacity: 0.5 }, Shadows.buttonPrimary]}
                  onPress={handleUpdateBankDetails}
                  disabled={savingBank}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {savingBank ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.modalConfirmTextE}>{t('organizer.wallet.save')}</Text>
                      <View style={styles.modalConfirmArrow}>
                        <Ionicons name="checkmark" size={14} color={Colors.white} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
          </Modal>
      </View>
    </EditorialCanvas>
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

  // Soft header
  softHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  softHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softHeaderTitleCol: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  softHeaderEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  softHeaderTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.2,
  },

  // === BLACK CARD HERO ===
  creditCardWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  creditCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 220,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,107,107,0.18)',
  },
  cardCircle3: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(190,255,90,0.06)',
  },
  cardCurrencyMark: {
    position: 'absolute',
    bottom: 16,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 60,
    letterSpacing: -3,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 60,
  },
  creditCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditCardEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
  },
  creditCardLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BEFF5A',
  },
  creditCardLiveText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    color: '#FFFFFF',
  },
  creditCardBody: {
    justifyContent: 'flex-end',
  },
  creditCardCaption: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  creditCardBalance: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -2,
    color: '#FFFFFF',
  },
  cardDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cardLastDigits: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 6,
  },

  // === TABS SEGMENTED (sticky) ===
  tabsStickyWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    zIndex: 10,
  },
  tabsBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.full,
  },
  tabContentWrap: {
    paddingTop: Spacing.xs,
  },
  tabSeg: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Quick action grid
  quickActionGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Mini stat row
  miniStatRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  miniStatCell: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
  },
  miniStatNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.4,
  },
  miniStatEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 4,
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
    letterSpacing: -0.3,
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

  // === EDITORIAL: WITHDRAW PILL CTA ===
  withdrawWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  withdrawPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  withdrawContent: {
    flex: 1,
    paddingVertical: 6,
  },
  withdrawEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  withdrawLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  withdrawArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // === EDITORIAL: MINI STAT STRIP ===
  miniStatRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStatCellLast: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
  },

  // === EDITORIAL: COMMISSION CALLOUT ===
  commissionCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  commissionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#92400E',
    marginBottom: 2,
  },
  commissionTextE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },

  // === EDITORIAL: SECTIONS ===
  sectionHeaderE: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  seeAllPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },

  // === EDITORIAL: TXN CARD ===
  txnCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  txnDayTile: {
    width: 50,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnDayNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: -0.6,
  },
  txnDayMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  txnBody: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  txnTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  txnEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txnEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  txnBalance: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  txnTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  txnSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  txnAmountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  txnSign: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: -0.5,
  },
  txnAmount: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 16,
    marginTop: 2,
  },
  txnCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },

  // === EDITORIAL: PAYOUT CARD ===
  payoutCardE: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  payoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  payoutStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payoutStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  payoutStatusText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  methodMark: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  payoutAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  payoutAmountValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 30,
  },
  payoutAmountCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  payoutMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  payoutMethodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutMethodLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: -0.2,
  },
  payoutMethodDest: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: -0.1,
    marginTop: 1,
  },
  payoutDateE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  payoutFailure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  payoutFailureText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#991B1B',
    letterSpacing: -0.1,
  },
  payoutCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  payoutCancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // === EDITORIAL: PENDING CARD ===
  pendingCardE: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  pendingDateTile: {
    width: 56,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.8,
  },
  pendingDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  pendingBodyE: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  pendingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pendingPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  pendingDays: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  pendingTitleE: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  pendingReleaseE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  pendingAmountColE: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  pendingAmountE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 16,
  },
  pendingCurrencyE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },

  // === EDITORIAL: EMPTY ===
  emptySectionE: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  emptyEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  emptyTextE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  // === EDITORIAL: MODALS ===
  modalHeaderE: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.8,
    lineHeight: 28,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  balancePillLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  balancePillValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  inputGroupE: {
    marginBottom: Spacing.md,
  },
  inputLabelE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputE: {
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  methodsRowE: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  operatorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Note: marginBottom est porté par inputLabelE — ne pas dupliquer ici
    // sinon le label opérateur a un gap plus grand que les autres.
  },
  operatorCountryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  operatorCountryText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  operatorEmptyHint: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  operatorEmptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  mmLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  mmLockedValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  mmLockedHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  mmEmptyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  mmEmptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  mmEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
  },
  mmEmptyBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  methodChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  warningBoxE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  warningTextE: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#92400E',
    letterSpacing: -0.1,
  },
  modalActionsE: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalCancelE: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  modalConfirmE: {
    flex: 1.4,
    flexDirection: 'row',
    height: 50,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  modalConfirmTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modalConfirmArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bankSectionE: {
    marginBottom: Spacing.md,
  },
  bankSectionHeaderE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  bankSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankSectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bankSectionTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
  },
  dividerE: {
    height: 1,
    marginVertical: Spacing.md,
  },
});
