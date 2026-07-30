import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { subscriptionsAPI, walletAPI } from '../../api';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { getServiceFeeLabel } from '../../constants/payment';
import { WEB_BASE_URL, DEEP_LINK_SCHEME } from '../../constants/urls';
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

// ----------------------------------------------------------------------
// IMPORTANT — Conformite Google Play & App Store
// ----------------------------------------------------------------------
// Les abonnements Essential/Premium sont des services SaaS B2B vendus
// uniquement sur le web (https://eventez.online/dashboard/subscription).
// L'app mobile NE GERE PAS le paiement in-app : ouvrir un flux paiement
// pour ces plans dans l'app declencherait l'obligation Google Play
// Billing (commission 15-30%, et incompatible avec Mobile Money).
//
// Pattern : meme strategie qu'Eventbrite, Slack, Notion, Calendly —
// l'app mobile affiche les plans + sert de "manage subscription"
// vers le web. Le paiement reel se fait dans le navigateur.
//
// Apres paiement reussi, le web redirige vers le deep link
// `eventez://subscription` qui re-ouvre cet ecran et reload les data.
// Le navigateur in-app se ferme automatiquement (openAuthSessionAsync).
// ----------------------------------------------------------------------

const buildSubscriptionWebUrl = (planName?: string, billingCycle?: string): string => {
  const returnUrl = `${DEEP_LINK_SCHEME}://subscription?status=success`;
  const params = new URLSearchParams({
    return_url: returnUrl,
    source: 'mobile',
  });
  if (planName) params.set('plan', planName);
  if (billingCycle) params.set('cycle', billingCycle);
  return `${WEB_BASE_URL}/dashboard/subscription?${params.toString()}`;
};

