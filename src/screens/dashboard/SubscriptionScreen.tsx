import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';

import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { subscriptionsAPI, paymentsAPI } from '../../api';
import { usePaymentVerification } from '../../hooks/usePaymentVerification';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { getServiceFeeLabel } from '../../constants/payment';
import {
  RootStackParamList,
  SubscriptionPlan,
  OrganizerSubscription,
  PlanName,
} from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
  TOUCH_OPACITY,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOGGLE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const TOGGLE_ITEM_WIDTH = (TOGGLE_WIDTH - 8) / 2;

// Design colors
const VIOLET = '#4F46E5';
const ROSE = '#A855F7';
const SURFACE = '#F8F7FC';
const INK = '#111827';
const BORDER_COLOR = '#E0E7FF';

const getPlanColor = (name: PlanName): string => {
  switch (name) {
    case 'free':
      return '#6B7280';
    case 'essential':
      return VIOLET;
    case 'premium':
      return ROSE;
    default:
      return VIOLET;
  }
};

const getPlanIcon = (name: PlanName): keyof typeof MaterialCommunityIcons.glyphMap => {
  switch (name) {
    case 'free':
      return 'gift-outline';
    case 'essential':
      return 'rocket-launch-outline';
    case 'premium':
      return 'crown-outline';
    default:
      return 'star-outline';
  }
};

type TFn = (k: string, opts?: any) => string;

const getStatusLabel = (status?: string, dark?: boolean, t?: TFn): { label: string; color: string; bgColor: string } => {
  const tt = t || ((k: string) => k);
  switch (status) {
    case 'active':
      return { label: tt('subscriptionForm.statusActive'), color: '#16A34A', bgColor: dark ? '#052E16' : '#DCFCE7' };
    case 'trial':
      return { label: tt('subscriptionForm.statusTrial'), color: '#D97706', bgColor: dark ? '#422006' : '#FEF3C7' };
    case 'expired':
      return { label: tt('subscriptionForm.statusExpired'), color: '#DC2626', bgColor: dark ? '#450A0A' : '#FEE2E2' };
    case 'cancelled':
      return { label: tt('subscriptionForm.statusCancelled'), color: '#DC2626', bgColor: dark ? '#450A0A' : '#FEE2E2' };
    case 'past_due':
      return { label: tt('subscriptionForm.statusPastDue'), color: '#D97706', bgColor: dark ? '#422006' : '#FEF3C7' };
    default:
      return { label: tt('subscriptionForm.statusActive'), color: '#16A34A', bgColor: dark ? '#052E16' : '#DCFCE7' };
  }
};

const formatDate = (dateStr?: string, locale: string = 'fr-FR'): string => {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
};

const formatPrice = (price: number, currency: string = 'XAF', t?: TFn, locale: string = 'fr-FR'): string => {
  if (price === 0) return t ? t('subscriptionForm.free') : 'Gratuit';
  return `${price.toLocaleString(locale)} ${currency}`;
};

type PaymentStep = 'select-method' | 'enter-phone' | 'processing' | 'success' | 'failed';
// Type ouvert : couvre toutes les methodes que NotchPay + CinetPay supportent.
// Le backend valide via PaymentProviderFactory.
type PaymentMethod = string;

// Mapping API method id -> proprietes UI (icone, couleur, requires phone).
// Couvre les 11 methodes possibles : mtn_money, orange_money, moov_money,
// free_money, yas, wave, mpesa, airtel_money, cinetpay_wallet, credit_card,
// paypal, bank_transfer.
interface MethodUI {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap | keyof typeof Ionicons.glyphMap;
  iconLib: 'mci' | 'ion';
  color: string;          // couleur de fond pastel
  iconColor: string;      // couleur de l'icone
  requiresPhone: boolean;
}

const METHOD_UI_CONFIG: Record<string, MethodUI> = {
  mtn_money:       { iconLib: 'mci', iconName: 'cellphone', color: '#FFCC00', iconColor: '#FFCC00', requiresPhone: true },
  orange_money:    { iconLib: 'mci', iconName: 'cellphone', color: '#FF6600', iconColor: '#FF6600', requiresPhone: true },
  moov_money:      { iconLib: 'mci', iconName: 'cellphone', color: '#0EA5E9', iconColor: '#0EA5E9', requiresPhone: true },
  free_money:      { iconLib: 'mci', iconName: 'cellphone', color: '#EF4444', iconColor: '#EF4444', requiresPhone: true },
  yas:             { iconLib: 'mci', iconName: 'cellphone', color: '#10B981', iconColor: '#10B981', requiresPhone: true },
  wave:            { iconLib: 'mci', iconName: 'cellphone', color: '#06B6D4', iconColor: '#06B6D4', requiresPhone: true },
  mpesa:           { iconLib: 'mci', iconName: 'cellphone', color: '#16A34A', iconColor: '#16A34A', requiresPhone: true },
  airtel_money:    { iconLib: 'mci', iconName: 'cellphone', color: '#F43F5E', iconColor: '#F43F5E', requiresPhone: true },
  cinetpay_wallet: { iconLib: 'ion', iconName: 'wallet-outline', color: '#8B5CF6', iconColor: '#8B5CF6', requiresPhone: false },
  credit_card:     { iconLib: 'ion', iconName: 'card-outline', color: '#3B82F6', iconColor: '#3B82F6', requiresPhone: false },
  paypal:          { iconLib: 'ion', iconName: 'logo-paypal', color: '#1E40AF', iconColor: '#1E40AF', requiresPhone: false },
  bank_transfer:   { iconLib: 'ion', iconName: 'business-outline', color: '#6B7280', iconColor: '#6B7280', requiresPhone: false },
};

