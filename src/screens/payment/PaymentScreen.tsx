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
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';

import { registrationsAPI, paymentsAPI } from '../../api';
import { Registration, RootStackParamList, CountryPaymentConfig, PaymentMethodOption as APIPaymentMethodOption } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { useNetworkSpeed } from '../../hooks/useNetworkSpeed';
import { calculateServiceFee, getServiceFeeLabel } from '../../constants/payment';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPPORTED_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));
const PAYER_COUNTRY_STORAGE_KEY = 'eventez:payer_country';

// Import des icônes de paiement
const PaymentIcons: Record<string, ImageSource> = {
  mtn_money: require('../../../assets/payments/momo.png'),
  orange_money: require('../../../assets/payments/om.png'),
  credit_card: require('../../../assets/payments/bank.png'),
  wave: require('../../../assets/payments/wave.png'),
  mpesa: require('../../../assets/payments/M-pesa-logo.png'),
  airtel_money: require('../../../assets/payments/airtel.png'),
  paypal: require('../../../assets/payments/PayPal_Logo.png'),
};

// Couleurs par méthode de paiement
const METHOD_COLORS: Record<string, string> = {
  mtn_money: '#FFCC00',
  orange_money: '#FF6600',
  credit_card: '#1A1F71',
  wave: '#1DA1F2',
  mpesa: '#4CAF50',
  airtel_money: '#E53935',
  paypal: '#003087',
};

// Descriptions par méthode
const METHOD_DESCRIPTIONS: Record<string, string> = {
  mtn_money: 'Paie avec ton compte MTN MoMo',
  orange_money: 'Paie avec ton compte Orange Money',
  credit_card: 'Visa, Mastercard, etc.',
  wave: 'Paie avec ton compte Wave',
  mpesa: 'Paie avec M-Pesa',
  airtel_money: 'Paie avec Airtel Money',
  paypal: 'Paie avec ton compte PayPal',
};

// Méthodes de type mobile money
const MOBILE_MONEY_METHODS = new Set([
  'mtn_money', 'orange_money', 'wave', 'mpesa', 'airtel_money',
]);

// Méthodes qui utilisent une redirection navigateur (pas de saisie téléphone)
const REDIRECT_METHODS = new Set([
  'credit_card', 'paypal',
]);

// Map locale → code pays NotchPay (pour afficher les méthodes de paiement du payeur)
const LOCALE_TO_COUNTRY: Record<string, string> = {
  'fr-CM': 'CM', 'en-CM': 'CM',
  'fr-CI': 'CI',
  'fr-SN': 'SN',
  'sw-KE': 'KE', 'en-KE': 'KE',
  'en-GH': 'GH',
  'en-UG': 'UG', 'sw-UG': 'UG',
};