export default function SubscriptionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const numberLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  // Commission affichee en bas (rappel) : on utilise le pays organisateur
  // (= futur event country puisque mono-devise) pour que l'organisateur
  // voit ses vrais frais de billetterie, pas un default global.
  const [organizerCountry, setOrganizerCountry] = useState<string>('CM');
  const { config: commissionConfig, currency: commissionCurrency } = useCommissionConfig(organizerCountry);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  // Stripe Phase 1+ : si le backend refuse de pricer pour ce pays
  // (country_not_supported / pricing_not_available), on bloque la page
  // abonnement avec un banner clair.
  const [pricingError, setPricingError] = useState<{
    error: 'country_not_supported' | 'pricing_not_available';
    country: string;
    message: string;
  } | null>(null);
  const [planCurrency, setPlanCurrency] = useState('XAF');
  const [subscription, setSubscription] = useState<OrganizerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Animated underline for toggle
  const toggleAnim = useRef(new Animated.Value(0)).current;
  // Largeur RÉELLE du conteneur toggle (mesurée via onLayout), pour que le
  // curseur animé se cale exactement sous l'onglet quelle que soit la largeur
  // d'écran (iPad en mode compat iPhone, rotation…). On NE se base PAS sur un
  // SCREEN_WIDTH figé au chargement du module (→ décalage sur iPad).
  const [toggleTrackWidth, setToggleTrackWidth] = useState(0);
  const toggleItemWidth = toggleTrackWidth > 0 ? (toggleTrackWidth - 8) / 2 : 0;

  useEffect(() => {
    let cancelled = false;
    walletAPI.getMyWallet()
      .then((res: any) => {
        if (cancelled) return;
        const country = (res?.data?.country || '').toUpperCase();
        if (country) setOrganizerCountry(country);
      })
      .catch(() => { /* wallet pas encore cree : on garde CM */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadData();
  }, [organizerCountry]);

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
      const [pricesRes, subRes] = await Promise.allSettled([
        subscriptionsAPI.getPrices(organizerCountry),
        subscriptionsAPI.getCurrentPlan(),
      ]);

      if (pricesRes.status === 'fulfilled') {
        const loadedPlans = pricesRes.value.data.results || pricesRes.value.data || [];
        setPlans(loadedPlans);
        const paidPlan = loadedPlans.find((p: SubscriptionPlan) => p.monthly_price > 0);
        setPlanCurrency(paidPlan?.currency || commissionCurrency || 'XAF');
        setPricingError(null);
      } else {
        // Le backend a refuse de pricer (403) → on stocke l'erreur pour
        // afficher la bannier mobile, on n'ouvre PAS la souscription.
        const err: any = pricesRes.reason;
        const httpStatus = err?.response?.status;
        const data = err?.response?.data;
        if (httpStatus === 403 && (data?.error === 'country_not_supported' || data?.error === 'pricing_not_available')) {
          setPricingError({
            error: data.error,
            country: data.country || organizerCountry,
            message: data.message || '',
          });
          setPlans([]);
        } else {
          if (__DEV__) console.error('Erreur chargement plans:', err);
        }
      }

      if (subRes.status === 'fulfilled' && (subRes.value.data?.plan || subRes.value.data?.plan_details)) {
        setSubscription(subRes.value.data);
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

  // Remise annuelle réelle, calculée depuis les prix (et non figée à -20% dans
  // les traductions, alors que la remise réelle = 2 mois offerts = ~16,7%).
  // Retourne un entier de % ou null si non calculable (plans gratuits/absents).
  const yearlyDiscountPercent: number | null = (() => {
    for (const name of ['essential', 'premium'] as PlanName[]) {
      const p = plans.find((pl) => pl.name === name);
      const monthly = p ? Number(p.monthly_price) : 0;
      const yearly = p ? Number(p.yearly_price) : 0;
      if (monthly > 0 && yearly > 0) {
        const pct = Math.round((1 - yearly / (monthly * 12)) * 100);
        return pct > 0 ? pct : null;
      }
    }
    return null;
  })();

  const isUpgrade = (targetPlan: PlanName): boolean => {
    const currentIdx = planOrder.indexOf(currentPlanName);
    const targetIdx = planOrder.indexOf(targetPlan);
    return targetIdx > currentIdx;
  };

  // Recharge auto si l'utilisateur revient sur l'ecran (focus) — typiquement
  // apres avoir ferme le navigateur web sans declencher le deep link de retour
  // (ex : il a abandonne, ou a paye mais ferme la page avant le redirect).
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizerCountry])
  );

  // Plans payants : la souscription se fait sur le web. On ouvre le navigateur
  // in-app (Custom Tab/SFSafariViewController) et on attend le deep link
  // `eventez://subscription?status=success` qui ferme automatiquement le
  // navigateur et nous ramene ici. Voir buildSubscriptionWebUrl + commentaire
  // en haut du fichier pour le pourquoi (Google Play Billing compliance).
  const openWebSubscription = async (plan: SubscriptionPlan) => {
    const url = buildSubscriptionWebUrl(plan.name, billingCycle);
    const returnUrl = Linking.createURL('/subscription');
    setUpgrading(plan.id);
    try {
      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl, {
        showInRecents: true,
      });
      // result.type :
      //   - 'success' : redirige vers returnUrl (paiement confirme cote web)
      //   - 'cancel'  : utilisateur a ferme le navigateur manuellement
      //   - 'dismiss' : navigateur ferme par le systeme
      if (result.type === 'success') {
        Alert.alert(
          t('subscriptionForm.subscriptionUpdatedTitle'),
          t('subscriptionForm.subscriptionUpdatedMessage', { plan: plan.display_name }),
          [{ text: t('refundRequest.okButton') }]
        );
      }
      // Dans tous les cas on recharge — l'utilisateur a peut-etre paye puis
      // ferme le navigateur sans qu'on capte le redirect.
      await loadData();
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err?.message || t('subscriptionForm.genericChangeError')
      );
    } finally {
      setUpgrading(null);
    }
  };

  // Downgrade vers le plan gratuit : aucun paiement, pas de probleme de
  // policy. On reste in-app pour cette action (UX : pas besoin du web).
  const handleDowngradeToFree = async (plan: SubscriptionPlan) => {
    Alert.alert(
      t('subscriptionForm.confirmChangeTitle'),
      t('subscriptionForm.confirmDowngrade', {
        plan: plan.display_name,
        price: t('subscriptionForm.free'),
        cycle: '',
      }),
      [
        { text: t('subscriptionForm.cancelButton'), style: 'cancel' },
        {
          text: t('refundRequest.confirmButton'),
          onPress: async () => {
            setUpgrading(plan.id);
            try {
              await subscriptionsAPI.upgrade(plan.id, billingCycle);
              Alert.alert(
                t('subscriptionForm.subscriptionUpdatedTitle'),
                t('subscriptionForm.subscriptionUpdatedMessage', { plan: plan.display_name }),
                [{ text: t('refundRequest.okButton') }]
              );
              await loadData();
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

  // Dispatch : plan gratuit → in-app, plan payant → web.
  const handleUpgrade = (plan: SubscriptionPlan) => {
    if (plan.monthly_price === 0 && plan.yearly_price === 0) {
      handleDowngradeToFree(plan);
    } else {
      openWebSubscription(plan);
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
    outputRange: [4, toggleItemWidth + 4],
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
        {/* Stripe Phase 1+ : bannier si le pays organisateur n'est pas
            couvert ou n'a pas de tarif seede. On masque les plans payants. */}
        {pricingError && (
          <View
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              padding: 14, marginBottom: 16, borderRadius: 14,
              backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D',
            }}
          >
            <Ionicons name="alert-circle" size={22} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#78350F', marginBottom: 4 }}>
                {pricingError.error === 'country_not_supported'
                  ? t('subscription.unsupportedCountryTitle', {
                      defaultValue: `Pays non couvert (${pricingError.country})`,
                      country: pricingError.country,
                    })
                  : t('subscription.pricingUnavailableTitle', {
                      defaultValue: `Tarif indisponible pour ${pricingError.country}`,
                      country: pricingError.country,
                    })}
              </Text>
              <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 17 }}>
                {pricingError.message
                  || (pricingError.error === 'country_not_supported'
                    ? t('subscription.unsupportedCountryBody', {
                        defaultValue: `EventEz n'opere pas (encore) dans ${pricingError.country}. La souscription a un forfait y est indisponible.`,
                      })
                    : t('subscription.pricingUnavailableBody', {
                        defaultValue: `Les forfaits ne sont pas encore tarifes pour ${pricingError.country}. Contactez le support pour activer votre marche.`,
                      }))}
              </Text>
            </View>
          </View>
        )}

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
          <View
            style={[styles.toggleContainer, { backgroundColor: surface }]}
            onLayout={(e) => setToggleTrackWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View
              style={[
                styles.toggleSlider,
                { width: toggleItemWidth, backgroundColor: cardBg, transform: [{ translateX }] },
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
              {yearlyDiscountPercent !== null && (
                <View style={[styles.saveBadge, { backgroundColor: violet + '18' }]}>
                  <Text style={[styles.saveBadgeText, { color: violet }]}>-{yearlyDiscountPercent}%</Text>
                </View>
              )}
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

              {/* Action button — paid plans open the web (Play Billing compliance),
                  free plan downgrade stays in-app (no payment). */}
              {!isCurrent && (() => {
                const isPaidPlan = plan.monthly_price > 0 || plan.yearly_price > 0;
                return (
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
                              <Ionicons
                                name={isPaidPlan ? 'open-outline' : 'arrow-up-circle-outline'}
                                size={20}
                                color="#FFFFFF"
                              />
                              <Text style={styles.upgradeButtonText}>
                                {isPaidPlan
                                  ? t('subscriptionForm.subscribeOnWeb', { defaultValue: 'Souscrire sur le web' })
                                  : t('subscriptionForm.switchToPlan')}
                              </Text>
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
                            <Ionicons
                              name={isPaidPlan ? 'open-outline' : 'arrow-down-circle-outline'}
                              size={20}
                              color={colors.gray600}
                            />
                            <Text style={[styles.downgradeButtonText, { color: colors.gray600 }]}>
                              {isPaidPlan
                                ? t('subscriptionForm.manageOnWeb', { defaultValue: 'Gerer sur le web' })
                                : t('subscriptionForm.switchToPlan')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          );
        })}

        {/* Web subscription notice — pourquoi le paiement passe par le web */}
        <View style={[styles.webNotice, { backgroundColor: violet + '0A', borderColor: violet + '20' }]}>
          <View style={[styles.commissionIconCircle, { backgroundColor: violet + '15' }]}>
            <Ionicons name="globe-outline" size={20} color={violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.webNoticeTitle, { color: ink }]}>
              {t('subscriptionForm.webNoticeTitle', { defaultValue: 'Souscription securisee sur le web' })}
            </Text>
            <Text style={[styles.commissionText, { color: colors.gray600, marginTop: 2 }]}>
              {t('subscriptionForm.webNoticeBody', {
                defaultValue:
                  "L'abonnement s'active sur eventez.online avec tous vos moyens de paiement (Mobile Money, carte). Vous serez ramene automatiquement dans l'app a la fin.",
              })}
            </Text>
          </View>
        </View>

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
    // width appliqué inline (réactif via onLayout) — pas ici.
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

  // ===== Web Subscription Notice =====
  webNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
  },
  webNoticeTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },

  // ===== Commission Reminder =====
  commissionReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VIOLET + '08',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
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