interface AvailableMethod {
  id: string;
  name: string;
  provider: 'notchpay' | 'cinetpay' | null;
  ui: MethodUI;
}

interface PaymentModalState {
  visible: boolean;
  step: PaymentStep;
  plan: SubscriptionPlan | null;
  paymentId: string | null;
  method: PaymentMethod | null;
  phone: string;
  amount: number;
  errorMessage: string;
}

const INITIAL_PAYMENT_STATE: PaymentModalState = {
  visible: false,
  step: 'select-method',
  plan: null,
  paymentId: null,
  method: null,
  phone: '',
  amount: 0,
  errorMessage: '',
};

// Phone prefix per country code (NotchPay supported countries)
const COUNTRY_PHONE_PREFIX: Record<string, string> = {
  CM: '+237',
  CI: '+225',
  SN: '+221',
  KE: '+254',
  GH: '+233',
  UG: '+256',
};

export default function SubscriptionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const numberLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const { config: commissionConfig, currency: commissionCurrency } = useCommissionConfig();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planCurrency, setPlanCurrency] = useState('XAF');
  const [subscription, setSubscription] = useState<OrganizerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentModalState>(INITIAL_PAYMENT_STATE);
  // Methodes de paiement dynamiques (fetch au moment d'ouvrir la modale).
  // Vide tant que pas charge — on affiche un spinner cote select-method.
  const [availableMethods, setAvailableMethods] = useState<AvailableMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);

  // Animated underline for toggle
  const toggleAnim = useRef(new Animated.Value(0)).current;

  const countryCode = commissionConfig?.country_code;
  const phonePrefix = COUNTRY_PHONE_PREFIX[countryCode || 'CM'] || '+237';

  useEffect(() => {
    loadData();
  }, [countryCode]);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: billingCycle === 'monthly' ? 0 : 1,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [billingCycle]);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionsAPI.getPrices(countryCode),
        subscriptionsAPI.getCurrentPlan(),
      ]);
      const loadedPlans = plansRes.data.results || plansRes.data || [];
      setPlans(loadedPlans);
      // Use currency from first non-free plan, or commission config
      const paidPlan = loadedPlans.find((p: SubscriptionPlan) => p.monthly_price > 0);
      setPlanCurrency(paidPlan?.currency || commissionCurrency || 'XAF');
      if (subRes.data?.plan || subRes.data?.plan_details) {
        setSubscription(subRes.data);
      }
    } catch (err) {
      if (__DEV__) console.error('Erreur chargement abonnement:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentPlanName: PlanName = subscription?.plan?.name
    || (subscription?.plan_details?.name)
    || 'free';

  const currentPlan: SubscriptionPlan | undefined = plans.find(
    (p) => p.name === currentPlanName
  );

  const planOrder: PlanName[] = ['free', 'essential', 'premium'];

  const isUpgrade = (targetPlan: PlanName): boolean => {
    const currentIdx = planOrder.indexOf(currentPlanName);
    const targetIdx = planOrder.indexOf(targetPlan);
    return targetIdx > currentIdx;
  };

  // Shared payment verification hook for subscription payments
  const {
    startVerification: startSubscriptionVerification,
    stopVerification: stopSubscriptionVerification,
  } = usePaymentVerification({
    pollInterval: 5000,
    maxAttempts: 120, // 10 min (Mobile Money peut prendre jusqu'a 10 min)
    maxConsecutiveErrors: 10,
    // Use the subscription-specific verify endpoint
    verifyFn: (paymentId: string) => subscriptionsAPI.verifyPayment(paymentId),
    // Subscription verify returns status directly in data.status
    extractStatus: (data: any) => (data?.status || '').toLowerCase(),
    extractErrorMessage: (data: any) => data?.message || t('subscriptionForm.paymentDefaultError'),
    onSuccess: (_data) => {
      setPayment((prev) => ({ ...prev, step: 'success' }));
      loadData();
    },
    onFailure: (errorMessage, _data) => {
      setPayment((prev) => ({
        ...prev,
        step: 'failed',
        errorMessage,
      }));
    },
    onTimeout: (_lastStatus) => {
      setPayment((prev) => ({
        ...prev,
        step: 'failed',
        errorMessage: t('subscriptionForm.paymentTimeoutError'),
      }));
    },
    onMaxErrors: (_lastError) => {
      setPayment((prev) => ({
        ...prev,
        step: 'failed',
        errorMessage: t('subscriptionForm.paymentTimeoutError'),
      }));
    },
  });

  const closePaymentModal = useCallback(() => {
    stopSubscriptionVerification();
    setPayment(INITIAL_PAYMENT_STATE);
  }, [stopSubscriptionVerification]);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    const isUp = isUpgrade(plan.name);
    const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
    const cycleLabel = billingCycle === 'monthly' ? t('subscriptionForm.perMonth') : t('subscriptionForm.perYear');

    Alert.alert(
      t('subscriptionForm.confirmChangeTitle'),
      isUp
        ? t('subscriptionForm.confirmUpgrade', { plan: plan.display_name, price: formatPrice(price, planCurrency, t, numberLocale), cycle: cycleLabel })
        : t('subscriptionForm.confirmDowngrade', { plan: plan.display_name, price: formatPrice(price, planCurrency, t, numberLocale), cycle: cycleLabel }),
      [
        { text: t('subscriptionForm.cancelButton'), style: 'cancel' },
        {
          text: t('refundRequest.confirmButton'),
          onPress: async () => {
            setUpgrading(plan.id);
            try {
              const res = await subscriptionsAPI.upgrade(plan.id, billingCycle);
              const data = res.data;

              if (data.requires_payment) {
                // Paid plan -> show payment modal
                setPayment({
                  visible: true,
                  step: 'select-method',
                  plan,
                  paymentId: data.payment?.id ?? data.payment_id,
                  method: null,
                  phone: '',
                  amount: data.calculated_price ?? data.payment?.amount ?? data.amount ?? price,
                  errorMessage: '',
                });

                // Charge dynamiquement les methodes selon (pays organisateur, devise).
                // Reutilise le meme endpoint que la billetterie (merge NotchPay+CinetPay).
                setMethodsLoading(true);
                try {
                  const country = (data.payment?.country_code || countryCode || 'CM').toUpperCase();
                  const currency = data.payment?.currency || planCurrency || 'XAF';
                  const methodsRes = await paymentsAPI.getPaymentMethods(country, currency);
                  const apiMethods = methodsRes.data?.methods || [];
                  const mapped: AvailableMethod[] = apiMethods
                    .filter((m: any) => METHOD_UI_CONFIG[m.id])
                    .map((m: any) => ({
                      id: m.id,
                      name: m.name,
                      provider: m.selected_provider ?? null,
                      ui: METHOD_UI_CONFIG[m.id],
                    }));
                  setAvailableMethods(mapped);
                } catch (e) {
                  // Fallback : 3 methodes minimales pour ne pas bloquer
                  setAvailableMethods([
                    { id: 'mtn_money', name: t('subscriptionForm.mtnMomo'), provider: null, ui: METHOD_UI_CONFIG.mtn_money },
                    { id: 'orange_money', name: t('subscriptionForm.orangeMoneyMethod'), provider: null, ui: METHOD_UI_CONFIG.orange_money },
                    { id: 'credit_card', name: t('subscriptionForm.creditCardMethod'), provider: null, ui: METHOD_UI_CONFIG.credit_card },
                  ]);
                } finally {
                  setMethodsLoading(false);
                }
              } else {
                // Free plan -> directly applied
                Alert.alert(
                  t('subscriptionForm.subscriptionUpdatedTitle'),
                  t('subscriptionForm.subscriptionUpdatedMessage', { plan: plan.display_name }),
                  [{ text: t('refundRequest.okButton') }]
                );
                await loadData();
              }
            } catch (err: any) {
              const errorMessage =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                t('subscriptionForm.genericChangeError');
              Alert.alert(t('common.error'), errorMessage);
            } finally {
              setUpgrading(null);
            }
          },
        },
      ]
    );
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    // Methode sans phone (carte, paypal, cinetpay_wallet, bank_transfer) :
    // processing immediat (redirect via WebBrowser cote provider).
    const m = availableMethods.find(x => x.id === method);
    if (m && !m.ui.requiresPhone) {
      setPayment((prev) => ({ ...prev, method, step: 'processing' }));
      processPayment(method, '');
    } else {
      // Mobile Money -> need phone number
      setPayment((prev) => ({ ...prev, method, step: 'enter-phone' }));
    }
  };

  const handleSubmitPhone = () => {
    const cleanPhone = payment.phone.replace(/\s/g, '');
    if (cleanPhone.length < 9) {
      Alert.alert(t('subscriptionForm.invalidPhoneTitle'), t('subscriptionForm.invalidPhoneMessage'));
      return;
    }
    setPayment((prev) => ({ ...prev, step: 'processing' }));
    processPayment(payment.method!, cleanPhone);
  };

  const processPayment = async (method: PaymentMethod, phone: string) => {
    const currentPaymentId = payment.paymentId!;
    try {
      const prefixDigits = phonePrefix.replace('+', '');
      const fullPhone = phone ? `${phonePrefix}${phone.replace(new RegExp(`^\\+?${prefixDigits}`), '')}` : '';
      const res = await subscriptionsAPI.processPayment(currentPaymentId, method, fullPhone);
      const data = res.data;
      // Backend retourne { success, payment: { status }, authorization_url? }
      const subStatus = (data.payment?.status || data.status || '').toLowerCase();

      if (data.success === false) {
        setPayment((prev) => ({
          ...prev,
          step: 'failed',
          errorMessage: data.message || t('subscriptionForm.paymentDefaultError'),
        }));
      } else if (data.authorization_url) {
        // Carte : ouvrir le navigateur + poller
        Linking.openURL(data.authorization_url);
        startSubscriptionVerification(currentPaymentId);
      } else if (subStatus === 'completed') {
        setPayment((prev) => ({ ...prev, step: 'success' }));
        loadData();
      } else {
        // Mobile Money en cours : polling jusqu'a confirmation OTP
        startSubscriptionVerification(currentPaymentId);
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        t('subscriptionForm.paymentProcessError');
      setPayment((prev) => ({
        ...prev,
        step: 'failed',
        errorMessage,
      }));
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('subscriptionForm.cancelTitle'),
      t('subscriptionForm.cancelMessage'),
      [
        { text: t('subscriptionForm.cancelNo'), style: 'cancel' },
        {
          text: t('subscriptionForm.cancelYes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionsAPI.cancel();
              Alert.alert(
                t('subscriptionForm.cancelledTitle'),
                t('subscriptionForm.cancelledMessage')
              );
              await loadData();
            } catch (err: any) {
              const errorMessage =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                t('subscriptionForm.cancelGenericError');
              Alert.alert(t('common.error'), errorMessage);
            }
          },
        },
      ]
    );
  };

  // Calculate usage
  const maxEvents = currentPlan?.max_active_events || 30;
  const usedEvents = (subscription as any)?.active_events_count ?? 0;
  const usageRatio = maxEvents > 0 ? Math.min(usedEvents / maxEvents, 1) : 0;

  const translateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, TOGGLE_ITEM_WIDTH + 4],
  });

  // Dynamic design colors based on theme
  const ink = isDark ? colors.gray900 : INK;
  const surface = isDark ? colors.gray100 : SURFACE;
  const borderColor = isDark ? colors.gray200 : BORDER_COLOR;
  const cardBg = isDark ? colors.card : '#FFFFFF';
  const violet = isDark ? colors.primary : VIOLET;

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>PLAN</WatermarkNumeral>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: surface }]}
            onPress={() => navigation.goBack()}
            activeOpacity={TOUCH_OPACITY}
          >
            <Ionicons name="arrow-back" size={24} color={ink} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: ink }]}>{t('subscriptionForm.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner message={t('subscriptionForm.loading')} />
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>PLAN</WatermarkNumeral>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={TOUCH_OPACITY}
        >
          <Ionicons name="arrow-back" size={24} color={ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: ink }]}>{t('subscriptionForm.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Card */}
        <View style={[styles.currentPlanCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <View style={styles.currentPlanHeader}>
            <View style={styles.currentPlanLeft}>
              <View style={[styles.planIconCircle, { backgroundColor: getPlanColor(currentPlanName) + '18' }]}>
                <MaterialCommunityIcons
                  name={getPlanIcon(currentPlanName)}
                  size={24}
                  color={getPlanColor(currentPlanName)}
                />
              </View>
              <View style={styles.currentPlanInfo}>
                <View style={styles.currentPlanNameRow}>
                  <Text style={[styles.currentPlanName, { color: ink }]}>
                    {currentPlan?.display_name || (currentPlanName === 'free' ? t('subscriptionForm.free') : currentPlanName)}
                  </Text>
                  <View style={[styles.planNameBadge, { backgroundColor: getPlanColor(currentPlanName) + '18' }]}>
                    <Text style={[styles.planNameBadgeText, { color: getPlanColor(currentPlanName) }]}>
                      {currentPlanName === 'free' ? t('subscriptionForm.planFree') : currentPlanName === 'essential' ? t('subscriptionForm.planEssential') : t('subscriptionForm.planPremium')}
                    </Text>
                  </View>
                </View>
                {(() => {
                  const statusInfo = getStatusLabel(subscription?.status, isDark, t);
                  return (
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                      <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>

          {/* Usage */}
          <View style={styles.usageSection}>
            <View style={styles.usageHeader}>
              <Text style={[styles.usageLabel, { color: colors.gray500 }]}>{t('subscriptionForm.activeEvents')}</Text>
              <Text style={[styles.usageValue, { color: ink }]}>
                {usedEvents} / {maxEvents === 999 || maxEvents > 100 ? t('subscriptionForm.unlimited') : maxEvents}
              </Text>
            </View>
            <View style={[styles.progressBarBackground, { backgroundColor: surface }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(usageRatio * 100, 2)}%`,
                    backgroundColor: usageRatio > 0.8 ? colors.error : violet,
                  },
                ]}
              />
            </View>
          </View>

          {/* Next billing date */}
          {subscription?.next_billing_date && currentPlanName !== 'free' && (
            <View style={styles.billingDateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
              <Text style={[styles.billingDateText, { color: colors.gray500 }]}>
                {t('subscriptionForm.nextRenewal', { date: formatDate(subscription.next_billing_date, numberLocale) })}
              </Text>
            </View>
          )}

          {/* Cancel button for paid plans */}
          {subscription && currentPlanName !== 'free' && subscription.status === 'active' && (
            <TouchableOpacity
              style={[styles.cancelButton, isDark && { backgroundColor: '#3B1515', borderColor: '#7F1D1D' }]}
              onPress={handleCancel}
              activeOpacity={TOUCH_OPACITY}
            >
              <Text style={styles.cancelButtonText}>{t('subscriptionForm.cancelSubscription')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Billing Cycle Toggle */}
        <View style={styles.toggleSection}>
          <Text style={[styles.sectionTitle, { color: ink }]}>{t('subscriptionForm.choosePlan')}</Text>
          <View style={[styles.toggleContainer, { backgroundColor: surface }]}>
            <Animated.View
              style={[
                styles.toggleSlider,
                { backgroundColor: cardBg, transform: [{ translateX }] },
              ]}
            />
            <TouchableOpacity
              style={styles.toggleItem}
              onPress={() => setBillingCycle('monthly')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: colors.gray500 },
                  billingCycle === 'monthly' && [styles.toggleTextActive, { color: ink }],
                ]}
              >
                {t('subscriptionForm.monthly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleItem}
              onPress={() => setBillingCycle('yearly')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: colors.gray500 },
                  billingCycle === 'yearly' && [styles.toggleTextActive, { color: ink }],
                ]}
              >
                {t('subscriptionForm.yearly')}
              </Text>
              <View style={[styles.saveBadge, { backgroundColor: violet + '18' }]}>
                <Text style={[styles.saveBadgeText, { color: violet }]}>{t('subscriptionForm.discountPill')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards */}
        {planOrder.map((planName) => {
          const plan = plans.find((p) => p.name === planName);
          if (!plan) return null;

          const isCurrent = plan.name === currentPlanName;
          const isUpgradeAction = isUpgrade(plan.name);
          const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
          const planColor = getPlanColor(plan.name);
          const isPopular = plan.name === 'essential' || plan.is_popular;
          const isProcessing = upgrading === plan.id;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: cardBg, borderColor },
                isCurrent && [styles.planCardCurrent, { borderColor: violet }],
                isPopular && !isCurrent && [styles.planCardPopular, { borderColor: violet + '60' }],
              ]}
            >
              {/* Popular badge */}
              {isPopular && !isCurrent && (
                <View style={[styles.popularBadge, { backgroundColor: violet }]}>
                  <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" />
                  <Text style={styles.popularBadgeText}>{t('subscriptionForm.badgePopular')}</Text>
                </View>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: violet + '12' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={violet} />
                  <Text style={[styles.currentBadgeText, { color: violet }]}>{t('subscriptionForm.badgeCurrent')}</Text>
                </View>
              )}

              {/* Plan header */}
              <View style={styles.planCardHeader}>
                <View style={[styles.planCardIconCircle, { backgroundColor: planColor + '15' }]}>
                  <MaterialCommunityIcons
                    name={getPlanIcon(plan.name)}
                    size={28}
                    color={planColor}
                  />
                </View>
                <View style={styles.planCardTitleSection}>
                  <Text style={[styles.planCardName, { color: ink }]}>{plan.display_name}</Text>
                  <Text style={[styles.planCardDescription, { color: colors.gray500 }]}>{plan.description}</Text>
                </View>
              </View>

              {/* Price */}
              <View style={[styles.planPriceSection, { borderTopColor: borderColor }]}>
                <Text style={[styles.planPrice, { color: ink }]}>{formatPrice(price, planCurrency, t, numberLocale)}</Text>
                {price > 0 && (
                  <Text style={[styles.planPricePeriod, { color: colors.gray500 }]}>
                    / {billingCycle === 'monthly' ? t('subscriptionForm.perMonth') : t('subscriptionForm.perYear')}
                  </Text>
                )}
              </View>

              {/* Features */}
              <View style={styles.planFeatures}>
                {(plan.features || []).map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={planColor} />
                    <Text style={[styles.featureText, { color: colors.gray600 }]}>{feature}</Text>
                  </View>
                ))}

                {/* Visibility level */}
                <View style={styles.featureRow}>
                  <Ionicons name="eye-outline" size={18} color={planColor} />
                  <Text style={[styles.featureText, { color: colors.gray600 }]}>
                    {plan.name === 'free'
                      ? t('subscriptionForm.visibilityStandard')
                      : plan.name === 'essential'
                        ? t('subscriptionForm.visibilityImproved')
                        : t('subscriptionForm.visibilityMaximum')}
                  </Text>
                </View>

                {/* Max events */}
                <View style={styles.featureRow}>
                  <Ionicons name="calendar-outline" size={18} color={planColor} />
                  <Text style={[styles.featureText, { color: colors.gray600 }]}>
                    {plan.max_active_events > 100
                      ? t('subscriptionForm.eventsUnlimited')
                      : t('subscriptionForm.eventsUpTo', { count: plan.max_active_events })}
                  </Text>
                </View>

                {/* Max participants */}
                <View style={styles.featureRow}>
                  <Ionicons name="people-outline" size={18} color={planColor} />
                  <Text style={[styles.featureText, { color: colors.gray600 }]}>
                    {plan.max_participants_per_event > 10000
                      ? t('subscriptionForm.participantsUnlimited')
                      : t('subscriptionForm.participantsUpTo', { count: plan.max_participants_per_event.toLocaleString(numberLocale) })}
                  </Text>
                </View>
              </View>

              {/* Action button */}
              {!isCurrent && (
                <View style={styles.planActionContainer}>
                  {isUpgradeAction ? (
                    <TouchableOpacity
                      onPress={() => handleUpgrade(plan)}
                      activeOpacity={TOUCH_OPACITY}
                      disabled={isProcessing}
                    >
                      <LinearGradient
                        colors={[VIOLET, ROSE]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.upgradeButton}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="arrow-up-circle-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.upgradeButtonText}>{t('subscriptionForm.switchToPlan')}</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.downgradeButton, { backgroundColor: surface, borderColor }]}
                      onPress={() => handleUpgrade(plan)}
                      activeOpacity={TOUCH_OPACITY}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={colors.gray600} />
                      ) : (
                        <>
                          <Ionicons name="arrow-down-circle-outline" size={20} color={colors.gray600} />
                          <Text style={[styles.downgradeButtonText, { color: colors.gray600 }]}>{t('subscriptionForm.switchToPlan')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Commission reminder */}
        <View style={[styles.commissionReminder, { backgroundColor: violet + '08', borderColor: violet + '15' }]}>
          <View style={[styles.commissionIconCircle, { backgroundColor: violet + '12' }]}>
            <Ionicons name="information-circle-outline" size={20} color={violet} />
          </View>
          <Text style={[styles.commissionText, { color: colors.gray600 }]}>
            {t('subscriptionForm.commissionReminder', { fee: getServiceFeeLabel(commissionConfig) })}
          </Text>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={payment.visible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (payment.step !== 'processing') closePaymentModal();
        }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: ink }]}>
                {payment.step === 'select-method' && t('subscriptionForm.modalMethod')}
                {payment.step === 'enter-phone' && t('subscriptionForm.modalPhone')}
                {payment.step === 'processing' && t('subscriptionForm.modalProcessing')}
                {payment.step === 'success' && t('subscriptionForm.modalSuccess')}
                {payment.step === 'failed' && t('subscriptionForm.modalFailed')}
              </Text>
              {payment.step !== 'processing' && (
                <TouchableOpacity
                  onPress={closePaymentModal}
                  style={[styles.modalCloseButton, { backgroundColor: surface }]}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="close" size={24} color={colors.gray600} />
                </TouchableOpacity>
              )}
            </View>

            {/* Amount display */}
            {payment.step !== 'success' && payment.step !== 'failed' && (
              <View style={[styles.modalAmountRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.modalAmountLabel, { color: colors.gray500 }]}>
                  {payment.plan?.display_name} - {billingCycle === 'monthly' ? t('subscriptionForm.monthly') : t('subscriptionForm.yearly')}
                </Text>
                <Text style={[styles.modalAmountValue, { color: ink }]}>
                  {formatPrice(payment.amount, planCurrency, t, numberLocale)}
                </Text>
              </View>
            )}

            {/* Step: Select Method (dynamique selon pays organisateur) */}
            {payment.step === 'select-method' && (
              <View style={styles.methodsContainer}>
                {methodsLoading ? (
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={VIOLET} />
                  </View>
                ) : availableMethods.length === 0 ? (
                  <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D' }}>
                    <Text style={{ fontSize: 13, color: '#92400E' }}>
                      Aucune methode de paiement disponible pour votre pays. Contactez le support.
                    </Text>
                  </View>
                ) : (
                  availableMethods.map((m) => {
                    const Icon = m.ui.iconLib === 'mci' ? MaterialCommunityIcons : Ionicons;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.methodCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => handleSelectPaymentMethod(m.id)}
                        activeOpacity={TOUCH_OPACITY}
                      >
                        <View style={[styles.methodIconCircle, { backgroundColor: m.ui.color + '20' }]}>
                          {/* @ts-expect-error : iconName est union de deux libs */}
                          <Icon name={m.ui.iconName} size={24} color={m.ui.iconColor} />
                        </View>
                        <View style={styles.methodInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={[styles.methodName, { color: ink }]}>{m.name}</Text>
                            {m.provider && (
                              <View style={{
                                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                                backgroundColor: m.provider === 'cinetpay' ? '#EDE9FE' : '#D1FAE5',
                              }}>
                                <Text style={{
                                  fontSize: 9, fontWeight: '600',
                                  color: m.provider === 'cinetpay' ? '#6D28D9' : '#047857',
                                  textTransform: 'uppercase', letterSpacing: 0.5,
                                }}>
                                  {m.provider === 'cinetpay' ? 'CinetPay' : 'NotchPay'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Step: Enter Phone */}
            {payment.step === 'enter-phone' && (
              <View style={styles.phoneContainer}>
                <Text style={[styles.phoneLabel, { color: ink }]}>
                  {(() => {
                    // Affiche le nom de la methode courante (MTN MoMo, Wave, etc.)
                    const m = availableMethods.find(x => x.id === payment.method);
                    if (m) return t('subscriptionForm.phoneLabelGeneric', { method: m.name, defaultValue: `Numero ${m.name}` });
                    if (payment.method === 'mtn_money') return t('subscriptionForm.phoneLabelMtn');
                    if (payment.method === 'orange_money') return t('subscriptionForm.phoneLabelOrange');
                    return t('subscriptionForm.phoneLabelGeneric', { method: '', defaultValue: 'Numero de telephone' });
                  })()}
                </Text>
                <View style={[styles.phoneInputRow, { borderColor }]}>
                  <View style={[styles.phonePrefix, { backgroundColor: surface, borderRightColor: borderColor }]}>
                    <Text style={[styles.phonePrefixText, { color: colors.gray500 }]}>{phonePrefix}</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, { color: ink }]}
                    value={payment.phone}
                    onChangeText={(text) =>
                      setPayment((prev) => ({ ...prev, phone: text.replace(/[^0-9]/g, '') }))
                    }
                    placeholder={t('subscriptionForm.phonePlaceholder')}
                    placeholderTextColor={colors.gray400}
                    keyboardType="phone-pad"
                    maxLength={9}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSubmitPhone}
                  activeOpacity={TOUCH_OPACITY}
                  disabled={payment.phone.replace(/\s/g, '').length < 9}
                >
                  <LinearGradient
                    colors={[VIOLET, ROSE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.payButton,
                      payment.phone.replace(/\s/g, '').length < 9 && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={styles.payButtonText}>
                      {t('subscriptionForm.payWithAmount', { amount: formatPrice(payment.amount, planCurrency, t, numberLocale) })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backToMethodsButton}
                  onPress={() => setPayment((prev) => ({ ...prev, step: 'select-method', method: null }))}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.gray600} />
                  <Text style={[styles.backToMethodsText, { color: colors.gray600 }]}>{t('subscriptionForm.changeMethod')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step: Processing */}
            {payment.step === 'processing' && (
              <View style={styles.processingContainer}>
                <LoadingSpinner />
                <Text style={[styles.processingTitle, { color: ink }]}>{t('subscriptionForm.processingTitle')}</Text>
                <Text style={[styles.processingDescription, { color: colors.gray500 }]}>
                  {payment.method === 'credit_card'
                    ? t('subscriptionForm.processingDescriptionCard')
                    : t('subscriptionForm.processingDescriptionMomo')}
                </Text>
                {payment.method && payment.method !== 'credit_card' && (
                  <View style={[styles.processingHint, { backgroundColor: violet + '10' }]}>
                    <Ionicons name="information-circle-outline" size={18} color={violet} />
                    <Text style={[styles.processingHintText, { color: violet }]}>
                      {payment.method === 'mtn_money'
                        ? t('subscriptionForm.mtnHint')
                        : t('subscriptionForm.orangeHint')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Step: Success */}
            {payment.step === 'success' && (
              <View style={styles.resultContainer}>
                <View style={[styles.successIconCircle, isDark && { backgroundColor: '#052E16' }]}>
                  <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                </View>
                <Text style={[styles.resultTitle, { color: ink }]}>{t('subscriptionForm.successResultTitle')}</Text>
                <Text style={[styles.resultDescription, { color: colors.gray500 }]}>
                  {t('subscriptionForm.successResultDescription', { plan: payment.plan?.display_name || '' })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    closePaymentModal();
                    loadData();
                  }}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <LinearGradient
                    colors={[VIOLET, ROSE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.payButton}
                  >
                    <Text style={styles.payButtonText}>{t('subscriptionForm.closeButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Step: Failed */}
            {payment.step === 'failed' && (
              <View style={styles.resultContainer}>
                <View style={[styles.failedIconCircle, isDark && { backgroundColor: '#450A0A' }]}>
                  <Ionicons name="close-circle" size={56} color={colors.error} />
                </View>
                <Text style={[styles.resultTitle, { color: ink }]}>{t('subscriptionForm.failedResultTitle')}</Text>
                <Text style={[styles.resultDescription, { color: colors.gray500 }]}>
                  {payment.errorMessage || t('subscriptionForm.failedResultDescription')}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setPayment((prev) => ({
                      ...prev,
                      step: 'select-method',
                      method: null,
                      phone: '',
                      errorMessage: '',
                    }))
                  }
                  activeOpacity={TOUCH_OPACITY}
                >
                  <LinearGradient
                    colors={[VIOLET, ROSE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.payButton}
                  >
                    <Text style={styles.payButtonText}>{t('subscriptionForm.retryButton')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backToMethodsButton}
                  onPress={closePaymentModal}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Text style={[styles.backToMethodsText, { color: colors.gray600 }]}>{t('subscriptionForm.cancelButton')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    color: INK,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  // ===== Current Plan Card =====
  currentPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...Shadows.md,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  planIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  currentPlanName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: INK,
  },
  planNameBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  planNameBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },

  // Usage
  usageSection: {
    marginTop: Spacing.lg,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  usageLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  usageValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: INK,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: SURFACE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // Billing date
  billingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  billingDateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },

  // Cancel
  cancelButton: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.errorLight,
    backgroundColor: Colors.errorLight,
  },
  cancelButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },

  // ===== Toggle Section =====
  toggleSection: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: INK,
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: BorderRadius.xl,
    height: 48,
    padding: 4,
    position: 'relative',
  },
  toggleSlider: {
    position: 'absolute',
    top: 4,
    width: TOGGLE_ITEM_WIDTH,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  toggleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    gap: 6,
  },
  toggleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },
  toggleTextActive: {
    color: INK,
    fontFamily: FontFamily.semiBold,
  },
  saveBadge: {
    backgroundColor: VIOLET + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  saveBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: VIOLET,
  },

  // ===== Plan Cards =====
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...Shadows.sm,
  },
  planCardCurrent: {
    borderColor: VIOLET,
    borderWidth: 2,
  },
  planCardPopular: {
    borderColor: VIOLET + '60',
    borderWidth: 1.5,
  },

  // Popular badge
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VIOLET,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    zIndex: 2,
  },
  popularBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
  },

  // Current badge
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: VIOLET + '12',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    marginBottom: Spacing.md,
  },
  currentBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: VIOLET,
  },

  // Plan card header
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  planCardIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardTitleSection: {
    flex: 1,
  },
  planCardName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: INK,
  },
  planCardDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 4,
    lineHeight: 18,
  },

  // Price
  planPriceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  planPrice: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: INK,
  },
  planPricePeriod: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginLeft: 4,
  },

  // Features
  planFeatures: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    flex: 1,
    lineHeight: 20,
  },

  // Action buttons
  planActionContainer: {
    marginTop: Spacing.lg,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.buttonPrimary,
  },
  upgradeButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
  },
  downgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  downgradeButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray600,
  },

  // ===== Commission Reminder =====
  commissionReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VIOLET + '08',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: VIOLET + '15',
  },
  commissionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: VIOLET + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    flex: 1,
    lineHeight: 20,
  },

  // ===== Payment Modal =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: INK,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalAmountLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  modalAmountValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    color: INK,
  },

  // Payment methods
  methodsContainer: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    gap: Spacing.md,
  },
  methodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: INK,
  },
  methodDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },

  // Phone input
  phoneContainer: {
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  phoneLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: INK,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  phonePrefix: {
    backgroundColor: SURFACE,
    paddingHorizontal: Spacing.md,
    height: 52,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  },
  phonePrefixText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray600,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.lg,
    color: INK,
    letterSpacing: 1,
  },
  payButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.buttonPrimary,
  },
  payButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
  },
  backToMethodsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  backToMethodsText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },

  // Processing
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  processingTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: INK,
    marginTop: Spacing.md,
  },
  processingDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  processingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VIOLET + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  processingHintText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    color: VIOLET,
    flex: 1,
    lineHeight: 16,
  },

  // Result (success/failed)
  resultContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: INK,
  },
  resultDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