function detectUserCountry(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (LOCALE_TO_COUNTRY[locale]) return LOCALE_TO_COUNTRY[locale];
    // Try with last part as country code
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const countryPart = parts[parts.length - 1].toUpperCase();
      if (['CM', 'CI', 'SN', 'KE', 'GH', 'UG'].includes(countryPart)) return countryPart;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Génère une clé d'idempotence unique pour éviter les doubles paiements
 */
const generateIdempotencyKey = (registrationId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${registrationId}-${timestamp}-${random}`;
};

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
  const POLL_DURATION_SECONDS = 180; // 36 attempts × 5s (default config)
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.min(POLL_DURATION_SECONDS, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  // Privilégie le compteur réel d'attempts (plus fidèle à l'état du polling),
  // tombe sur le timer si le hook n'a pas encore enregistré d'attempt.
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
        Vérification du paiement · {elapsed}s
        {attempt > 0 ? ` · tentative ${attempt}/${maxAttempts}` : ''}
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
}

// Fallback Cameroun (utilisé si l'API échoue)
const FALLBACK_METHODS: PaymentMethodOption[] = [
  {
    id: 'mtn_money',
    name: 'MTN Mobile Money',
    icon: PaymentIcons.mtn_money,
    color: '#FFCC00',
    description: 'Paie avec ton compte MTN MoMo',
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: PaymentIcons.orange_money,
    color: '#FF6600',
    description: 'Paie avec ton compte Orange Money',
  },
  {
    id: 'credit_card',
    name: 'Carte bancaire',
    icon: PaymentIcons.credit_card,
    color: '#1A1F71',
    description: 'Visa, Mastercard, etc.',
  },
];

export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { registrationId, newTickets, totalAmount } = route.params;
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSlowCellular, isOffline } = useNetworkSpeed();

  // Mode billets supplémentaires: on a des newTickets passés en params
  const isAdditionalTicketsMode = !!(newTickets && newTickets.length > 0);

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [verifyingManually, setVerifyingManually] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [countryConfig, setCountryConfig] = useState<CountryPaymentConfig | null>(null);
  const [dynamicMethods, setDynamicMethods] = useState<PaymentMethodOption[]>(FALLBACK_METHODS);
  // Drapeau pour afficher un bandeau "Méthodes par défaut affichées" quand le fetch a échoué
  const [methodsFetchFailed, setMethodsFetchFailed] = useState(false);
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

  // Ref pour la clé d'idempotence (évite les doubles paiements)
  const idempotencyKeyRef = useRef<string | null>(null);

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

      const eventObj = typeof registration?.event === 'object' ? registration.event : null;
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
      navigation.replace('PaymentFailed', {
        paymentId: paymentId!,
        error: errorMessage,
      });
    },
    onTimeout: (lastStatus) => {
      setProcessing(false);
      showAlert(
        'Delai depasse',
        'Le paiement prend plus de temps que prévu. Si tu as déjà confirmé la transaction sur ton téléphone, tape "J\'ai déjà payé".',
        [
          {
            text: 'J\'ai deja paye',
            onPress: () => {
              setProcessing(true);
              handleAlreadyPaid();
            },
          },
          {
            text: 'Reessayer',
            onPress: () => {
              setProcessing(true);
              if (paymentId) startVerification(paymentId);
            },
          },
          { text: 'Annuler', onPress: cancelPayment },
        ]
      );
    },
    onMaxErrors: (_lastError) => {
      setProcessing(false);
      showAlert(
        'Verification interrompue',
        'Impossible de vérifier le statut du paiement (problème de connexion). Ton paiement a peut-être réussi.\n\nSi tu as déjà payé, tape "J\'ai déjà payé" pour vérifier.',
        [
          {
            text: 'J\'ai deja paye',
            onPress: () => {
              setProcessing(true);
              handleAlreadyPaid();
            },
          },
          {
            text: 'Reessayer',
            onPress: () => {
              setProcessing(true);
              if (paymentId) startVerification(paymentId);
            },
          },
          {
            text: 'Voir mes billets',
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

  // Si l'utilisateur n'a PAS encore choisi (pas de valeur persistée), et que la
  // locale n'a rien donné, on tombe sur le pays de l'événement comme fallback
  // intelligent. Ne s'applique qu'une fois, avant le premier choix manuel.
  const manualCountryChoiceRef = useRef(false);
  useEffect(() => {
    if (!countryHydrated) return;
    if (manualCountryChoiceRef.current) return;
    if (!registration) return;
    const eventObj = typeof registration.event === 'object' ? registration.event : null;
    const eventCountry = eventObj?.location_country_code || eventObj?.location_country;
    if (eventCountry) {
      const upper = String(eventCountry).toUpperCase();
      // On ne remplace que si la locale n'a rien donné (payerCountry par défaut = 'CM')
      // et qu'on n'a pas déjà une valeur persistée, ce qui est déjà filtré par hydratation.
      if (SUPPORTED_CODES.has(upper) && !detectUserCountry()) {
        setPayerCountry(upper);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryHydrated, registration]);

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

  // Fetch dynamic payment methods based on payer's country (not event's country)
  useEffect(() => {
    if (!countryHydrated) return;
    const fetchPaymentMethods = async () => {
      try {
        // Si 'Autre pays', on passe la devise de l'événement pour que le backend
        // décide si PayPal est disponible (dépend de la devise).
        const eventObj = registration && typeof registration.event === 'object' ? registration.event : null;
        const eventCountry = eventObj?.location_country_code || eventObj?.location_country;
        const currency = payerCountry === INTL_CODE ? getEventCurrency(eventCountry) : undefined;
        const response = await paymentsAPI.getPaymentMethods(payerCountry, currency);
        const config: CountryPaymentConfig = response.data;
        setCountryConfig(config);

        if (config.methods && config.methods.length > 0) {
          const methods: PaymentMethodOption[] = config.methods.map((m: APIPaymentMethodOption) => ({
            id: m.id as PaymentMethodId,
            name: m.name,
            icon: PaymentIcons[m.id] || PaymentIcons.credit_card,
            color: METHOD_COLORS[m.id] || '#666666',
            description: METHOD_DESCRIPTIONS[m.id] || `Paiement via ${m.name}`,
            channel: m.channel,
            type: m.type,
          }));
          setDynamicMethods(methods);
          setMethodsFetchFailed(false);
        }
      } catch (error) {
        if (__DEV__) console.error('[Payment] Error fetching payment methods:', error);
        // Afficher une erreur au lieu d'un fallback silencieux Cameroun
        showError(
          'Méthodes de paiement',
          'Impossible de charger les méthodes de paiement pour ton pays. Les options ci-dessous sont génériques — vérifie qu\'elles correspondent avant de payer.'
        );
        setDynamicMethods(FALLBACK_METHODS);
        setMethodsFetchFailed(true);
      }
    };

    fetchPaymentMethods();
  }, [payerCountry, countryHydrated, registration]);

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
      showError('Erreur', 'Impossible de charger les détails de la commande');
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

  // Commission config dynamique par pays
  const eventObj = typeof registration?.event === 'object' ? registration?.event : null;
  const eventCountryCode = (eventObj as any)?.location_country_code || (eventObj as any)?.location_country || 'CM';
  const { config: commissionConfig } = useCommissionConfig(eventCountryCode);

  // Strategie "Event mono-devise" (docs/CURRENCY_STRATEGY.md) :
  // la devise d'affichage vient de l'evenement, PAS du pays du payeur.
  const eventCurrencyCode = ((eventObj as any)?.currency || 'XAF').toUpperCase();
  const eventCurrencyLabel = eventCurrencyCode === 'XAF' || eventCurrencyCode === 'XOF' ? 'FCFA' : eventCurrencyCode;

  const subtotal = calculateSubtotal();
  const feeBearer = (eventObj as any)?.fee_bearer || 'participant';
  const serviceFee = feeBearer === 'organizer' ? 0 : calculateServiceFee(subtotal, commissionConfig);
  const serviceFeeLabel = getServiceFeeLabel(commissionConfig);
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
      showError('Numéro invalide', `Le numéro doit contenir ${expectedDigits} chiffres`);
      return { valid: false };
    }

    // Validation stricte seulement pour le Cameroun (on a les patterns connus)
    if (countryConfig?.country_code === 'CM' || !countryConfig) {
      if (method === 'mtn_money') {
        if (!numberWithoutPrefix.match(/^(6[78]\d|7[78]\d|65[0-4])\d{6}$/)) {
          showError(
            'Numéro MTN invalide',
            'Les numéros MTN commencent par 67, 68, 77, 78 ou 650-654.\nExemple: 670 123 456'
          );
          return { valid: false };
        }
      }
      if (method === 'orange_money') {
        if (!numberWithoutPrefix.match(/^(65[5-9]|69\d|5[59]\d)\d{6}$/)) {
          showError(
            'Numéro Orange invalide',
            'Les numéros Orange commencent par 655-659, 69, 55 ou 59.\nExemple: 655 123 456'
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
      showError('Erreur', 'Veuillez sélectionner un mode de paiement');
      return;
    }

    // Validation du numéro de téléphone pour Mobile Money
    const validation = validatePhoneNumber(selectedMethod);
    if (!validation.valid) {
      return;
    }

    const formattedPhone = validation.formatted || '';

    setProcessing(true);

    try {
      // Valider l'email (requis par le backend)
      const userEmail = user?.email;
      if (!userEmail) {
        throw new Error('Email utilisateur non disponible. Reconnecte-toi.');
      }

      // Générer une clé d'idempotence si pas encore fait
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey(registrationId);
      }

      // Create payment avec les bons noms de champs + clé d'idempotence
      // Le montant inclut les frais de service (modèle client-paye)
      const paymentResponse = await paymentsAPI.createPayment({
        registration: registrationId,
        amount: finalTotal,
        currency: eventCurrencyCode,
        payment_method: selectedMethod,
        billing_phone: formattedPhone,
        billing_email: userEmail,
        idempotency_key: idempotencyKeyRef.current,
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
        throw new Error('ID de paiement non reçu du serveur');
      }

      // Réinitialiser la clé d'idempotence après succès
      idempotencyKeyRef.current = null;

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

          // Ouvrir la page de paiement dans le navigateur in-app
          const result = await WebBrowser.openBrowserAsync(authUrl, {
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
              'Paiement interrompu',
              'Tu as fermé la page de paiement. Si tu as déjà effectué le paiement, tu peux vérifier son statut.',
              [
                {
                  text: 'Vérifier le statut',
                  onPress: () => {
                    if (newPaymentId || paymentId) startVerification(newPaymentId || paymentId!);
                  },
                },
                { text: 'Réessayer', onPress: () => handlePayment() },
                { text: 'Retour', style: 'cancel' },
              ]
            );
            return;
          }
        } else {
          if (__DEV__) console.warn('[Payment] No authorization URL received');
          throw new Error('URL de paiement non reçue. Veuillez réessayer.');
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
        'Une erreur est survenue lors du paiement'
      );

      showError('Erreur de paiement', errorMessage);
    }
  };

  const cancelPayment = async () => {
    if (!paymentId) {
      setProcessing(false);
      return;
    }

    setCancelling(true);
    stopVerification(); // Arrêter le polling

    try {
      const response = await paymentsAPI.cancelPayment(paymentId);
      if (__DEV__) console.log('[Payment] Cancel response:', response.data);

      setProcessing(false);
      setCancelling(false);

      showAlert(
        'Paiement annulé',
        'Ton paiement a été annulé.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      if (__DEV__) console.error('[Payment] Cancel error:', error);
      setCancelling(false);

      // Même si l'annulation échoue côté serveur, on arrête le processing
      setProcessing(false);

      const errorMessage = extractErrorMessage(error.response?.data, 'Impossible d\'annuler le paiement');
      showError('Erreur', errorMessage);
    }
  };

  /**
   * Vérification manuelle du paiement - appelée quand l'utilisateur indique "J'ai déjà payé"
   * Effectue plusieurs tentatives de vérification auprès de NotchPay via le hook partagé
   */
  const handleAlreadyPaid = async () => {
    if (!paymentId) {
      showError('Erreur', 'Aucun paiement en cours à vérifier');
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

      const eventObj = typeof registration?.event === 'object' ? registration.event : null;
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
      navigation.replace('PaymentFailed', { paymentId: paymentId, error: result.error || 'Le paiement a échoué' });
      return;
    }

    if (result.status === 'error') {
      // Network/verification error - could not confirm
      setVerifyingManually(false);
      showAlert(
        'Vérification en cours',
        'Le statut de ton paiement n\'a pas pu être confirmé immédiatement. Si tu as reçu un SMS de confirmation, ta réservation sera validée automatiquement.\n\nConsulte tes billets dans quelques minutes.',
        [
          { text: 'Réessayer', onPress: () => handleAlreadyPaid() },
          { text: 'Voir mes billets', onPress: () => {
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
      'Paiement en attente',
      'Ton paiement est encore en cours de traitement. Si tu as validé la transaction sur ton téléphone, elle sera confirmée automatiquement.\n\nVérifie tes billets dans quelques minutes.',
      [
        { text: 'Continuer à attendre', onPress: () => {
          setVerifyingManually(false);
          startVerification(paymentId);
        }},
        { text: 'Voir mes billets', onPress: () => {
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
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={18} color={processing ? colors.gray400 : colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrowE, { color: colors.accent }]}>
              ÉTAPE 3 / 3 • CHECKOUT
            </Text>
            <Text style={[styles.headerTitleE, { color: colors.text }]}>
              {processing ? 'Traitement' : 'Paiement'}
            </Text>
          </View>
          {!processing && (
            <View style={[styles.secureBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="lock-closed" size={11} color="#10B981" />
              <Text style={styles.secureBadgeText}>SÉCURISÉ</Text>
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
              <Text style={[styles.stepLabel, { color: colors.gray400 }]}>Sélection</Text>
              <Text style={[styles.stepLabel, { color: colors.gray400 }]}>Récap</Text>
              <Text style={[styles.stepLabel, { color: colors.primary, fontFamily: FontFamily.bold }]}>
                Paiement
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
            Paiement chiffré via NotchPay & Stripe
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
            {selectedMethod ? (dynamicMethods.find(m => m.id === selectedMethod)?.name || 'Paiement') : 'Paiement par carte'}
          </Text>

          <Text style={[styles.processingSubtitle, { color: colors.primary }]}>Traitement en cours...</Text>

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
              <Text style={[styles.instructionsTitle, { color: colors.gray800 }]}>Comment valider :</Text>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  Tu vas recevoir une notification sur ton téléphone
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  Entre ton code PIN {dynamicMethods.find(m => m.id === selectedMethod)?.name || 'Mobile Money'}
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  Confirmez la transaction
                </Text>
              </View>

              <View style={[styles.waitingNote, { borderTopColor: colors.gray200 }]}>
                <Ionicons name="time-outline" size={16} color={colors.gray500} />
                <Text style={[styles.waitingNoteText, { color: colors.gray500 }]}>
                  Cette page se met à jour automatiquement
                </Text>
              </View>
            </View>
          )}

          {/* Instructions pour carte bancaire ou PayPal (redirections) */}
          {selectedMethod && REDIRECT_METHODS.has(selectedMethod) && (
            <View style={[styles.instructionsContainer, { backgroundColor: colors.gray50 }]}>
              <Text style={[styles.instructionsTitle, { color: colors.gray800 }]}>Paiement sécurisé :</Text>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  Une page de paiement sécurisée va s'ouvrir
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  {selectedMethod === 'paypal'
                    ? 'Connecte-toi à ton compte PayPal'
                    : 'Entre les infos de ta carte bancaire'}
                </Text>
              </View>

              <View style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.gray700 }]}>
                  Validez le paiement et revenez sur l'application
                </Text>
              </View>

              <View style={[styles.securityNote, { borderTopColor: colors.gray200 }]}>
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <Text style={[styles.securityNoteText, { color: colors.success }]}>
                  Paiement sécurisé
                </Text>
              </View>
            </View>
          )}

          {/* Bouton J'ai déjà payé — toujours visible */}
          {verifyingManually ? (
            <View style={[styles.alreadyPaidButton, { borderColor: colors.primary, backgroundColor: colors.primaryBg }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.alreadyPaidButtonTextActive, { color: colors.primary }]}>Vérification en cours...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.alreadyPaidButton, { borderColor: colors.primary, backgroundColor: colors.primaryBg }]}
              onPress={handleAlreadyPaid}
              disabled={cancelling || verifyingManually}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.alreadyPaidButtonText, { color: colors.primary }]}>J'ai déjà payé</Text>
            </TouchableOpacity>
          )}

          {/* Bouton Annuler — toujours visible */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.error, backgroundColor: colors.card }, (cancelling || verifyingManually) && [styles.cancelButtonDisabled, { borderColor: colors.gray300, backgroundColor: colors.gray50 }]]}
            onPress={cancelPayment}
            disabled={cancelling || verifyingManually}
          >
            {cancelling ? (
              <View style={styles.cancellingContainer}>
                <ActivityIndicator size="small" color={colors.error} />
                <Text style={[styles.cancelButtonTextActive, { color: colors.error }]}>Annulation...</Text>
              </View>
            ) : (
              <Text style={[styles.cancelButtonText, { color: colors.error }]}>Annuler le paiement</Text>
            )}
          </TouchableOpacity>
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
                    ? 'Pas de connexion internet — le paiement ne peut pas démarrer.'
                    : 'Connexion lente détectée — le paiement peut prendre plus de temps que prévu.'}
                </Text>
              </View>
            )}

            {/* === ORDER SUMMARY (receipt) === */}
            <View style={styles.sectionE}>
              <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>
                {isAdditionalTicketsMode ? 'BILLETS EN PLUS' : 'FACTURE • RECAP'}
              </Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>
                {isAdditionalTicketsMode ? 'Billets supplémentaires' : 'Ta commande'}
              </Text>
              <View style={[styles.receiptCardE, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }, Shadows.sm]}>
                <View style={styles.receiptHeaderE}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptHeaderEyebrowE}>EVENT • {new Date().getFullYear()}</Text>
                    <Text style={[styles.receiptEventTitle, { color: colors.text }]} numberOfLines={2}>
                      {(registration?.event as any)?.title || registration?.event_detail?.title || 'Événement'}
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
                  <Text style={[styles.receiptSubLabel, { color: colors.gray500 }]}>Sous-total</Text>
                  <Text style={[styles.receiptSubValue, { color: colors.gray500 }]}>
                    {subtotal.toLocaleString()} {eventCurrencyLabel}
                  </Text>
                </View>

                {serviceFee > 0 && (
                  <View style={styles.receiptSubRow}>
                    <Text style={[styles.receiptSubLabel, { color: colors.gray500 }]} numberOfLines={1}>
                      Frais service ({serviceFeeLabel})
                    </Text>
                    <Text style={[styles.receiptSubValue, { color: colors.gray500 }]}>
                      {serviceFee.toLocaleString()} {eventCurrencyLabel}
                    </Text>
                  </View>
                )}

                <View style={[styles.receiptDashedThickE, { borderTopColor: 'rgba(0,0,0,0.18)' }]} />

                <View style={styles.receiptTotalRowE}>
                  <Text style={[styles.receiptTotalLabelE, { color: colors.text }]}>TOTAL À PAYER</Text>
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
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>Mode de paiement</Text>

              <CountryBadgeSelector
                countryCode={payerCountry}
                onChange={handleCountryChange}
                disabled={processing || cancelling}
              />

              {methodsFetchFailed && (
                <View
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
                    Méthodes par défaut affichées (Cameroun). Vérifie avant de payer ou réessaie.
                  </Text>
                </View>
              )}

              {payerCountry === INTL_CODE && finalTotal > 0 && (
                <FXIndicator
                  amount={finalTotal}
                  fromCurrency={eventCurrencyCode}
                />
              )}

              {dynamicMethods.map((method, idx) => {
                const isSelected = selectedMethod === method.id;
                return (
                  <AnimatedPressable
                    key={method.id}
                    style={[
                      styles.methodCardE,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.06)',
                      },
                      isSelected ? Shadows.buttonPrimary : Shadows.sm,
                    ]}
                    onPress={() => setSelectedMethod(method.id)}
                    animationType="scale"
                    scaleValue={0.98}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
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
                      <Text style={[styles.methodNameE, { color: colors.text }]}>{method.name}</Text>
                      <Text style={[styles.methodDescriptionE, { color: colors.gray500 }]} numberOfLines={1}>
                        {method.description}
                      </Text>
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
              })}
            </View>

            {/* === PHONE NUMBER === */}
            {selectedMethod && MOBILE_MONEY_METHODS.has(selectedMethod) && (
              <View style={styles.sectionE}>
                <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>MOBILE MONEY • TEL</Text>
                <Text style={[styles.sectionTitleE, { color: colors.text }]}>Numéro de téléphone</Text>

                {/* Saved Payment Methods */}
                {getMethodsByType(selectedMethod as PaymentMethodType).length > 0 && (
                  <View style={styles.savedMethodsContainer}>
                    <Text style={[styles.savedMethodsLabel, { color: colors.gray600 }]}>Numéros enregistrés</Text>
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
                    accessibilityLabel="Numero de telephone"
                  />
                </View>
                {(!countryConfig || countryConfig.country_code === 'CM') && (
                  <Text style={[styles.phoneHint, { color: colors.gray500 }]}>
                    {selectedMethod === 'mtn_money'
                      ? 'Numéros MTN valides: 67, 68, 77, 78, 650-654'
                      : selectedMethod === 'orange_money'
                      ? 'Numéros Orange valides: 655-659, 69, 55, 59'
                      : `Entre ton numéro ${dynamicMethods.find(m => m.id === selectedMethod)?.name || ''}`}
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
              <Text style={[styles.bottomTotalEyebrowE, { color: colors.gray500 }]}>TOTAL À PAYER</Text>
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
            <TouchableOpacity
              onPress={handlePayment}
              disabled={!selectedMethod}
              style={[
                styles.bottomCtaPillE,
                !selectedMethod && { opacity: 0.5 },
                Shadows.buttonPrimary,
              ]}
              activeOpacity={0.9}
              accessibilityLabel="Confirmer le paiement"
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="lock-closed" size={14} color={Colors.white} />
              <Text style={styles.bottomCtaTextE}>Payer</Text>
              <View style={styles.bottomCtaArrowE}>
                <Ionicons name="arrow-forward" size={14} color={Colors.white} />
              </View>
            </TouchableOpacity>
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
  methodNameE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 18,
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
