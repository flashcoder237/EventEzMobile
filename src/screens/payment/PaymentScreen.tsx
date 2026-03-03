import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Linking,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { registrationsAPI, paymentsAPI } from '../../api/client';
import { Registration, RootStackParamList, CountryPaymentConfig, PaymentMethodOption as APIPaymentMethodOption } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSavedPaymentMethods, SavedPaymentMethod, maskPhoneNumber } from '../../hooks';
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
import { formatPhoneInput, formatPhoneForDisplay, preparePhoneForInput } from '../../lib/utils/phoneFormatters';

// Import des icônes de paiement
const PaymentIcons: Record<string, ImageSourcePropType> = {
  mtn_money: require('../../../assets/payments/momo.png'),
  orange_money: require('../../../assets/payments/om.png'),
  credit_card: require('../../../assets/payments/bank.png'),
  // Fallback pour les nouvelles méthodes - réutilisent des icônes existantes
  wave: require('../../../assets/payments/bank.png'),
  mpesa: require('../../../assets/payments/bank.png'),
  airtel_money: require('../../../assets/payments/bank.png'),
};

// Couleurs par méthode de paiement
const METHOD_COLORS: Record<string, string> = {
  mtn_money: '#FFCC00',
  orange_money: '#FF6600',
  credit_card: '#1A1F71',
  wave: '#1DA1F2',
  mpesa: '#4CAF50',
  airtel_money: '#E53935',
};

// Descriptions par méthode
const METHOD_DESCRIPTIONS: Record<string, string> = {
  mtn_money: 'Payez avec votre compte MTN MoMo',
  orange_money: 'Payez avec votre compte Orange Money',
  credit_card: 'Visa, Mastercard, etc.',
  wave: 'Payez avec votre compte Wave',
  mpesa: 'Payez avec M-Pesa',
  airtel_money: 'Payez avec Airtel Money',
};

// Méthodes de type mobile money
const MOBILE_MONEY_METHODS = new Set([
  'mtn_money', 'orange_money', 'wave', 'mpesa', 'airtel_money',
]);

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

// Les valeurs doivent correspondre aux choix backend (multi-pays)
type PaymentMethodId = 'mtn_money' | 'orange_money' | 'credit_card' | 'wave' | 'mpesa' | 'airtel_money';

interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  icon: ImageSourcePropType;
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
    description: 'Payez avec votre compte MTN MoMo',
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: PaymentIcons.orange_money,
    color: '#FF6600',
    description: 'Payez avec votre compte Orange Money',
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
  const { colors, isDark } = useTheme();

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
    if (selectedMethod && selectedMethod !== 'credit_card' && phoneNumber) {
      const cleanNumber = phoneNumber.replace(/[\s\-\.\(\)]/g, '');
      savePaymentMethod(cleanNumber, selectedMethod);
      if (selectedSavedMethod) {
        markAsUsed(selectedSavedMethod.id);
      }
    }
  }, [selectedMethod, phoneNumber, selectedSavedMethod, savePaymentMethod, markAsUsed]);

  // Shared payment verification hook
  const {
    isVerifying: isPolling,
    startVerification,
    stopVerification,
    manualVerify,
  } = usePaymentVerification({
    pollInterval: 5000,
    maxAttempts: 90,
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
        eventType: eventObj?.event_type || registration?.registration_type,
        registrationStatus: registration?.status,
        approvalStatus: registration?.approval_status,
        eventTitle: eventObj?.title,
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
        'Le paiement prend plus de temps que prevu. Si vous avez deja confirme la transaction sur votre telephone, cliquez sur "J\'ai deja paye".',
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
        'Impossible de verifier le statut du paiement (probleme de connexion). Votre paiement a peut-etre reussi.\n\nSi vous avez deja paye, cliquez sur "J\'ai deja paye" pour verifier.',
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

  // Fetch dynamic payment methods based on event country
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!registration) return;
      const eventObj = typeof registration.event === 'object' ? registration.event : null;
      const locationCountry = eventObj?.location_country || 'Cameroun';

      try {
        const response = await paymentsAPI.getPaymentMethods(locationCountry);
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
        }
      } catch (error) {
        console.error('[Payment] Error fetching payment methods:', error);
        // Afficher une erreur au lieu d'un fallback silencieux Cameroun
        showError(
          'Méthodes de paiement',
          'Impossible de charger les méthodes de paiement. Veuillez réessayer.'
        );
        setDynamicMethods(FALLBACK_METHODS);
      }
    };

    fetchPaymentMethods();
  }, [registration]);

  // Auto-select last used payment method for the selected type
  useEffect(() => {
    if (selectedMethod && selectedMethod !== 'credit_card') {
      const methodsOfType = getMethodsByType(selectedMethod);
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
      console.error('Error fetching registration:', error);
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

  const calculateTotal = () => {
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

  const validatePhoneNumber = (method: PaymentMethodId): { valid: boolean; formatted?: string } => {
    if (method === 'credit_card') return { valid: true };
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
      console.log('[Payment] Soumission ignorée - déjà en cours');
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
        throw new Error('Email utilisateur non disponible. Veuillez vous reconnecter.');
      }

      // Générer une clé d'idempotence si pas encore fait
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey(registrationId);
      }

      // Create payment avec les bons noms de champs + clé d'idempotence
      // Le backend déduit la devise depuis le pays de l'événement
      const paymentResponse = await paymentsAPI.createPayment({
        registration: registrationId,
        amount: calculateTotal(),
        currency: countryConfig?.currency || 'XAF',
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

      console.log('[Payment] Created payment:', newPaymentId);

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
        console.log('[Payment] Mobile Money processing response:', response.data);
      } else {
        // Carte bancaire - redirection vers page de paiement
        const response = await paymentsAPI.initializePayment(newPaymentId);
        console.log('[Payment] Card initialization response:', response.data);

        // Si on reçoit une URL d'autorisation, ouvrir dans le navigateur
        const authUrl = response.data?.authorization_url || response.data?.checkout_url || response.data?.payment_url;
        if (authUrl) {
          console.log('[Payment] Opening authorization URL:', authUrl);

          // Ouvrir la page de paiement dans le navigateur in-app
          const result = await WebBrowser.openBrowserAsync(authUrl, {
            dismissButtonStyle: 'close',
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            toolbarColor: colors.primary,
            controlsColor: Colors.white,
          });

          console.log('[Payment] WebBrowser result:', result.type);

          // Vérifier si l'utilisateur a fermé la page de paiement
          if (result.type === 'dismiss' || result.type === 'cancel') {
            setProcessing(false);
            showAlert(
              'Paiement interrompu',
              'Vous avez fermé la page de paiement. Si vous avez déjà effectué le paiement, vous pouvez vérifier son statut.',
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
          console.warn('[Payment] No authorization URL received');
          throw new Error('URL de paiement non reçue. Veuillez réessayer.');
        }
      }

      // Démarrer le polling du statut via le hook partagé
      startVerification(newPaymentId);
    } catch (error: any) {
      setProcessing(false);
      console.error('[Payment] Error:', error.response?.data || error);

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
      console.log('[Payment] Cancel response:', response.data);

      setProcessing(false);
      setCancelling(false);

      showAlert(
        'Paiement annulé',
        'Votre paiement a été annulé.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('[Payment] Cancel error:', error);
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

    console.log('[Payment] Manual verification requested for payment:', paymentId);

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
        'Le statut de votre paiement n\'a pas pu être confirmé immédiatement. Si vous avez reçu un SMS de confirmation de paiement, votre réservation sera validée automatiquement.\n\nConsultez vos billets dans quelques minutes.',
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
      'Votre paiement est encore en cours de traitement. Si vous avez validé la transaction sur votre téléphone, elle sera confirmée automatiquement.\n\nVérifiez vos billets dans quelques minutes.',
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
            {isAdditionalTicketsMode ? 'Billets supplémentaires' : 'Récapitulatif'}
          </Text>
          <View style={[styles.orderCard, { backgroundColor: colors.white }]}>
            <View style={[styles.orderHeader, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.orderEventTitle, { color: colors.gray900 }]} numberOfLines={2}>
                {(registration?.event as any)?.title || registration?.event_detail?.title || 'Événement'}
              </Text>
              {isAdditionalTicketsMode && (
                <Text style={[styles.additionalBadge, { color: colors.primary, backgroundColor: colors.primaryBg }]}>Achat supplémentaire</Text>
              )}
            </View>

            {getTicketsToDisplay().map((ticket: any, index: number) => (
              <View key={ticket.id || index} style={styles.orderItem}>
                <View style={styles.orderItemLeft}>
                  <Text style={[styles.orderItemName, { color: colors.gray700 }]}>
                    {ticket.ticket_type_name || ticket.ticket_type?.name}
                  </Text>
                  <Text style={[styles.orderItemQty, { color: colors.gray500, backgroundColor: colors.gray100 }]}>x{ticket.quantity || 1}</Text>
                </View>
                <Text style={[styles.orderItemPrice, { color: colors.gray900 }]}>
                  {Number(ticket.total_price || (ticket.unit_price || 0) * (ticket.quantity || 1)).toLocaleString()} {countryConfig?.currency || 'FCFA'}
                </Text>
              </View>
            ))}

            <View style={[styles.orderTotal, { borderTopColor: colors.gray100 }]}>
              <Text style={[styles.orderTotalLabel, { color: colors.gray700 }]}>Total à payer</Text>
              <Text style={[styles.orderTotalValue, { color: colors.primary }]}>
                {calculateTotal().toLocaleString()} {countryConfig?.currency || 'FCFA'}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Mode de paiement</Text>
          {dynamicMethods.map((method) => (
            <AnimatedPressable
              key={method.id}
              style={[
                styles.methodCard,
                { backgroundColor: colors.white, borderColor: colors.gray200 },
                selectedMethod === method.id && [styles.methodCardSelected, { borderColor: colors.primary, backgroundColor: colors.primaryBg }],
              ]}
              onPress={() => setSelectedMethod(method.id)}
              animationType="scale"
              scaleValue={0.98}
            >
              <View
                style={[
                  styles.methodIcon,
                  { backgroundColor: method.color + '20' },
                ]}
              >
                <Image source={method.icon} style={styles.methodIconImage} resizeMode="contain" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, { color: colors.gray900 }]}>{method.name}</Text>
                <Text style={[styles.methodDescription, { color: colors.gray500 }]}>{method.description}</Text>
              </View>
              <View
                style={[
                  styles.methodRadio,
                  { borderColor: colors.gray300 },
                  selectedMethod === method.id && [styles.methodRadioSelected, { borderColor: colors.primary, backgroundColor: colors.primary }],
                ]}
              >
                {selectedMethod === method.id && (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                )}
              </View>
            </AnimatedPressable>
          ))}
        </View>

        {/* Phone Number Input - Afficher pour Mobile Money uniquement */}
        {selectedMethod && MOBILE_MONEY_METHODS.has(selectedMethod) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Numéro de téléphone</Text>

            {/* Saved Payment Methods */}
            {getMethodsByType(selectedMethod).length > 0 && (
              <View style={styles.savedMethodsContainer}>
                <Text style={[styles.savedMethodsLabel, { color: colors.gray600 }]}>Numéros enregistrés</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedMethodsList}
                >
                  {getMethodsByType(selectedMethod).map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.savedMethodChip,
                        { borderColor: colors.gray200, backgroundColor: colors.white },
                        selectedSavedMethod?.id === method.id && [styles.savedMethodChipSelected, { borderColor: colors.primary, backgroundColor: colors.primaryLight }],
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
                      { borderColor: colors.gray200, backgroundColor: colors.white },
                      !selectedSavedMethod && [styles.savedMethodChipSelected, { borderColor: colors.primary, backgroundColor: colors.primaryLight }],
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

            <View style={[styles.phoneInputContainer, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
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
              />
            </View>
            {(!countryConfig || countryConfig.country_code === 'CM') && (
              <Text style={[styles.phoneHint, { color: colors.gray500 }]}>
                {selectedMethod === 'mtn_money'
                  ? 'Numéros MTN valides: 67, 68, 77, 78, 650-654'
                  : selectedMethod === 'orange_money'
                  ? 'Numéros Orange valides: 655-659, 69, 55, 59'
                  : `Entrez votre numéro ${dynamicMethods.find(m => m.id === selectedMethod)?.name || ''}`}
              </Text>
            )}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.white, borderTopColor: colors.gray100 }]}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: colors.gray600 }]}>Total à payer</Text>
          <Text style={[styles.totalValue, { color: colors.gray900 }]}>
            {calculateTotal().toLocaleString()} {countryConfig?.currency || 'FCFA'}
          </Text>
        </View>
        <GradientButton
          title={processing ? 'Traitement...' : 'Payer maintenant'}
          onPress={handlePayment}
          loading={processing}
          disabled={!selectedMethod || processing}
          icon={!processing ? <Ionicons name="lock-closed" size={18} color={Colors.white} /> : undefined}
          style={styles.payButton}
        />
      </View>

      {/* Processing Overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={[styles.processingCard, { backgroundColor: colors.white }]}>
            {/* Icône animée */}
            <View style={[
              styles.processingIconContainer,
              { backgroundColor: (selectedMethod ? (METHOD_COLORS[selectedMethod] || '#666666') : '#1A1F71') + '20' }
            ]}>
              <Image
                source={selectedMethod ? (PaymentIcons[selectedMethod] || PaymentIcons.credit_card) : PaymentIcons.credit_card}
                style={styles.processingIconImage}
                resizeMode="contain"
              />
            </View>

            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.md }} />

            <Text style={[styles.processingTitle, { color: colors.gray900 }]}>
              {selectedMethod ? (dynamicMethods.find(m => m.id === selectedMethod)?.name || 'Paiement') : 'Paiement par carte'}
            </Text>

            <Text style={[styles.processingSubtitle, { color: colors.primary }]}>Traitement en cours...</Text>

            {/* Instructions détaillées pour Mobile Money */}
            {selectedMethod && MOBILE_MONEY_METHODS.has(selectedMethod) && (
              <View style={[styles.instructionsContainer, { backgroundColor: colors.gray50 }]}>
                <Text style={[styles.instructionsTitle, { color: colors.gray800 }]}>Comment valider :</Text>

                <View style={styles.instructionStep}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.gray700 }]}>
                    Vous allez recevoir une notification sur votre téléphone
                  </Text>
                </View>

                <View style={styles.instructionStep}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.gray700 }]}>
                    Entrez votre code PIN {dynamicMethods.find(m => m.id === selectedMethod)?.name || 'Mobile Money'}
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

            {/* Instructions pour carte bancaire */}
            {selectedMethod === 'credit_card' && (
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
                    Entrez les informations de votre carte bancaire
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
                    Paiement sécurisé par NotchPay
                  </Text>
                </View>
              </View>
            )}

            {/* Bouton J'ai déjà payé */}
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

            {/* Bouton Annuler */}
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error, backgroundColor: colors.white }, (cancelling || verifyingManually) && [styles.cancelButtonDisabled, { borderColor: colors.gray300, backgroundColor: colors.gray50 }]]}
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
          </View>
        </View>
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
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
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
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
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
    paddingBottom: Spacing.xl,
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

  // Processing Overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    maxWidth: 340,
    width: '100%',
    ...Shadows.lg,
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
});
