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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';

import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { subscriptionsAPI } from '../../api/client';
import { usePaymentVerification } from '../../hooks/usePaymentVerification';
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
const VIOLET = '#7C3AED';
const ROSE = '#EC4899';
const SURFACE = '#F8F7FC';
const INK = '#1A1A2E';
const BORDER_COLOR = '#EDE9FE';

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

const getStatusLabel = (status?: string): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case 'active':
      return { label: 'Actif', color: '#16A34A', bgColor: '#DCFCE7' };
    case 'trial':
      return { label: 'Essai', color: '#D97706', bgColor: '#FEF3C7' };
    case 'expired':
      return { label: 'Expire', color: '#DC2626', bgColor: '#FEE2E2' };
    case 'cancelled':
      return { label: 'Annule', color: '#DC2626', bgColor: '#FEE2E2' };
    case 'past_due':
      return { label: 'En retard', color: '#D97706', bgColor: '#FEF3C7' };
    default:
      return { label: 'Actif', color: '#16A34A', bgColor: '#DCFCE7' };
  }
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
};

const formatPrice = (price: number): string => {
  if (price === 0) return 'Gratuit';
  return `${price.toLocaleString('fr-FR')} XAF`;
};

type PaymentStep = 'select-method' | 'enter-phone' | 'processing' | 'success' | 'failed';
type PaymentMethod = 'mtn_money' | 'orange_money' | 'credit_card';

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

