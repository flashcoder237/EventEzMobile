import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialCanvas, WatermarkNumeral, EditorialButton } from '../../components/ui/editorial';
import {
  TourTarget,
  useTour,
  getPaymentTourSteps,
  PAYMENT_TOUR_STORAGE_KEY,
  PAYMENT_TOUR_DELAY_MS,
} from '../../components/tour';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';

import { registrationsAPI, paymentsAPI } from '../../api';
import { Registration, RootStackParamList, CountryPaymentConfig, PaymentMethodOption as APIPaymentMethodOption } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { useNetworkSpeed } from '../../hooks/useNetworkSpeed';
import { calculateServiceFee, getServiceFeeLabel } from '../../constants/payment';
import { DEEP_LINK_SCHEME } from '../../constants/urls';
import ConvertedPrice from '../../components/common/ConvertedPrice';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSavedPaymentMethods, SavedPaymentMethod, maskPhoneNumber, PaymentMethodType } from '../../hooks';
import {
  usePaymentVerification,
  isPaymentSuccess,
  isPaymentFailed,
  PAYMENT_STATUS,
} from '../../hooks/usePaymentVerification';
import {
  Colors,
  FontSizes,
  FontFamily,
  TextStyles,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { extractErrorMessage } from '../../constants/payment';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import GradientButton from '../../components/ui/GradientButton';
import CountryBadgeSelector, {
  SUPPORTED_COUNTRIES,
  INTL_CODE,
  getEventCurrency,
} from '../../components/payment/CountryBadgeSelector';
import FXIndicator from '../../components/payment/FXIndicator';
import { formatPhoneInput, formatPhoneForDisplay, preparePhoneForInput } from '../../lib/utils/phoneFormatters';
import { displayCurrency } from '../../lib/utils/priceFormatters';
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from '../../lib/utils/paymentIdempotency';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPPORTED_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));
const PAYER_COUNTRY_STORAGE_KEY = 'eventez:payer_country';

// Import des icones de paiement. Les nouvelles methodes CinetPay
// (moov_money / free_money / yas / cinetpay_wallet) n'ont pas de PNG
// dans assets/payments/ ; sans entree ici, le selecteur affiche un disque
// colore avec l'initiale. Ajouter les PNG quand dispo.
const PaymentIcons: Record<string, ImageSource> = {
  mtn_money: require('../../../assets/payments/momo.png'),
  orange_money: require('../../../assets/payments/om.png'),
  credit_card: require('../../../assets/payments/bank.png'),
  wave: require('../../../assets/payments/wave.png'),
  mpesa: require('../../../assets/payments/M-pesa-logo.png'),
  airtel_money: require('../../../assets/payments/airtel.png'),
  paypal: require('../../../assets/payments/PayPal_Logo.png'),
};

// Couleurs par methode de paiement
const METHOD_COLORS: Record<string, string> = {
  mtn_money: '#FFCC00',
  orange_money: '#FF6600',
  credit_card: '#1A1F71',
  wave: '#1DA1F2',
  mpesa: '#4CAF50',
  airtel_money: '#E53935',
  paypal: '#003087',
  // CinetPay-specifiques
  moov_money: '#0EA5E9',          // Moov bleu cyan
  free_money: '#10B981',          // Free Money SN
  yas: '#C026D3',                 // T-Money / Yas
  cinetpay_wallet: '#6D28D9',     // CinetPay violet
};

// Mapping methode -> cle i18n pour la description (toutes traduites FR + EN
// dans src/i18n/locales/). Fallback : `payment.paymentMethodFallbackDescription`.
const METHOD_DESCRIPTION_KEYS: Record<string, string> = {
  mtn_money: 'payment.paymentMTNDescription',
  orange_money: 'payment.paymentOrangeDescription',
  credit_card: 'payment.paymentCardDescription',
  wave: 'payment.paymentWaveDescription',
  mpesa: 'payment.paymentMPesaDescription',
  airtel_money: 'payment.paymentAirtelDescription',
  paypal: 'payment.paymentPayPalDescription',
  bank_transfer: 'payment.paymentBankTransferDescription',
  // CinetPay-specifiques
  moov_money: 'payment.paymentMoovMoneyDescription',
  free_money: 'payment.paymentFreeMoneyDescription',
  yas: 'payment.paymentYasDescription',
  cinetpay_wallet: 'payment.paymentCinetPayWalletDescription',
};

// Methodes de type mobile money (etend avec les nouveautes CinetPay)
const MOBILE_MONEY_METHODS = new Set([
  'mtn_money', 'orange_money', 'wave', 'mpesa', 'airtel_money',
  'moov_money', 'free_money', 'yas',
]);

// Methodes qui utilisent une redirection navigateur (pas de saisie telephone) :
// - NotchPay : credit_card + paypal (page hebergee)
// - CinetPay : credit_card + cinetpay_wallet (page hebergee)
// Note : les Mobile Money via CinetPay passent aussi par redirect (la page
// CinetPay capture phone+PIN). Ce flag est defini dynamiquement dans le
// submit handler en fonction du selected_provider renvoye par /payments/methods/.
const REDIRECT_METHODS = new Set([
  'credit_card', 'paypal', 'cinetpay_wallet',
]);

// Methodes specifiques a CinetPay (selected_provider est toujours 'cinetpay'
// independamment de la config admin). Le submit handler force la branche
// CinetPay (POST /api/payments/initiate/ + WebBrowser).
const CINETPAY_ONLY_METHODS = new Set([
  'moov_money', 'free_money', 'yas', 'cinetpay_wallet',
]);

// Map locale -> code pays (afficher les methodes du payeur)
const LOCALE_TO_COUNTRY: Record<string, string> = {
  // Pays NotchPay
  'fr-CM': 'CM', 'en-CM': 'CM',
  'fr-CI': 'CI',
  'fr-SN': 'SN',
  'sw-KE': 'KE', 'en-KE': 'KE',
  'en-GH': 'GH',
  'en-UG': 'UG', 'sw-UG': 'UG',
  // Pays CinetPay-only
  'fr-BF': 'BF',
  'fr-ML': 'ML',
  'fr-TG': 'TG',
  'fr-BJ': 'BJ',
  'fr-NE': 'NE',
  'fr-CD': 'CD', 'sw-CD': 'CD',
  'fr-GN': 'GN',
};

const KNOWN_COUNTRIES = ['CM', 'CI', 'SN', 'KE', 'GH', 'UG', 'BF', 'ML', 'TG', 'BJ', 'NE', 'CD', 'GN'] as const;

function detectUserCountry(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (LOCALE_TO_COUNTRY[locale]) return LOCALE_TO_COUNTRY[locale];
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const countryPart = parts[parts.length - 1].toUpperCase();
      if ((KNOWN_COUNTRIES as readonly string[]).includes(countryPart)) return countryPart;
    }
    return null;
  } catch {
    return null;
  }
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

// Visual progress bar while we poll for the payment status (up to ~3 min)
function PollingProgressBar({
  primaryColor,
  trackColor,
  attempt,
  maxAttempts,
}: {
  primaryColor: string;
  trackColor: string;
  attempt: number;
  maxAttempts: number;
}) {
  const { t } = useTranslation();
  const POLL_DURATION_SECONDS = 180; // 36 attempts × 5s (default config)
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.min(POLL_DURATION_SECONDS, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const attemptProgress = maxAttempts > 0 ? attempt / maxAttempts : 0;
  const timeProgress = elapsed / POLL_DURATION_SECONDS;
  const progress = Math.min(1, Math.max(attemptProgress, timeProgress));
  return (
    <>
      <View style={[styles.pollingProgressTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.pollingProgressFill,
            { width: `${progress * 100}%`, backgroundColor: primaryColor },
          ]}
        />
      </View>
      <Text style={[styles.pollingProgressLabel, { color: '#888' }]}>
        {t('payment.paymentPollingLabel', { seconds: elapsed })}
        {attempt > 0 ? t('payment.paymentPollingAttempt', { current: attempt, total: maxAttempts }) : ''}
      </Text>
    </>
  );
}

// Les valeurs doivent correspondre aux choix backend (multi-pays)
type PaymentMethodId = 'mtn_money' | 'orange_money' | 'credit_card' | 'paypal' | 'wave' | 'mpesa' | 'airtel_money';

interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  icon: ImageSource;
  color: string;
  description: string;
  channel?: string;
  type?: string;
  /** Plafond par transaction ou null si pas de limite. */
  maxAmount?: number | null;
  /** Passerelle qui traitera ce paiement (parite admin → user pour
      transparence). Lue depuis `selected_provider` du backend. */
  provider?: 'notchpay' | 'cinetpay' | 'stripe' | null;
}