export default function SubscriptionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<OrganizerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentModalState>(INITIAL_PAYMENT_STATE);

  // Animated underline for toggle
  const toggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

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
        subscriptionsAPI.getPlans(),
        subscriptionsAPI.getCurrentPlan(),
      ]);
      setPlans(plansRes.data.results || plansRes.data || []);
      if (subRes.data?.plan || subRes.data?.plan_details) {
        setSubscription(subRes.data);
      }
    } catch (err) {
      console.error('Erreur chargement abonnement:', err);
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
    maxAttempts: 60,
    maxConsecutiveErrors: 10,
    // Use the subscription-specific verify endpoint
    verifyFn: (paymentId: string) => subscriptionsAPI.verifyPayment(paymentId),
    // Subscription verify returns status directly in data.status
    extractStatus: (data: any) => (data?.status || '').toLowerCase(),
    extractErrorMessage: (data: any) => data?.message || 'Le paiement a echoue.',
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
        errorMessage: 'Le delai de paiement a expire. Veuillez reessayer.',
      }));
    },
    onMaxErrors: (_lastError) => {
      setPayment((prev) => ({
        ...prev,
        step: 'failed',
        errorMessage: 'Le delai de paiement a expire. Veuillez reessayer.',
      }));
    },
  });

  const closePaymentModal = useCallback(() => {
    stopSubscriptionVerification();
    setPayment(INITIAL_PAYMENT_STATE);
  }, [stopSubscriptionVerification]);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    const actionLabel = isUpgrade(plan.name) ? 'passer' : 'changer';
    const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;

    Alert.alert(
      `Confirmer le changement`,
      `Voulez-vous ${actionLabel} au plan ${plan.display_name} pour ${formatPrice(price)}/${billingCycle === 'monthly' ? 'mois' : 'an'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
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
                  paymentId: data.payment_id,
                  method: null,
                  phone: '',
                  amount: data.amount || price,
                  errorMessage: '',
                });
              } else {
                // Free plan -> directly applied
                Alert.alert(
                  'Abonnement mis a jour',
                  `Vous etes maintenant sur le plan ${plan.display_name}.`,
                  [{ text: 'OK' }]
                );
                await loadData();
              }
            } catch (err: any) {
              const errorMessage =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                'Une erreur est survenue lors du changement de plan.';
              Alert.alert('Erreur', errorMessage);
            } finally {
              setUpgrading(null);
            }
          },
        },
      ]
    );
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    if (method === 'credit_card') {
      // Process card payment immediately (redirects to NotchPay)
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
      Alert.alert('Numero invalide', 'Veuillez entrer un numero de telephone valide (9 chiffres).');
      return;
    }
    setPayment((prev) => ({ ...prev, step: 'processing' }));
    processPayment(payment.method!, cleanPhone);
  };

  const processPayment = async (method: PaymentMethod, phone: string) => {
    const currentPaymentId = payment.paymentId!;
    try {
      const fullPhone = phone ? `+237${phone.replace(/^\+237/, '')}` : '';
      const res = await subscriptionsAPI.processPayment(currentPaymentId, method, fullPhone);
      const data = res.data;

      if (data.status === 'processing' || data.status === 'pending') {
        startSubscriptionVerification(currentPaymentId);
      } else if (data.authorization_url) {
        Linking.openURL(data.authorization_url);
        startSubscriptionVerification(currentPaymentId);
      } else if (data.status === 'completed') {
        setPayment((prev) => ({ ...prev, step: 'success' }));
        loadData();
      } else {
        setPayment((prev) => ({
          ...prev,
          step: 'failed',
          errorMessage: data.message || 'Le paiement a echoue.',
        }));
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Erreur lors du traitement du paiement.';
      setPayment((prev) => ({
        ...prev,
        step: 'failed',
        errorMessage,
      }));
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler l\'abonnement',
      'Etes-vous sur de vouloir annuler votre abonnement ? Vous passerez au plan gratuit a la fin de la periode en cours.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionsAPI.cancel();
              Alert.alert(
                'Abonnement annule',
                'Votre abonnement sera desactive a la fin de la periode en cours.'
              );
              await loadData();
            } catch (err: any) {
              const errorMessage =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                'Une erreur est survenue.';
              Alert.alert('Erreur', errorMessage);
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
      <SafeAreaView style={[styles.container, { backgroundColor: cardBg }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: surface }]}
            onPress={() => navigation.goBack()}
            activeOpacity={TOUCH_OPACITY}
          >
            <Ionicons name="arrow-back" size={24} color={ink} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: ink }]}>Mon abonnement</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Chargement..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cardBg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={TOUCH_OPACITY}
        >
          <Ionicons name="arrow-back" size={24} color={ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: ink }]}>Mon abonnement</Text>
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
                    {currentPlan?.display_name || (currentPlanName === 'free' ? 'Gratuit' : currentPlanName)}
                  </Text>
                  <View style={[styles.planNameBadge, { backgroundColor: getPlanColor(currentPlanName) + '18' }]}>
                    <Text style={[styles.planNameBadgeText, { color: getPlanColor(currentPlanName) }]}>
                      {currentPlanName === 'free' ? 'Free' : currentPlanName === 'essential' ? 'Essential' : 'Premium'}
                    </Text>
                  </View>
                </View>
                {(() => {
                  const statusInfo = getStatusLabel(subscription?.status);
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
              <Text style={styles.usageLabel}>Evenements actifs</Text>
              <Text style={styles.usageValue}>
                {usedEvents} / {maxEvents === 999 || maxEvents > 100 ? 'illimite' : maxEvents}
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(usageRatio * 100, 2)}%`,
                    backgroundColor: usageRatio > 0.8 ? colors.error : VIOLET,
                  },
                ]}
              />
            </View>
          </View>

          {/* Next billing date */}
          {subscription?.next_billing_date && currentPlanName !== 'free' && (
            <View style={styles.billingDateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
              <Text style={styles.billingDateText}>
                Prochain renouvellement : {formatDate(subscription.next_billing_date)}
              </Text>
            </View>
          )}

          {/* Cancel button for paid plans */}
          {subscription && currentPlanName !== 'free' && subscription.status === 'active' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={TOUCH_OPACITY}
            >
              <Text style={styles.cancelButtonText}>Annuler l'abonnement</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Billing Cycle Toggle */}
        <View style={styles.toggleSection}>
          <Text style={styles.sectionTitle}>Choisir un plan</Text>
          <View style={styles.toggleContainer}>
            <Animated.View
              style={[
                styles.toggleSlider,
                { transform: [{ translateX }] },
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
                  billingCycle === 'monthly' && styles.toggleTextActive,
                ]}
              >
                Mensuel
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
                  billingCycle === 'yearly' && styles.toggleTextActive,
                ]}
              >
                Annuel
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>-20%</Text>
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
                isCurrent && styles.planCardCurrent,
                isPopular && !isCurrent && styles.planCardPopular,
              ]}
            >
              {/* Popular badge */}
              {isPopular && !isCurrent && (
                <View style={styles.popularBadge}>
                  <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" />
                  <Text style={styles.popularBadgeText}>Populaire</Text>
                </View>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={VIOLET} />
                  <Text style={styles.currentBadgeText}>Plan actuel</Text>
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
                  <Text style={styles.planCardName}>{plan.display_name}</Text>
                  <Text style={styles.planCardDescription}>{plan.description}</Text>
                </View>
              </View>

              {/* Price */}
              <View style={styles.planPriceSection}>
                <Text style={styles.planPrice}>{formatPrice(price)}</Text>
                {price > 0 && (
                  <Text style={styles.planPricePeriod}>
                    / {billingCycle === 'monthly' ? 'mois' : 'an'}
                  </Text>
                )}
              </View>

              {/* Features */}
              <View style={styles.planFeatures}>
                {(plan.features || []).map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={planColor} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}

                {/* Visibility level */}
                <View style={styles.featureRow}>
                  <Ionicons name="eye-outline" size={18} color={planColor} />
                  <Text style={styles.featureText}>
                    {plan.name === 'free'
                      ? 'Visibilite standard'
                      : plan.name === 'essential'
                        ? 'Visibilite amelioree'
                        : 'Visibilite maximale + mise en avant'}
                  </Text>
                </View>

                {/* Max events */}
                <View style={styles.featureRow}>
                  <Ionicons name="calendar-outline" size={18} color={planColor} />
                  <Text style={styles.featureText}>
                    {plan.max_active_events > 100
                      ? 'Evenements illimites'
                      : `Jusqu'a ${plan.max_active_events} evenements actifs`}
                  </Text>
                </View>

                {/* Max participants */}
                <View style={styles.featureRow}>
                  <Ionicons name="people-outline" size={18} color={planColor} />
                  <Text style={styles.featureText}>
                    {plan.max_participants_per_event > 10000
                      ? 'Participants illimites'
                      : `Jusqu'a ${plan.max_participants_per_event.toLocaleString('fr-FR')} participants / evenement`}
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
                            <Text style={styles.upgradeButtonText}>Passer a ce plan</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.downgradeButton}
                      onPress={() => handleUpgrade(plan)}
                      activeOpacity={TOUCH_OPACITY}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={colors.gray600} />
                      ) : (
                        <>
                          <Ionicons name="arrow-down-circle-outline" size={20} color={colors.gray600} />
                          <Text style={styles.downgradeButtonText}>Passer a ce plan</Text>
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
        <View style={styles.commissionReminder}>
          <View style={styles.commissionIconCircle}>
            <Ionicons name="information-circle-outline" size={20} color={VIOLET} />
          </View>
          <Text style={styles.commissionText}>
            5% + 100 XAF par billet sur tous les plans
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
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {payment.step === 'select-method' && 'Methode de paiement'}
                {payment.step === 'enter-phone' && 'Numero de telephone'}
                {payment.step === 'processing' && 'Paiement en cours'}
                {payment.step === 'success' && 'Paiement reussi'}
                {payment.step === 'failed' && 'Paiement echoue'}
              </Text>
              {payment.step !== 'processing' && (
                <TouchableOpacity
                  onPress={closePaymentModal}
                  style={styles.modalCloseButton}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="close" size={24} color={colors.gray600} />
                </TouchableOpacity>
              )}
            </View>

            {/* Amount display */}
            {payment.step !== 'success' && payment.step !== 'failed' && (
              <View style={styles.modalAmountRow}>
                <Text style={styles.modalAmountLabel}>
                  {payment.plan?.display_name} - {billingCycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                </Text>
                <Text style={styles.modalAmountValue}>
                  {formatPrice(payment.amount)}
                </Text>
              </View>
            )}

            {/* Step: Select Method */}
            {payment.step === 'select-method' && (
              <View style={styles.methodsContainer}>
                {/* MTN Mobile Money */}
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => handleSelectPaymentMethod('mtn_money')}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <View style={[styles.methodIconCircle, { backgroundColor: '#FFCC00' + '20' }]}>
                    <MaterialCommunityIcons name="cellphone" size={24} color="#FFCC00" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>MTN Mobile Money</Text>
                    <Text style={styles.methodDescription}>Payer avec votre compte MTN MoMo</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                </TouchableOpacity>

                {/* Orange Money */}
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => handleSelectPaymentMethod('orange_money')}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <View style={[styles.methodIconCircle, { backgroundColor: '#FF6600' + '20' }]}>
                    <MaterialCommunityIcons name="cellphone" size={24} color="#FF6600" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Orange Money</Text>
                    <Text style={styles.methodDescription}>Payer avec votre compte Orange Money</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                </TouchableOpacity>

                {/* Credit Card */}
                <TouchableOpacity
                  style={styles.methodCard}
                  onPress={() => handleSelectPaymentMethod('credit_card')}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <View style={[styles.methodIconCircle, { backgroundColor: '#3B82F6' + '20' }]}>
                    <Ionicons name="card-outline" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>Carte bancaire</Text>
                    <Text style={styles.methodDescription}>Visa, Mastercard</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            )}

            {/* Step: Enter Phone */}
            {payment.step === 'enter-phone' && (
              <View style={styles.phoneContainer}>
                <Text style={styles.phoneLabel}>
                  Numero {payment.method === 'mtn_money' ? 'MTN' : 'Orange'}
                </Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+237</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={payment.phone}
                    onChangeText={(text) =>
                      setPayment((prev) => ({ ...prev, phone: text.replace(/[^0-9]/g, '') }))
                    }
                    placeholder="6XX XXX XXX"
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
                      Payer {formatPrice(payment.amount)}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backToMethodsButton}
                  onPress={() => setPayment((prev) => ({ ...prev, step: 'select-method', method: null }))}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.gray600} />
                  <Text style={styles.backToMethodsText}>Changer de methode</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step: Processing */}
            {payment.step === 'processing' && (
              <View style={styles.processingContainer}>
                <LoadingSpinner />
                <Text style={styles.processingTitle}>Traitement en cours...</Text>
                <Text style={styles.processingDescription}>
                  {payment.method === 'credit_card'
                    ? 'Redirection vers la page de paiement securisee...'
                    : 'Veuillez valider le paiement sur votre telephone.'}
                </Text>
                {payment.method && payment.method !== 'credit_card' && (
                  <View style={styles.processingHint}>
                    <Ionicons name="information-circle-outline" size={18} color={VIOLET} />
                    <Text style={styles.processingHintText}>
                      {payment.method === 'mtn_money'
                        ? 'Composez *126# si vous ne recevez pas la notification.'
                        : 'Composez #150*50# si vous ne recevez pas la notification.'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Step: Success */}
            {payment.step === 'success' && (
              <View style={styles.resultContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                </View>
                <Text style={styles.resultTitle}>Paiement reussi !</Text>
                <Text style={styles.resultDescription}>
                  Votre abonnement {payment.plan?.display_name} est maintenant actif.
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
                    <Text style={styles.payButtonText}>Fermer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Step: Failed */}
            {payment.step === 'failed' && (
              <View style={styles.resultContainer}>
                <View style={styles.failedIconCircle}>
                  <Ionicons name="close-circle" size={56} color={colors.error} />
                </View>
                <Text style={styles.resultTitle}>Paiement echoue</Text>
                <Text style={styles.resultDescription}>
                  {payment.errorMessage || 'Une erreur est survenue lors du paiement.'}
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
                    <Text style={styles.payButtonText}>Reessayer</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backToMethodsButton}
                  onPress={closePaymentModal}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Text style={styles.backToMethodsText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