function formatMoney(amount: number, currency: string): string {
  const isZeroDecimal = currency === 'XAF' || currency === 'XOF' || currency === 'UGX';
  try {
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

// Pas de liste statique de repli : un fallback Cameroun (MTN/Orange) afficherait
// des MoMo incompatibles avec la devise de l'event (ex : Orange CM pour un event
// UGX). En cas d'echec API → liste vide + bandeau d'erreur avec retry.

export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { registrationId, newTickets, totalAmount } = route.params;
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isSlowCellular, isOffline } = useNetworkSpeed();
  const biometric = useBiometricConfirm();

  // Mode billets supplémentaires: on a des newTickets passés en params
  const isAdditionalTicketsMode = !!(newTickets && newTickets.length > 0);

  const tour = useTour();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [verifyingManually, setVerifyingManually] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [countryConfig, setCountryConfig] = useState<CountryPaymentConfig | null>(null);
  const [dynamicMethods, setDynamicMethods] = useState<PaymentMethodOption[]>([]);
  // Drapeau d'échec du fetch des méthodes → bandeau d'erreur tappable (retry).
  const [methodsFetchFailed, setMethodsFetchFailed] = useState(false);
  // Compteur de retry : incrémenté par le bandeau d'erreur pour relancer le fetch.
  const [methodsRetry, setMethodsRetry] = useState(0);
  // Loader pendant le refetch sur changement de pays — sinon les anciennes
  // methodes restent affichees jusqu'au swap brutal.
  const [methodsLoading, setMethodsLoading] = useState(false);

  // Payment tour fires once methods are loaded — targets the first method
  // card and the bottom pay CTA. Skip while processing/cancelling because
  // the form (including both targets) is swapped out for a status screen.
  useFocusEffect(useCallback(() => {
    if (loading || methodsLoading || dynamicMethods.length === 0) return;
    if (processing || cancelling) return;
    const timer = setTimeout(() => {
      if (tour.isActive) return;
      tour.start(getPaymentTourSteps(t), { seenKey: PAYMENT_TOUR_STORAGE_KEY });
    }, PAYMENT_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, methodsLoading, dynamicMethods.length, processing, cancelling]));
  // Pays du payeur : choix manuel (AsyncStorage) > locale device > pays événement
  const [payerCountry, setPayerCountry] = useState<string>(() => {
    const detected = detectUserCountry();
    return detected || 'CM';
  });
  // Flag : on sait si l'utilisateur a explicitement choisi (pour ne pas laisser
  // l'événement écraser son choix lorsque registration est chargée)
  const [countryHydrated, setCountryHydrated] = useState(false);
  // Préremplir avec le numéro de téléphone de l'utilisateur (sans le préfixe 237)
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const userPhone = user?.phone || user?.phone_number || '';
    return preparePhoneForInput(userPhone, '237');
  });
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<SavedPaymentMethod | null>(null);

  // Hook for saved payment methods
  const {
    savedMethods,
    hasSavedMethods,
    savePaymentMethod,
    getMethodsByType,
    markAsUsed,
  } = useSavedPaymentMethods();

  // Helper to save payment method on success
  const savePaymentMethodOnSuccess = useCallback(() => {
    if (selectedMethod && !REDIRECT_METHODS.has(selectedMethod) && phoneNumber) {
      const cleanNumber = phoneNumber.replace(/[\s\-\.\(\)]/g, '');
      // REDIRECT_METHODS filtre 'paypal' → selectedMethod est ici un PaymentMethodType.
      savePaymentMethod(cleanNumber, selectedMethod as PaymentMethodType);
      if (selectedSavedMethod) {
        markAsUsed(selectedSavedMethod.id);
      }
    }
  }, [selectedMethod, phoneNumber, selectedSavedMethod, savePaymentMethod, markAsUsed]);

  // Shared payment verification hook
  const {
    isVerifying: isPolling,
    currentAttempt: pollingAttempt,
    maxAttempts: pollingMaxAttempts,
    startVerification,
    stopVerification,
    manualVerify,
  } = usePaymentVerification({
    pollInterval: 5000,
    maxAttempts: 36,
    maxConsecutiveErrors: 10,
    progressiveBackoff: true,
    detectTemporaryErrors: true,
    onSuccess: (data) => {
      setProcessing(false);
      savePaymentMethodOnSuccess();
      // Statut terminal → on libère la clé d'idempotence (un futur paiement
      // sur la même registration aura besoin d'une nouvelle clé).
      void clearIdempotencyKey(registrationId);

      const eventObj = registration?.event_detail
        || (typeof registration?.event === 'object' ? registration.event : null);
      navigation.replace('PaymentSuccess', {
        paymentId: paymentId!,
        registrationId: registrationId,
        eventId: eventObj?.id,
        eventType: eventObj?.event_type || registration?.registration_type,
        registrationStatus: registration?.status,
        approvalStatus: registration?.approval_status,
        eventTitle: eventObj?.title,
        eventStartDate: (eventObj as any)?.start_date,
        amount: finalTotal,
        currency: eventCurrencyLabel,
        referenceCode: (registration as any)?.reference_code,
      });
    },
    onFailure: (errorMessage, data) => {
      setProcessing(false);
      // Statut terminal → on libère la clé d'idempotence.
      void clearIdempotencyKey(registrationId);
      navigation.replace('PaymentFailed', {
        paymentId: paymentId!,
        error: errorMessage,
      });
    },
    onTimeout: (lastStatus) => {
      setProcessing(false);
      showAlert(
        t('payment.paymentTimeoutSimpleTitle'),
        t('payment.paymentTimeoutMessage'),
        [
          {
            text: t('payment.paymentAlreadyPaid'),
            onPress: () => {
              setProcessing(true);
              handleAlreadyPaid();
            },
          },
          {
            text: t('payment.paymentRetry'),
            onPress: () => {
              setProcessing(true);
              if (paymentId) startVerification(paymentId);
            },
          },
          { text: t('common.cancel'), onPress: cancelPayment },
        ]
      );
    },
    onMaxErrors: (_lastError) => {
      setProcessing(false);
      showAlert(
        t('payment.paymentVerifyInterruptedSimpleTitle'),
        t('payment.paymentVerifyMaxErrorsMessage'),
        [
          {
            text: t('payment.paymentAlreadyPaid'),
            onPress: () => {
              setProcessing(true);
              handleAlreadyPaid();
            },
          },
          {
            text: t('payment.paymentRetry'),
            onPress: () => {
              setProcessing(true);
              if (paymentId) startVerification(paymentId);
            },
          },
          {
            text: t('payment.paymentViewTickets'),
            onPress: () => navigation.navigate('Main', { screen: 'MyTickets' } as any),
          },
        ]
      );
    },
  });

  useEffect(() => {
    fetchRegistration();
  }, [registrationId]);

  // Cleanup: arrêter le polling de vérification si l'utilisateur quitte l'écran
  useEffect(() => {
    return () => {
      stopVerification();
    };
  }, []);

  // Hydrate le choix de pays depuis AsyncStorage (si déjà persisté) au mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PAYER_COUNTRY_STORAGE_KEY);
        if (saved && SUPPORTED_CODES.has(saved.toUpperCase())) {
          setPayerCountry(saved.toUpperCase());
        }
      } catch {
        // ignore
      } finally {
        setCountryHydrated(true);
      }
    })();
  }, []);

  // payerCountry représente le PAYS DU PAYEUR (pas celui de l'event). Source :
  //   1. AsyncStorage (choix manuel persisté) — gagne toujours
  //   2. Locale device (détectée au mount)
  //   3. Fallback 'CM'
  //
  // ⚠️ Ne PLUS forcer payerCountry = eventCountry. Le payeur peut être dans
  // un pays différent de l'event (ex : Sénégalais paie event ivoirien en XOF
  // via Wave SN). Le backend gère désormais le routage cross-pays via les
  // params séparés `country` (payeur) + `event_country`.
  //
  // Cf. docs/PSP_IMPLEMENTATION_STATUS.md (gaps G1, G2, G3).
  const manualCountryChoiceRef = useRef(false);

  // Callback pour changer le pays depuis la UI
  const handleCountryChange = useCallback(async (code: string) => {
    const upper = code.toUpperCase();
    if (!SUPPORTED_CODES.has(upper)) return;
    manualCountryChoiceRef.current = true;
    setPayerCountry(upper);
    setSelectedMethod(null);
    setSelectedSavedMethod(null);
    setPhoneNumber('');
    try {
      await AsyncStorage.setItem(PAYER_COUNTRY_STORAGE_KEY, upper);
    } catch {
      // ignore
    }
  }, []);

  // Fetch les méthodes de paiement.
  //
  // Sémantique (mai 2026) :
  // - `country` envoyé = pays du PAYEUR (= payerCountry)
  // - `event_country` envoyé = pays de l'EVENT (= eventCountry)
  // - `currency` envoyé = devise event
  //
  // Backend renvoie :
  // - Méthodes Mobile Money du payeur, FILTRÉES par compatibilité de devise
  //   avec l'event (MoMo XOF apparaissent si event est en XOF, sinon non).
  // - Carte + PayPal via Stripe en fallback automatique si la devise event
  //   est supportée par Stripe (135+ devises).
  //
  // Ainsi un Sénégalais voit Wave SN pour un event ivoirien (XOF), et un
  // Français voit Carte pour un event camerounais (XAF→EUR via Stripe).
  useEffect(() => {
    if (!countryHydrated) return;
    let cancelled = false;
    const fetchPaymentMethods = async () => {
      setMethodsLoading(true);
      setSelectedMethod(null);
      setDynamicMethods([]);
      try {
        const eventObj = registration?.event_detail
          || (registration && typeof registration.event === 'object' ? registration.event : null);
        const eventCountry = (eventObj?.location_country_code || eventObj?.location_country || '').toString().toUpperCase();
        // Devise réelle de l'event (event.currency = devise du wallet de
        // l'organisateur, source de vérité mono-devise). On ne la dérive PAS
        // du pays de l'event : il peut différer du pays de l'organisateur.
        const eventCurrency = (
          eventObj?.currency || getEventCurrency(eventCountry) || ''
        ).toString().toUpperCase();

        const response = await paymentsAPI.getPaymentMethods(
          payerCountry,         // pays du payeur (ne plus écraser par eventCountry)
          eventCurrency,        // devise event
          eventCountry || undefined,  // pays event (NOUVEAU param)
        );
        if (cancelled) return;
        const config: CountryPaymentConfig = response.data;
        setCountryConfig(config);

        if (config.methods && config.methods.length > 0) {
          const methods: PaymentMethodOption[] = config.methods.map((m: APIPaymentMethodOption) => {
            const descKey = METHOD_DESCRIPTION_KEYS[m.id];
            const description = descKey
              ? t(descKey)
              : t('payment.paymentMethodFallbackDescription', { name: m.name });
            return {
              id: m.id as PaymentMethodId,
              name: m.name,
              icon: PaymentIcons[m.id] || PaymentIcons.credit_card,
              color: METHOD_COLORS[m.id] || '#666666',
              description,
              channel: m.channel,
              type: m.type,
              maxAmount: m.max_amount != null ? Number(m.max_amount) : null,
              provider: (m as any).selected_provider ?? null,
            };
          });
          setDynamicMethods(methods);
          setMethodsFetchFailed(false);
        }
      } catch (error) {
        if (cancelled) return;
        if (__DEV__) console.error('[Payment] Error fetching payment methods:', error);
        // Pas de fallback en dur : une liste de MoMo camerounais proposerait
        // des méthodes incompatibles avec la devise de l'event. Liste vide +
        // bandeau d'erreur tappable pour réessayer.
        showError(
          t('payment.paymentMethodsLoadError'),
          t('payment.paymentMethodsLoadErrorMessage')
        );
        setDynamicMethods([]);
        setMethodsFetchFailed(true);
      } finally {
        if (!cancelled) setMethodsLoading(false);
      }
    };

    fetchPaymentMethods();
    return () => {
      cancelled = true;
    };
  }, [payerCountry, countryHydrated, registration, methodsRetry]);

  // Auto-select last used payment method for the selected type
  useEffect(() => {
    if (selectedMethod && !REDIRECT_METHODS.has(selectedMethod)) {
      const methodsOfType = getMethodsByType(selectedMethod as PaymentMethodType);
      if (methodsOfType.length > 0 && !selectedSavedMethod) {
        // Don't auto-select, but keep for display
      }
    }
    // Reset saved method selection when changing payment type
    setSelectedSavedMethod(null);
  }, [selectedMethod]);

  // Fill phone number when selecting a saved method
  useEffect(() => {
    if (selectedSavedMethod) {
      setPhoneNumber(formatPhoneForDisplay(selectedSavedMethod.phoneNumber));
    }
  }, [selectedSavedMethod]);

  const fetchRegistration = async () => {
    try {
      const response = await registrationsAPI.getRegistration(registrationId);
      setRegistration(response.data);
    } catch (error) {
      if (__DEV__) console.error('Error fetching registration:', error);
      showError(t('common.error'), t('payment.paymentLoadingDetailsError'));
    } finally {
      setLoading(false);
    }
  };

  // Obtenir les billets à afficher (nouveaux ou tous)
  const getTicketsToDisplay = () => {
    if (isAdditionalTicketsMode && newTickets) {
      return newTickets;
    }
    return registration?.tickets || [];
  };

  const calculateSubtotal = () => {
    // Si on a un montant total passé en param (mode billets supplémentaires)
    if (isAdditionalTicketsMode && totalAmount !== undefined) {
      return totalAmount;
    }

    // Sinon calculer depuis les billets
    const tickets = getTicketsToDisplay();
    if (!tickets || tickets.length === 0) return 0;

    return tickets.reduce((total, ticket: any) => {
      // Convert to number to avoid string concatenation (backend may return Decimal as string)
      const ticketPrice = Number(ticket.total_price) || (Number(ticket.unit_price) || 0) * (Number(ticket.quantity) || 1);
      return total + ticketPrice;
    }, 0);
  };

  // Commission config dynamique par pays. Le backend RegistrationSerializer
  // expose `event` comme UUID (FK) ET `event_detail` comme objet complet.
  // On lit event_detail en priorite — sinon `currency` retombe sur 'XAF' par
  // defaut et l'UI affiche FCFA pour un event EUR.
  const eventObj = registration?.event_detail
    || (typeof registration?.event === 'object' ? registration?.event : null);
  const eventCountryCode = (eventObj as any)?.location_country_code || (eventObj as any)?.location_country || 'CM';

  // Strategie "Event mono-devise" (docs/CURRENCY_STRATEGY.md) :
  // la devise d'affichage vient de l'evenement, PAS du pays du payeur.
  const eventCurrencyCode = ((eventObj as any)?.currency || 'XAF').toUpperCase();
  const eventCurrencyLabel = displayCurrency(eventCurrencyCode);

  // Passe event.currency au backend pour qu'il convertisse fixed_fee dans
  // la devise event si la commission du pays event est dans une autre
  // devise (cas fallback default). Garantit que le label "5% + X EUR"
  // affiche bien X en EUR plutot que mixage de devises silencieux.
  const { config: commissionConfig } = useCommissionConfig(
    eventCountryCode,
    eventCurrencyCode,
  );

  const subtotal = calculateSubtotal();
  const feeBearer = (eventObj as any)?.fee_bearer || 'participant';
  // Passe eventCurrencyCode pour rejeter le fixed_fee si commissionConfig
  // n'est pas dans la meme devise que l'event (cas fallback backend).
  const serviceFee = feeBearer === 'organizer' ? 0 : calculateServiceFee(subtotal, commissionConfig, eventCurrencyCode);
  const serviceFeeLabel = getServiceFeeLabel(commissionConfig, eventCurrencyCode);
  const finalTotal = Math.round((subtotal + serviceFee) * 100) / 100;

  // Debug: vérifier que la commission est calculée
  if (__DEV__) console.log('[Payment] Commission debug:', {
    subtotal,
    serviceFee,
    finalTotal,
    commissionConfig: commissionConfig ? {
      rate: commissionConfig.commission_rate,
      fixed: commissionConfig.fixed_fee,
      currency: commissionConfig.currency,
    } : 'null (using defaults: 5% + 100)',
    eventCountryCode,
  });

  const validatePhoneNumber = (method: PaymentMethodId): { valid: boolean; formatted?: string } => {
    if (REDIRECT_METHODS.has(method)) return { valid: true };
    if (!MOBILE_MONEY_METHODS.has(method)) return { valid: true };

    const cleanNumber = phoneNumber.replace(/[\s\-\.\(\)]/g, '');
    const expectedDigits = countryConfig?.phone_digits || 9;
    const prefixDigits = (countryConfig?.phone_prefix || '+237').replace('+', '');

    // Supprimer le préfixe pays s'il est présent pour la validation
    const numberWithoutPrefix = cleanNumber.startsWith(prefixDigits)
      ? cleanNumber.slice(prefixDigits.length)
      : cleanNumber;

    if (numberWithoutPrefix.length !== expectedDigits) {
      showError(t('payment.paymentInvalidPhone'), t('payment.paymentInvalidPhoneDetail', { count: expectedDigits }));
      return { valid: false };
    }

    // Validation stricte seulement pour le Cameroun (on a les patterns connus)
    if (countryConfig?.country_code === 'CM' || !countryConfig) {
      if (method === 'mtn_money') {
        // CM : MTN = 67x, 680-684, 650-654 (685-689 appartient a Orange).
        if (!numberWithoutPrefix.match(/^(67\d|68[0-4]|65[0-4])\d{6}$/)) {
          showError(
            t('payment.paymentInvalidMTN'),
            t('payment.paymentMTNValidationHint')
          );
          return { valid: false };
        }
      }
      if (method === 'orange_money') {
        // CM : Orange = 69x, 685-689, 655-659.
        if (!numberWithoutPrefix.match(/^(65[5-9]|68[5-9]|69\d)\d{6}$/)) {
          showError(
            t('payment.paymentInvalidOrange'),
            t('payment.paymentOrangeValidationHint')
          );
          return { valid: false };
        }
      }
    }

    // Retourner le numéro formaté avec l'indicatif pays
    return { valid: true, formatted: `${prefixDigits}${numberWithoutPrefix}` };
  };

  const handlePayment = async () => {
    // Protection contre double soumission
    if (processing) {
      if (__DEV__) console.log('[Payment] Soumission ignorée - déjà en cours');
      return;
    }

    if (!selectedMethod) {
      showError(t('common.error'), t('payment.paymentSelectMethodError'));
      return;
    }

    // Detection precoce du provider : CinetPay capture le telephone sur sa
    // page hebergee, donc on saute la validation locale (sinon on bloquerait
    // l'utilisateur qui n'a pas tape son numero dans notre form).
    const earlyMethodConfig = dynamicMethods.find((m) => m.id === selectedMethod);
    const earlyIsCinetPay =
      (earlyMethodConfig as any)?.selected_provider === 'cinetpay'
      || CINETPAY_ONLY_METHODS.has(selectedMethod);

    // Validation du numero de telephone pour Mobile Money via NotchPay uniquement
    let formattedPhone = '';
    if (!earlyIsCinetPay) {
      const validation = validatePhoneNumber(selectedMethod);
      if (!validation.valid) {
        return;
      }
      formattedPhone = validation.formatted || '';
    }

    // Confirmation biométrique avant d'initier le paiement (catégorie payments).
    // Posé AVANT setProcessing pour ne pas bloquer le bouton si l'user annule.
    // Le 3DS / OTP du gateway viendra par-dessus pour les paiements carte.
    const confirmed = await biometric.confirm({
      promptMessage: `Confirmer le paiement de ${finalTotal.toLocaleString()} ${eventCurrencyCode}`,
      category: 'payments',
    });
    if (!confirmed) return;

    setProcessing(true);

    try {
      // Valider l'email (requis par le backend)
      const userEmail = user?.email;
      if (!userEmail) {
        throw new Error(t('payment.errorEmailMissing'));
      }

      // ===== Branche /api/payments/initiate/ unifie =====
      // CinetPay ET Stripe utilisent le meme flow : un seul POST qui cree le
      // Payment + initie chez le PSP, retourne payment_url, puis WebBrowser.
      // NotchPay garde son flow historique (createPayment + initialize) en
      // dessous pour la compat retro (Mobile Money native + redirect carte).
      //
      // Bug fix mai 2026 : avant ce cond, les events Stripe (FR/DE/US/EUR/USD)
      // tombaient sur le flow NotchPay legacy qui rejetait avec 400
      // "notchpay_unsupported". Cf. log payeur DE/EUR.
      const methodConfig = dynamicMethods.find((m) => m.id === selectedMethod);
      const selectedProvider = (methodConfig as any)?.selected_provider;

      // Devise event = source de verite. Si elle n'est PAS dans l'allowlist
      // NotchPay, le flow NotchPay legacy plantera systematiquement avec 400.
      // On force donc le flow unifie (qui route via PaymentProviderFactory cote
      // backend, donc bien vers Stripe/CinetPay).
      const NOTCHPAY_CURRENCIES = new Set(['XAF', 'XOF', 'KES', 'GHS', 'UGX', 'NGN']);
      const eventCurrencyNotInNotchpay = !NOTCHPAY_CURRENCIES.has(eventCurrencyCode);

      const useUnifiedInitiate =
        selectedProvider === 'cinetpay'
        || selectedProvider === 'stripe'
        || CINETPAY_ONLY_METHODS.has(selectedMethod)
        // Fallback safety : si la devise event n'est pas dans NotchPay, le
        // legacy flow est garanti de planter → on bascule sur /initiate/.
        || eventCurrencyNotInNotchpay;

      if (useUnifiedInitiate) {
        const initiateResponse = await paymentsAPI.initiate({
          registration_id: registrationId,
          payment_method: selectedMethod,
          billing_email: userEmail,
          billing_phone: formattedPhone,
          // Pays du PAYEUR (≠ pays event). Permet au backend de router
          // vers le channel CinetPay local du payeur (ex: OMSN pour un
          // Sénégalais qui paie un event ivoirien).
          payer_country: payerCountry,
        });
        const payload = initiateResponse.data;
        if (!payload?.success || !payload?.payment_url) {
          throw new Error(payload?.message || t('payment.paymentURLNotReceived'));
        }
        const cinetpayPaymentId = payload.payment_id as string;
        // transaction_id EventEz envoye a CinetPay = str(payment.id). On le
        // persiste pour pouvoir interroger /payments/cinetpay/return/ apres
        // le retour de WebBrowser (lecture rapide vs polling complet).
        const cinetpayTxnId = (payload.transaction_id as string) || cinetpayPaymentId;
        setPaymentId(cinetpayPaymentId);

        // openAuthSessionAsync : ouvre le navigateur et ATTEND le redirect vers
        // `eventez://payment-success/{id}`. Quand la page web /payment/callback/{id}
        // detecte ?source=mobile, elle execute window.location.href = ce deep link
        // → la session se ferme automatiquement et on reprend le controle ici.
        // Si le redirect ne survient pas (vieux web), result.type === 'cancel'
        // ou 'dismiss' → fallback comportement actuel (alerte + polling).
        const returnUrl = `${DEEP_LINK_SCHEME}://payment-success/${cinetpayPaymentId}`;
        const result = await WebBrowser.openAuthSessionAsync(payload.payment_url, returnUrl, {
          dismissButtonStyle: 'close',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: colors.primary,
          controlsColor: Colors.white,
        });

        // Apres fermeture du WebBrowser (dismiss OU succes), on tente UNE lecture
        // rapide via /payments/cinetpay/return/?transaction_id=... pour avoir un
        // statut "frais" avant de retomber sur le polling complet. Le backend
        // lit juste le Payment en DB (pas d'appel CinetPay) donc c'est tres
        // rapide. Le webhook fait foi pour la transition pending → completed.
        //
        // Specifique CinetPay : Stripe a son propre webhook qui met Payment.status
        // a `completed` via le serveur — le polling /verify suffit cote mobile.
        if (selectedProvider === 'cinetpay') {
          try {
            const ret = await paymentsAPI.cinetpayReturn(cinetpayTxnId);
            const retStatus = (ret?.data?.status || '').toLowerCase();
            if (ret?.data?.is_successful || retStatus === 'completed') {
              // Statut deja confirme cote serveur (webhook arrive avant
              // que l'utilisateur ne ferme WebBrowser). On peut sauter le polling.
              startVerification(cinetpayPaymentId);
              return;
            }
          } catch (e) {
            if (__DEV__) console.log('[CinetPay] return lookup failed (non-bloquant):', e);
          }
        }

        if (result.type === 'dismiss' || result.type === 'cancel') {
          setProcessing(false);
          showAlert(
            t('payment.paymentInterruptedTitle'),
            t('payment.paymentInterruptedMessage'),
            [
              {
                text: t('payment.paymentCheckStatus'),
                onPress: () => startVerification(cinetpayPaymentId),
              },
              { text: t('payment.paymentRetry'), onPress: () => handlePayment() },
              { text: t('payment.paymentBack'), style: 'cancel' },
            ],
          );
          return;
        }

        // Webhook backend met a jour Payment.status ; on polle pour rafraichir l'UI.
        startVerification(cinetpayPaymentId);
        return;
      }

      // Recupere la cle d'idempotence persistee (ou en cree une) — reutilisee
      // tant que le paiement n'a pas atteint un statut terminal. Evite le double
      // debit si un retry intervient APRES que createPayment a reussi cote serveur
      // mais que la reponse n'est jamais arrivee au client.
      const idempotencyKey = await getOrCreateIdempotencyKey(registrationId);

      // Create payment avec les bons noms de champs + clé d'idempotence
      // Le montant inclut les frais de service (modèle client-paye)
      const paymentResponse = await paymentsAPI.createPayment({
        registration: registrationId,
        amount: finalTotal,
        currency: eventCurrencyCode,
        payment_method: selectedMethod,
        billing_phone: formattedPhone,
        billing_email: userEmail,
        idempotency_key: idempotencyKey,
        // Pays du PAYEUR transmis aussi au flow NotchPay/Stripe — utilisé
        // côté backend pour résoudre le channel local et le PSP cible.
        payer_country: payerCountry,
      });

      // Extraire l'ID du paiement de la réponse de manière sécurisée
      const responseData = paymentResponse.data;
      let newPaymentId: string | null = null;

      // Vérifier les différents formats de réponse possibles
      if (typeof responseData === 'object' && responseData !== null) {
        newPaymentId = responseData.id || responseData.payment_id || responseData.payment?.id || null;
      }

      if (__DEV__) console.log('[Payment] Created payment:', newPaymentId);

      // Validation stricte de l'ID
      if (!newPaymentId || typeof newPaymentId !== 'string' || newPaymentId === 'undefined') {
        throw new Error(t('payment.paymentNoPaymentId'));
      }

      // ⚠️ NE PAS clear l'idempotency key ici : le paiement est créé mais pas
      // encore confirmé. Si on échoue plus loin (processMobileMoney, redirection
      // navigateur), un retry sans clé persistée créerait un doublon serveur.
      // La clé est supprimée seulement en statut terminal (success / failed /
      // cancellation explicite) — voir onSuccess / onFailure / cancelPayment.

      setPaymentId(newPaymentId);

      // Traiter le paiement selon la méthode
      if (MOBILE_MONEY_METHODS.has(selectedMethod)) {
        // Trouver le channel pour la méthode sélectionnée
        const methodConfig = dynamicMethods.find(m => m.id === selectedMethod);
        const response = await paymentsAPI.processMobileMoney(newPaymentId, {
          phone: formattedPhone,
          ...(methodConfig?.channel ? { channel: methodConfig.channel } : {}),
        });
        if (__DEV__) console.log('[Payment] Mobile Money processing response:', response.data);
      } else {
        // Carte bancaire ou PayPal - redirection vers page de paiement NotchPay
        const response = await paymentsAPI.initializePayment(newPaymentId);
        if (__DEV__) console.log('[Payment] Redirect initialization response:', response.data);

        // Si on reçoit une URL d'autorisation, ouvrir dans le navigateur
        const authUrl = response.data?.authorization_url || response.data?.checkout_url || response.data?.payment_url;
        if (authUrl) {
          if (__DEV__) console.log('[Payment] Opening authorization URL:', authUrl);

          // openAuthSessionAsync : meme principe que pour CinetPay ci-dessus.
          // La page web /payment/callback/{id} redirige vers ce deep link
          // apres reception du webhook NotchPay → la session se ferme auto.
          const returnUrl = `${DEEP_LINK_SCHEME}://payment-success/${newPaymentId}`;
          const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl, {
            dismissButtonStyle: 'close',
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            toolbarColor: colors.primary,
            controlsColor: Colors.white,
          });

          if (__DEV__) console.log('[Payment] WebBrowser result:', result.type);

          // Vérifier si l'utilisateur a fermé la page de paiement
          if (result.type === 'dismiss' || result.type === 'cancel') {
            setProcessing(false);
            showAlert(
              t('payment.paymentInterruptedTitle'),
              t('payment.paymentInterruptedMessage'),
              [
                {
                  text: t('payment.paymentCheckStatus'),
                  onPress: () => {
                    if (newPaymentId || paymentId) startVerification(newPaymentId || paymentId!);
                  },
                },
                { text: t('payment.paymentRetry'), onPress: () => handlePayment() },
                { text: t('payment.paymentBack'), style: 'cancel' },
              ]
            );
            return;
          }
        } else {
          if (__DEV__) console.warn('[Payment] No authorization URL received');
          throw new Error(t('payment.paymentURLNotReceived'));
        }
      }

      // Démarrer le polling du statut via le hook partagé
      startVerification(newPaymentId);
    } catch (error: any) {
      setProcessing(false);
      if (__DEV__) console.error('[Payment] Error:', error.response?.data || error);

      // Extraire le message d'erreur via utility partagée
      const errorMessage = extractErrorMessage(
        error.response?.data,
        t('payment.paymentGenericError')
      );

      showError(t('payment.paymentErrorTitle'), errorMessage);
    }
  };

  const cancelPayment = async () => {
    if (!paymentId) {
      setProcessing(false);
      // Annulation pré-paiement (l'utilisateur revient en arrière avant
      // d'avoir tapé "Payer") → on libère la clé pour que la prochaine
      // tentative reparte sur une nouvelle session d'idempotence.
      void clearIdempotencyKey(registrationId);
      return;
    }

    setCancelling(true);
    stopVerification(); // Arrêter le polling

    try {
      const response = await paymentsAPI.cancelPayment(paymentId);
      if (__DEV__) console.log('[Payment] Cancel response:', response.data);

      setProcessing(false);
      setCancelling(false);
      // Statut terminal explicite → libérer la clé.
      void clearIdempotencyKey(registrationId);

      showAlert(
        t('payment.paymentCancelledTitle'),
        t('payment.paymentCancelledMessage'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      if (__DEV__) console.error('[Payment] Cancel error:', error);
      setCancelling(false);

      // Même si l'annulation échoue côté serveur, on arrête le processing
      setProcessing(false);

      const errorMessage = extractErrorMessage(error.response?.data, t('payment.errorCancelFailed'));
      showError(t('common.error'), errorMessage);
    }
  };

  /**
   * Vérification manuelle du paiement - appelée quand l'utilisateur indique "J'ai déjà payé"
   * Effectue plusieurs tentatives de vérification auprès de NotchPay via le hook partagé
   */
  const handleAlreadyPaid = async () => {
    if (!paymentId) {
      showError(t('common.error'), t('payment.paymentNoPaymentInProgress'));
      return;
    }

    setVerifyingManually(true);
    stopVerification(); // Arrêter le polling automatique

    if (__DEV__) console.log('[Payment] Manual verification requested for payment:', paymentId);

    const result = await manualVerify(paymentId, 5, 3000);

    if (result.success) {
      setVerifyingManually(false);
      setProcessing(false);
      savePaymentMethodOnSuccess();

      const eventObj = registration?.event_detail
        || (typeof registration?.event === 'object' ? registration.event : null);
      navigation.replace('PaymentSuccess', {
        paymentId: paymentId,
        registrationId: registrationId,
        eventType: eventObj?.event_type || registration?.registration_type,
        registrationStatus: registration?.status,
        approvalStatus: registration?.approval_status,
        eventTitle: eventObj?.title,
      });
      return;
    }

    if (['failed', 'cancelled', 'rejected', 'declined', 'expired', 'timeout'].includes(result.status || '')) {
      setVerifyingManually(false);
      setProcessing(false);
      navigation.replace('PaymentFailed', { paymentId: paymentId, error: result.error || t('payment.paymentPaymentFailedDefault') });
      return;
    }

    if (result.status === 'error') {
      // Network/verification error - could not confirm
      setVerifyingManually(false);
      showAlert(
        t('payment.paymentVerifyingTitle'),
        t('payment.paymentVerifyingInProgressMessage'),
        [
          { text: t('payment.paymentRetry'), onPress: () => handleAlreadyPaid() },
          { text: t('payment.paymentViewTickets'), onPress: () => {
            setProcessing(false);
            navigation.navigate('Main', { screen: 'MyTickets' } as any);
          }},
        ]
      );
      return;
    }

    // Still pending after all attempts
    setVerifyingManually(false);
    showAlert(
      t('payment.paymentPendingTitle'),
      t('payment.paymentPendingMessage'),
      [
        { text: t('payment.paymentContinueWaiting'), onPress: () => {
          setVerifyingManually(false);
          startVerification(paymentId);
        }},
        { text: t('payment.paymentViewTickets'), onPress: () => {
          setProcessing(false);
          navigation.navigate('Main', { screen: 'MyTickets' } as any);
        }},
      ]
    );
  };

  // Utilise la fonction utilitaire centralisée pour le formatage
  const formatPhoneNumber = formatPhoneInput;

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>PAY</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* === EDITORIAL HEADER (tile) === */}
      <View
        style={[
          styles.headerE,
          {
            backgroundColor: colors.background,
            borderBottomColor: 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.headerTopRowE}>
          <TouchableOpacity
            style={[styles.iconDiscE, { backgroundColor: colors.gray100 }]}
            onPress={() => {
              if (!processing) navigation.goBack();
            }}
            disabled={processing}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={processing ? colors.gray400 : colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrowE, { color: colors.accent }]}>
              ÉTAPE 3 / 3 • CHECKOUT
            </Text>
            <Text style={[styles.headerTitleE, { color: colors.text }]}>
              {processing ? t('payment.paymentProcessing') : t('payment.paymentTitle')}
            </Text>
          </View>
          {!processing && (
            <View style={[styles.secureBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="lock-closed" size={11} color="#10B981" />
              <Text style={styles.secureBadgeText}>{t('payment.paymentSecureBadge')}</Text>
            </View>
          )}
        </View>

        {/* Step indicator bars + labels */}
        {!processing && (
          <>
            <View style={styles.stepBarsContainer}>
              <View style={[styles.stepBar, { backgroundColor: colors.primary }]} />
              <View style={[styles.stepBar, { backgroundColor: colors.primary }]} />
              <View style={[styles.stepBar, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.stepLabelsRow}>
              <Text style={[styles.stepLabel, { color: colors.gray400 }]}>{t('payment.paymentStepSelection')}</Text>
              <Text style={[styles.stepLabel, { color: colors.gray400 }]}>{t('payment.paymentStepRecap')}</Text>
              <Text style={[styles.stepLabel, { color: colors.primary, fontFamily: FontFamily.bold }]}>
                {t('payment.paymentStepPayment')}
              </Text>
            </View>
          </>
        )}

        {!processing && (
          <Text
            style={{
              fontFamily: FontFamily.regular,
              fontSize: 10,
              color: colors.gray400,
              marginTop: 6,
              letterSpacing: 0.2,
            }}
          >
            {t('payment.paymentEncryptionNote')}
          </Text>
        )}
      </View>

      {processing ? (
        /* ===== Processing Status Screen (replaces form) ===== */
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.processingScrollContent}
        >
          {/* Payment method icon */}
          <View style={[
            styles.processingIconContainer,
            { backgroundColor: (selectedMethod ? (METHOD_COLORS[selectedMethod] || '#666666') : '#1A1F71') + '20' }
          ]}>
            <Image
              source={selectedMethod ? (PaymentIcons[selectedMethod] || PaymentIcons.credit_card) : PaymentIcons.credit_card}
              style={styles.processingIconImage}
              contentFit="contain"
            />
          </View>

          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.md }} />

          <Text style={[styles.processingTitle, { color: colors.gray900 }]}>
            {selectedMethod ? (dynamicMethods.find(m => m.id === selectedMethod)?.name || t('payment.paymentMethodFallback')) : t('payment.paymentByCard')}
          </Text>

          <Text style={[styles.processingSubtitle, { color: colors.primary }]}>{t('payment.paymentProcessingTitle')}</Text>

          {/* Amount reminder */}
          <Text style={[styles.processingAmount, { color: colors.gray600 }]}>
            {finalTotal.toLocaleString()} {eventCurrencyLabel}
          </Text>

          {/* Polling progress — visual feedback during the up-to-3-min wait */}
          {isPolling && (
            <PollingProgressBar
              primaryColor={colors.primary}
              trackColor={colors.gray100}
              attempt={pollingAttempt}
              maxAttempts={pollingMaxAttempts}
            />
          )}

          {/* Instructions détaillées pour Mobile Money */}
          {selectedMethod && MOBILE_MONEY_METHODS.has(selectedMethod) && (
            <View style={[styles.instructionsContainer, { backgroundColor: colors.gray50 }]}>
              <Text style={[styles.instructionsTitle, { color: colors.gray800 }]}>{t('payment.paymentHowToValidate')}</Text>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {t('payment.paymentStepNotification')}
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {t('payment.paymentEnterPIN', { method: dynamicMethods.find(m => m.id === selectedMethod)?.name || t('payment.paymentMobileMoneyFallback') })}
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {t('payment.paymentStepConfirm')}
                </Text>
              </View>

              <View style={[styles.waitingNote, { borderTopColor: colors.gray200 }]}>
                <Ionicons name="time-outline" size={16} color={colors.gray500} />
                <Text style={[styles.waitingNoteText, { color: colors.gray500 }]}>
                  {t('payment.paymentAutoRefreshNote')}
                </Text>
              </View>
            </View>
          )}

          {/* Instructions pour carte bancaire ou PayPal (redirections) */}
          {selectedMethod && REDIRECT_METHODS.has(selectedMethod) && (
            <View style={[styles.instructionsContainer, { backgroundColor: colors.gray50 }]}>
              <Text style={[styles.instructionsTitle, { color: colors.gray800 }]}>{t('payment.paymentSecureTitle')}</Text>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {t('payment.paymentRedirectStep1')}
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {selectedMethod === 'paypal'
                    ? t('payment.paymentRedirectStep2PayPal')
                    : t('payment.paymentEnterCardInfo')}
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {t('payment.paymentRedirectStep3')}
                </Text>
              </View>

              <View style={[styles.securityNote, { borderTopColor: colors.gray200 }]}>
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <Text style={[styles.securityNoteText, { color: colors.success }]}>
                  {t('payment.paymentSecureNote')}
                </Text>
              </View>
            </View>
          )}

          {/* Bouton J'ai déjà payé — primary, cohérent avec LoginScreen/AuthGuard */}
          <View style={{ marginBottom: Spacing.sm }}>
            <EditorialButton
              label={verifyingManually ? t('payment.paymentVerifyingShort') : t('payment.paymentAlreadyPaid')}
              eyebrow={verifyingManually ? t('payment.paymentVerifyEyebrowWaiting') : t('payment.paymentVerifyEyebrowConfirm')}
              icon="checkmark-circle"
              onPress={handleAlreadyPaid}
              loading={verifyingManually}
              disabled={cancelling || verifyingManually}
              variant="primary"
              fullWidth
            />
          </View>

          {/* Bouton Annuler — danger outline */}
          <EditorialButton
            label={cancelling ? t('payment.paymentCancelling') : t('payment.paymentCancelLabel')}
            onPress={cancelPayment}
            loading={cancelling}
            disabled={cancelling || verifyingManually}
            variant="danger"
            fullWidth
          />
        </ScrollView>
      ) : (
        /* ===== Payment Form (normal state) ===== */
        <>
          <KeyboardAwareScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bottomOffset={120}
          >
            {/* === SLOW/OFFLINE BANNER (above order summary on Payment) === */}
            {(isOffline || isSlowCellular) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  padding: Spacing.sm + 2,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: isOffline ? '#FEE2E2' : '#FEF3C7',
                  borderWidth: 1,
                  borderColor: isOffline ? '#FCA5A5' : '#FDE68A',
                  marginBottom: Spacing.md,
                }}
              >
                <Ionicons
                  name={isOffline ? 'cloud-offline' : 'cellular-outline'}
                  size={16}
                  color={isOffline ? '#DC2626' : '#D97706'}
                />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: FontFamily.medium,
                    fontSize: 12,
                    color: isOffline ? '#991B1B' : '#92400E',
                    lineHeight: 16,
                  }}
                >
                  {isOffline
                    ? t('payment.paymentBannerOffline')
                    : t('payment.paymentBannerSlow')}
                </Text>
              </View>
            )}

            {/* === ORDER SUMMARY (receipt) === */}
            <View style={styles.sectionE}>
              <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>
                {isAdditionalTicketsMode ? t('payment.paymentEyebrowAdditional') : t('payment.paymentEyebrowInvoice')}
              </Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>
                {isAdditionalTicketsMode ? t('payment.paymentTitleAdditional') : t('payment.paymentTitleOrder')}
              </Text>
              <View style={[styles.receiptCardE, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }, Shadows.sm]}>
                <View style={styles.receiptHeaderE}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptHeaderEyebrowE}>EVENT • {new Date().getFullYear()}</Text>
                    <Text style={[styles.receiptEventTitle, { color: colors.text }]} numberOfLines={2}>
                      {(registration?.event as any)?.title || registration?.event_detail?.title || t('payment.paymentEventFallback')}
                    </Text>
                  </View>
                  {isAdditionalTicketsMode && (
                    <View style={[styles.additionalBadgeE, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.additionalBadgeTextE, { color: colors.primary }]}>+ EXTRA</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.receiptDashedE, { borderTopColor: 'rgba(0,0,0,0.12)' }]} />

                {getTicketsToDisplay().map((ticket: any, index: number) => (
                  <View key={ticket.id || index} style={styles.receiptItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.receiptItemName, { color: colors.gray700 }]} numberOfLines={1}>
                        {ticket.ticket_type_name || ticket.ticket_type?.name}
                      </Text>
                      <Text style={[styles.receiptItemQty, { color: colors.gray400 }]}>
                        × {ticket.quantity || 1}
                      </Text>
                    </View>
                    <Text style={[styles.receiptItemPrice, { color: colors.text }]}>
                      {Number(ticket.total_price || (ticket.unit_price || 0) * (ticket.quantity || 1)).toLocaleString()} {eventCurrencyLabel}
                    </Text>
                  </View>
                ))}

                <View style={[styles.receiptDashedE, { borderTopColor: 'rgba(0,0,0,0.08)' }]} />

                <View style={styles.receiptSubRow}>
                  <Text style={[styles.receiptSubLabel, { color: colors.gray500 }]}>{t('payment.paymentReceiptSubtotal')}</Text>
                  <Text style={[styles.receiptSubValue, { color: colors.gray500 }]}>
                    {subtotal.toLocaleString()} {eventCurrencyLabel}
                  </Text>
                </View>

                {serviceFee > 0 && (
                  <View style={styles.receiptSubRow}>
                    <Text style={[styles.receiptSubLabel, { color: colors.gray500 }]} numberOfLines={1}>
                      {t('payment.paymentServiceFee', { label: serviceFeeLabel })}
                    </Text>
                    <Text style={[styles.receiptSubValue, { color: colors.gray500 }]}>
                      {serviceFee.toLocaleString()} {eventCurrencyLabel}
                    </Text>
                  </View>
                )}

                <View style={[styles.receiptDashedThickE, { borderTopColor: 'rgba(0,0,0,0.18)' }]} />

                <View style={styles.receiptTotalRowE}>
                  <Text style={[styles.receiptTotalLabelE, { color: colors.text }]}>{t('payment.paymentTotalToPay')}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={styles.receiptTotalValueRowE}>
                      <Text style={[styles.receiptTotalValueE, { color: colors.text }]}>
                        {finalTotal.toLocaleString()}
                      </Text>
                      <Text style={[styles.receiptTotalCurrencyE, { color: colors.gray500 }]}>
                        {eventCurrencyLabel}
                      </Text>
                    </View>
                    {finalTotal > 0 && (
                      <ConvertedPrice amount={finalTotal} eventCurrency={eventCurrencyCode} />
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* === PAYMENT METHODS === */}
            <View style={styles.sectionE}>
              <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>MÉTHODES • PAY</Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('payment.paymentMethodSection')}</Text>

              <CountryBadgeSelector
                countryCode={payerCountry}
                onChange={handleCountryChange}
                disabled={processing || cancelling}
                // Pays "home" du payeur pour la card rapide en tete de
                // bottom sheet — locale device, sinon fallback CM.
                homeCountry={detectUserCountry() || 'CM'}
              />

              {methodsFetchFailed && (
                <TouchableOpacity
                  onPress={() => setMethodsRetry((c) => c + 1)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.sm,
                    padding: Spacing.sm + 2,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    marginBottom: Spacing.sm,
                  }}
                >
                  <Ionicons name="warning" size={16} color="#D97706" />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: FontFamily.medium,
                      fontSize: 12,
                      color: '#92400E',
                      lineHeight: 16,
                    }}
                  >
                    {t('payment.paymentMethodsFallbackBanner')}
                  </Text>
                  <Ionicons name="refresh" size={16} color="#D97706" />
                </TouchableOpacity>
              )}

              {payerCountry === INTL_CODE && finalTotal > 0 && (
                <FXIndicator
                  amount={finalTotal}
                  fromCurrency={eventCurrencyCode}
                />
              )}

              {methodsLoading && [0, 1, 2].map((i) => (
                <View
                  key={`method-skel-${i}`}
                  style={[
                    styles.methodCardE,
                    { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.04)', opacity: 0.6 },
                    Shadows.sm,
                  ]}
                >
                  <View style={styles.methodIndexCol}>
                    <Text style={[styles.methodIndex, { color: colors.gray300 }]}>0{i + 1}</Text>
                  </View>
                  <View style={[styles.methodIconE, { backgroundColor: colors.gray100 }]} />
                  <View style={styles.methodInfoE}>
                    <View style={{ height: 14, width: '60%', backgroundColor: colors.gray100, borderRadius: 4, marginBottom: 6 }} />
                    <View style={{ height: 10, width: '85%', backgroundColor: colors.gray100, borderRadius: 4 }} />
                  </View>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ))}

              {!methodsLoading && dynamicMethods.map((method, idx) => {
                const isSelected = selectedMethod === method.id;
                const overLimit =
                  method.maxAmount != null && finalTotal > method.maxAmount;
                const cardInner = (
                  <AnimatedPressable
                    key={method.id}
                    style={[
                      styles.methodCardE,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected
                          ? colors.primary
                          : overLimit
                            ? '#F59E0B'
                            : 'rgba(0,0,0,0.06)',
                        opacity: overLimit ? 0.6 : 1,
                      },
                      isSelected ? Shadows.buttonPrimary : Shadows.sm,
                    ]}
                    onPress={() => {
                      if (overLimit) return;
                      setSelectedMethod(method.id);
                    }}
                    animationType="scale"
                    scaleValue={overLimit ? 1 : 0.98}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled: overLimit }}
                    accessibilityLabel={method.name}
                  >
                    {/* Index badge */}
                    <View style={styles.methodIndexCol}>
                      <Text style={[styles.methodIndex, { color: isSelected ? colors.primary : colors.gray400 }]}>
                        0{idx + 1}
                      </Text>
                    </View>

                    {/* Method icon */}
                    <View style={[styles.methodIconE, { backgroundColor: method.color + '15' }]}>
                      <Image source={method.icon} style={styles.methodIconImageE} contentFit="contain" />
                    </View>

                    {/* Info */}
                    <View style={styles.methodInfoE}>
                      <View style={styles.methodNameRowE}>
                        <Text style={[styles.methodNameE, { color: colors.text }]} numberOfLines={1}>
                          {method.name}
                        </Text>
                        {/* Badge passerelle : transparence sur quelle plateforme
                            traite la transaction. 3 couleurs alignees avec
                            l'admin (emerald/violet/indigo). */}
                        {method.provider && (
                          <View
                            style={[
                              styles.providerBadgeE,
                              method.provider === 'cinetpay'
                                ? { backgroundColor: '#EDE9FE' }
                                : method.provider === 'stripe'
                                  ? { backgroundColor: '#E0E7FF' }
                                  : { backgroundColor: '#D1FAE5' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.providerBadgeTextE,
                                {
                                  color:
                                    method.provider === 'cinetpay'
                                      ? '#6D28D9'
                                      : method.provider === 'stripe'
                                        ? '#4338CA'
                                        : '#047857',
                                },
                              ]}
                            >
                              {method.provider === 'cinetpay'
                                ? 'CinetPay'
                                : method.provider === 'stripe'
                                  ? 'Stripe'
                                  : 'NotchPay'}
                            </Text>
                          </View>
                        )}
                      </View>
                      {overLimit ? (
                        <Text style={[styles.methodDescriptionE, { color: '#B45309' }]} numberOfLines={2}>
                          Plafond&nbsp;: {formatMoney(method.maxAmount!, eventCurrencyCode)} {eventCurrencyLabel}. Utilisez une carte.
                        </Text>
                      ) : (
                        <Text style={[styles.methodDescriptionE, { color: colors.gray500 }]} numberOfLines={1}>
                          {method.description}
                        </Text>
                      )}
                    </View>

                    {/* Radio */}
                    <View
                      style={[
                        styles.methodRadioE,
                        {
                          borderColor: isSelected ? colors.primary : colors.gray300,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                    </View>
                  </AnimatedPressable>
                );
                // Only the first method carries the TourTarget — pointing at
                // every option would create visual noise during the tour.
                return idx === 0 ? (
                  <TourTarget key={method.id} id="payment-methods">
                    {cardInner}
                  </TourTarget>
                ) : cardInner;
              })}
            </View>

            {/* === PHONE NUMBER === */}
            {selectedMethod && MOBILE_MONEY_METHODS.has(selectedMethod) && (
              <View style={styles.sectionE}>
                <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>MOBILE MONEY • TEL</Text>
                <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('payment.paymentPhoneSection')}</Text>

                {/* Saved Payment Methods */}
                {getMethodsByType(selectedMethod as PaymentMethodType).length > 0 && (
                  <View style={styles.savedMethodsContainer}>
                    <Text style={[styles.savedMethodsLabel, { color: colors.gray600 }]}>{t('payment.paymentSavedNumbers')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.savedMethodsList}
                    >
                      {getMethodsByType(selectedMethod as PaymentMethodType).map((method) => (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.savedMethodChip,
                            { borderColor: colors.gray200, backgroundColor: colors.card },
                            selectedSavedMethod?.id === method.id && [styles.savedMethodChipSelected, { borderColor: colors.primary, backgroundColor: colors.primaryBg }],
                          ]}
                          onPress={() => {
                            if (selectedSavedMethod?.id === method.id) {
                              setSelectedSavedMethod(null);
                            } else {
                              setSelectedSavedMethod(method);
                            }
                          }}
                        >
                          <Ionicons
                            name="phone-portrait-outline"
                            size={16}
                            color={selectedSavedMethod?.id === method.id ? colors.primary : colors.gray600}
                          />
                          <Text
                            style={[
                              styles.savedMethodChipText,
                              { color: colors.gray700 },
                              selectedSavedMethod?.id === method.id && [styles.savedMethodChipTextSelected, { color: colors.primary }],
                            ]}
                          >
                            {method.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[
                          styles.savedMethodChip,
                          styles.newMethodChip,
                          { borderColor: colors.gray200, backgroundColor: colors.card },
                          !selectedSavedMethod && [styles.savedMethodChipSelected, { borderColor: colors.primary, backgroundColor: colors.primaryBg }],
                        ]}
                        onPress={() => {
                          setSelectedSavedMethod(null);
                          setPhoneNumber('');
                        }}
                      >
                        <Ionicons
                          name="add"
                          size={16}
                          color={!selectedSavedMethod ? colors.primary : colors.gray600}
                        />
                        <Text
                          style={[
                            styles.savedMethodChipText,
                            { color: colors.gray700 },
                            !selectedSavedMethod && [styles.savedMethodChipTextSelected, { color: colors.primary }],
                          ]}
                        >
                          Nouveau
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                )}

                <View style={[styles.phoneInputContainer, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
                  <View style={[styles.phonePrefix, { backgroundColor: colors.gray100 }]}>
                    <Text style={[styles.phonePrefixText, { color: colors.gray700 }]}>{countryConfig?.phone_prefix || '+237'}</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, { color: colors.gray900 }]}
                    placeholder={'X'.repeat(countryConfig?.phone_digits || 9)}
                    placeholderTextColor={colors.gray400}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(formatPhoneNumber(text));
                      // Deselect saved method if user types
                      if (selectedSavedMethod) {
                        setSelectedSavedMethod(null);
                      }
                    }}
                    keyboardType="phone-pad"
                    maxLength={(countryConfig?.phone_digits || 9) + 2}
                    accessibilityLabel={t('payment.phoneNumber')}
                  />
                </View>
                {(!countryConfig || countryConfig.country_code === 'CM') && (
                  <Text style={[styles.phoneHint, { color: colors.gray500 }]}>
                    {selectedMethod === 'mtn_money'
                      ? t('payment.paymentMTNNumbersHint')
                      : selectedMethod === 'orange_money'
                      ? t('payment.paymentOrangeNumbersHint')
                      : t('payment.paymentEnterNumber', { method: dynamicMethods.find(m => m.id === selectedMethod)?.name || '' })}
                  </Text>
                )}
              </View>
            )}
          </KeyboardAwareScrollView>

          {/* === BOTTOM CTA === */}
          <View
            style={[
              styles.bottomBarE,
              {
                backgroundColor: colors.card,
                borderTopColor: 'rgba(0,0,0,0.06)',
                paddingBottom: insets.bottom + 10,
              },
              Shadows.dramatic,
            ]}
          >
            <View style={styles.bottomTotalColE} accessibilityRole="text" accessibilityLabel={`Total a payer: ${finalTotal.toLocaleString()} ${eventCurrencyLabel}`}>
              <Text style={[styles.bottomTotalEyebrowE, { color: colors.gray500 }]}>{t('payment.paymentTotalToPay')}</Text>
              <View style={styles.bottomTotalRowE}>
                <Text style={[styles.bottomTotalValueE, { color: colors.text }]}>
                  {finalTotal.toLocaleString()}
                </Text>
                <Text style={[styles.bottomTotalCurrencyE, { color: colors.gray500 }]}>
                  {eventCurrencyLabel}
                </Text>
              </View>
              {finalTotal > 0 && (
                <ConvertedPrice amount={finalTotal} eventCurrency={eventCurrencyCode} style={{ fontSize: 10 }} />
              )}
            </View>
            <TourTarget id="payment-cta">
            <TouchableOpacity
              onPress={handlePayment}
              disabled={!selectedMethod}
              style={[
                styles.bottomCtaPillE,
                !selectedMethod && { opacity: 0.5 },
                Shadows.buttonPrimary,
              ]}
              activeOpacity={0.9}
              accessibilityLabel={t('payment.confirmPaymentA11y')}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="lock-closed" size={14} color={Colors.white} />
              <Text style={styles.bottomCtaTextE}>{t('payment.paymentPayCTA')}</Text>
              <View style={styles.bottomCtaArrowE}>
                <Ionicons name="arrow-forward" size={14} color={Colors.white} />
              </View>
            </TouchableOpacity>
            </TourTarget>
          </View>
        </>
      )}
      </View>
    </EditorialCanvas>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  // Step indicator bars (AIDesigner)
  stepBarsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 6,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: 6,
  },
  stepLabel: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Polling progress bar shown above instructions during processing
  pollingProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  pollingProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  pollingProgressLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 150,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },

  // Order Card
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  orderHeader: {
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    marginBottom: Spacing.md,
  },
  orderEventTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  additionalBadge: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderItemName: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
  },
  orderItemQty: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  orderItemPrice: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  orderSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  orderSubtotalLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  orderSubtotalValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  orderFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  orderFeeLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    flex: 1,
  },
  orderFeeValue: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  orderTotalLabel: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  orderTotalValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
  },

  // Payment Methods
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  methodCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconImage: {
    width: 32,
    height: 32,
  },
  methodInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  methodName: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  methodDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  methodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  // Phone Input
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },
  phoneHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  savedMethodsContainer: {
    marginBottom: Spacing.md,
  },
  savedMethodsLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.sm,
  },
  savedMethodsList: {
    gap: Spacing.sm,
  },
  savedMethodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
  },
  savedMethodChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  savedMethodChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    fontFamily: FontFamily.medium,
  },
  savedMethodChipTextSelected: {
    color: Colors.primary,
  },
  newMethodChip: {
    borderStyle: 'dashed',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    ...Shadows.lg,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  totalValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  payButton: {
    width: '100%',
  },

  // Processing Status Screen
  processingScrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  processingAmount: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.lg,
  },
  processingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingIconImage: {
    width: 50,
    height: 50,
  },
  processingTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginTop: Spacing.md,
  },
  processingSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  processingText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  instructionsTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  stepNumberText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  waitingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  waitingNoteText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginLeft: Spacing.xs,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  securityNoteText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontFamily: FontFamily.medium,
    marginLeft: Spacing.xs,
  },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.white,
    alignSelf: 'stretch',
  },
  cancelButtonDisabled: {
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray50,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
  cancelButtonTextActive: {
    fontSize: FontSizes.md,
    color: Colors.error,
    fontFamily: FontFamily.medium,
    marginLeft: Spacing.sm,
  },
  cancellingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bouton "J'ai déjà payé"
  alreadyPaidButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
  alreadyPaidButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
  alreadyPaidButtonTextActive: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontFamily: FontFamily.medium,
    marginLeft: Spacing.sm,
  },

  // === EDITORIAL HEADER ===
  headerE: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: Spacing.md,
  },
  headerTopRowE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDiscE: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  secureBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#10B981',
    letterSpacing: 1.2,
  },

  // === SECTIONS ===
  sectionE: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionEyebrowE: {
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
    marginBottom: Spacing.md,
  },

  // === RECEIPT CARD ===
  receiptCardE: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
  },
  receiptHeaderE: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  receiptHeaderEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  receiptEventTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  additionalBadgeE: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  additionalBadgeTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  receiptDashedE: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptDashedThickE: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  receiptItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  receiptItemName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  receiptItemQty: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    marginTop: 2,
  },
  receiptItemPrice: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  receiptSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  receiptSubLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
    flex: 1,
  },
  receiptSubValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  receiptTotalRowE: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  receiptTotalLabelE: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  receiptTotalValueRowE: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  receiptTotalValueE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -1,
    lineHeight: 28,
  },
  receiptTotalCurrencyE: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
  },

  // === METHOD CARD ===
  methodCardE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  methodIndexCol: {
    width: 30,
    alignItems: 'flex-start',
  },
  methodIndex: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  methodIconE: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconImageE: {
    width: 28,
    height: 28,
  },
  methodInfoE: {
    flex: 1,
  },
  methodNameRowE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  methodNameE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 18,
    flexShrink: 1,
  },
  providerBadgeE: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  providerBadgeTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  methodDescriptionE: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  methodRadioE: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === BOTTOM BAR ===
  bottomBarE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomTotalColE: {
    flex: 1,
  },
  bottomTotalEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  bottomTotalRowE: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  bottomTotalValueE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 24,
  },
  bottomTotalCurrencyE: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  bottomCtaPillE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 50,
  },
  bottomCtaTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bottomCtaArrowE: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: 4,
  },
});
