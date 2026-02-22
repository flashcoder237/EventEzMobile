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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { registrationsAPI, paymentsAPI } from '../../api/client';
import { Registration, RootStackParamList } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
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
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import GradientButton from '../../components/ui/GradientButton';

// Import des icônes de paiement
const PaymentIcons = {
  mtn_money: require('../../../assets/payments/momo.png'),
  orange_money: require('../../../assets/payments/om.png'),
  credit_card: require('../../../assets/payments/bank.png'),
};

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

// Les valeurs doivent correspondre exactement aux choix backend (PAYMENT_METHOD_CHOICES)
type PaymentMethod = 'mtn_money' | 'orange_money' | 'credit_card';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: ImageSourcePropType;
  color: string;
  description: string;
}

const paymentMethods: PaymentMethodOption[] = [
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

  // Mode billets supplémentaires: on a des newTickets passés en params
  const isAdditionalTicketsMode = !!(newTickets && newTickets.length > 0);

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [verifyingManually, setVerifyingManually] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  // Préremplir avec le numéro de téléphone de l'utilisateur (sans le préfixe 237)
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const userPhone = user?.phone || user?.phone_number || '';
    // Retirer le préfixe 237 s'il est présent et les caractères spéciaux
    const cleanPhone = userPhone.replace(/[\s\-\.\(\)\+]/g, '');
    const phoneWithoutPrefix = cleanPhone.startsWith('237') ? cleanPhone.slice(3) : cleanPhone;
    // Formater pour l'affichage (XXX XXX XXX)
    const match = phoneWithoutPrefix.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join(' ');
    }
    return phoneWithoutPrefix;
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
      // Format the phone number for display
      const num = selectedSavedMethod.phoneNumber;
      const match = num.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
      if (match) {
        setPhoneNumber([match[1], match[2], match[3]].filter(Boolean).join(' '));
      } else {
        setPhoneNumber(num);
      }
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

  const validatePhoneNumber = (method: PaymentMethod): { valid: boolean; formatted?: string } => {
    if (method === 'credit_card') return { valid: true };

    const cleanNumber = phoneNumber.replace(/[\s\-\.\(\)]/g, '');

    // Supprimer le préfixe 237 s'il est présent pour la validation
    const numberWithoutPrefix = cleanNumber.startsWith('237') ? cleanNumber.slice(3) : cleanNumber;

    if (numberWithoutPrefix.length !== 9) {
      showError('Numéro invalide', 'Le numéro doit contenir 9 chiffres (ex: 6XX XXX XXX)');
      return { valid: false };
    }

    // Validation MTN: 67, 68, 77, 78, 650-654
    if (method === 'mtn_money') {
      if (!numberWithoutPrefix.match(/^(6[78]\d|7[78]\d|65[0-4])\d{6}$/)) {
        showError(
          'Numéro MTN invalide',
          'Les numéros MTN commencent par 67, 68, 77, 78 ou 650-654.\nExemple: 670 123 456'
        );
        return { valid: false };
      }
    }

    // Validation Orange: 655-659, 69, 55, 59
    if (method === 'orange_money') {
      if (!numberWithoutPrefix.match(/^(65[5-9]|69\d|5[59]\d)\d{6}$/)) {
        showError(
          'Numéro Orange invalide',
          'Les numéros Orange commencent par 655-659, 69, 55 ou 59.\nExemple: 655 123 456'
        );
        return { valid: false };
      }
    }

    // Retourner le numéro formaté avec l'indicatif pays
    return { valid: true, formatted: `237${numberWithoutPrefix}` };
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
      const paymentResponse = await paymentsAPI.createPayment({
        registration: registrationId,
        amount: calculateTotal(),
        currency: 'XAF',
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
      if (selectedMethod === 'mtn_money') {
        const response = await paymentsAPI.processMtnMoney(newPaymentId, { phone: formattedPhone });
        console.log('[Payment] MTN processing response:', response.data);
      } else if (selectedMethod === 'orange_money') {
        const response = await paymentsAPI.processOrangeMoney(newPaymentId, { phone: formattedPhone });
        console.log('[Payment] Orange processing response:', response.data);
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
            toolbarColor: Colors.primary,
            controlsColor: Colors.white,
          });

          console.log('[Payment] WebBrowser result:', result.type);

          // Après fermeture du navigateur, vérifier le statut du paiement
          // Que l'utilisateur ait annulé ou terminé, on vérifie le statut
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

      // Extraire le message d'erreur détaillé
      const errorData = error.response?.data;
      let errorMessage = 'Une erreur est survenue lors du paiement';

      if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }

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

      const errorMessage = error.response?.data?.message || 'Impossible d\'annuler le paiement';
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

    if (result.status === 'failed' || result.status === 'cancelled' || result.status === 'rejected' || result.status === 'declined') {
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

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join(' ');
    }
    return text;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
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
          <Text style={styles.sectionTitle}>
            {isAdditionalTicketsMode ? 'Billets supplémentaires' : 'Récapitulatif'}
          </Text>
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderEventTitle} numberOfLines={2}>
                {(registration?.event as any)?.title || registration?.event_detail?.title || 'Événement'}
              </Text>
              {isAdditionalTicketsMode && (
                <Text style={styles.additionalBadge}>Achat supplémentaire</Text>
              )}
            </View>

            {getTicketsToDisplay().map((ticket: any, index: number) => (
              <View key={ticket.id || index} style={styles.orderItem}>
                <View style={styles.orderItemLeft}>
                  <Text style={styles.orderItemName}>
                    {ticket.ticket_type_name || ticket.ticket_type?.name}
                  </Text>
                  <Text style={styles.orderItemQty}>x{ticket.quantity || 1}</Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  {Number(ticket.total_price || (ticket.unit_price || 0) * (ticket.quantity || 1)).toLocaleString()} FCFA
                </Text>
              </View>
            ))}

            <View style={styles.orderTotal}>
              <Text style={styles.orderTotalLabel}>Total à payer</Text>
              <Text style={styles.orderTotalValue}>
                {calculateTotal().toLocaleString()} FCFA
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          {paymentMethods.map((method) => (
            <AnimatedPressable
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
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
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
              <View
                style={[
                  styles.methodRadio,
                  selectedMethod === method.id && styles.methodRadioSelected,
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
        {selectedMethod && selectedMethod !== 'credit_card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Numéro de téléphone</Text>

            {/* Saved Payment Methods */}
            {getMethodsByType(selectedMethod).length > 0 && (
              <View style={styles.savedMethodsContainer}>
                <Text style={styles.savedMethodsLabel}>Numéros enregistrés</Text>
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
                        selectedSavedMethod?.id === method.id && styles.savedMethodChipSelected,
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
                        color={selectedSavedMethod?.id === method.id ? Colors.primary : Colors.gray600}
                      />
                      <Text
                        style={[
                          styles.savedMethodChipText,
                          selectedSavedMethod?.id === method.id && styles.savedMethodChipTextSelected,
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
                      !selectedSavedMethod && styles.savedMethodChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedSavedMethod(null);
                      setPhoneNumber('');
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={!selectedSavedMethod ? Colors.primary : Colors.gray600}
                    />
                    <Text
                      style={[
                        styles.savedMethodChipText,
                        !selectedSavedMethod && styles.savedMethodChipTextSelected,
                      ]}
                    >
                      Nouveau
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            <View style={styles.phoneInputContainer}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+237</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="6XX XXX XXX"
                placeholderTextColor={Colors.gray400}
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(formatPhoneNumber(text));
                  // Deselect saved method if user types
                  if (selectedSavedMethod) {
                    setSelectedSavedMethod(null);
                  }
                }}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
            <Text style={styles.phoneHint}>
              {selectedMethod === 'mtn_money'
                ? 'Numéros MTN valides: 67, 68, 77, 78, 650-654'
                : 'Numéros Orange valides: 655-659, 69, 55, 59'}
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total à payer</Text>
          <Text style={styles.totalValue}>
            {calculateTotal().toLocaleString()} FCFA
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
          <View style={styles.processingCard}>
            {/* Icône animée */}
            <View style={[
              styles.processingIconContainer,
              { backgroundColor: selectedMethod === 'mtn_money' ? '#FFCC0020' : selectedMethod === 'orange_money' ? '#FF660020' : '#1A1F7120' }
            ]}>
              <Image
                source={selectedMethod ? PaymentIcons[selectedMethod] : PaymentIcons.credit_card}
                style={styles.processingIconImage}
                resizeMode="contain"
              />
            </View>

            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.md }} />

            <Text style={styles.processingTitle}>
              {selectedMethod === 'mtn_money' ? 'MTN Mobile Money' :
               selectedMethod === 'orange_money' ? 'Orange Money' :
               'Paiement par carte'}
            </Text>

            <Text style={styles.processingSubtitle}>Traitement en cours...</Text>

            {/* Instructions détaillées pour Mobile Money */}
            {selectedMethod !== 'credit_card' && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Comment valider :</Text>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Vous allez recevoir une notification sur votre téléphone
                  </Text>
                </View>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Entrez votre code PIN {selectedMethod === 'mtn_money' ? 'MTN MoMo' : 'Orange Money'}
                  </Text>
                </View>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Confirmez la transaction
                  </Text>
                </View>

                <View style={styles.waitingNote}>
                  <Ionicons name="time-outline" size={16} color={Colors.gray500} />
                  <Text style={styles.waitingNoteText}>
                    Cette page se met à jour automatiquement
                  </Text>
                </View>
              </View>
            )}

            {/* Instructions pour carte bancaire */}
            {selectedMethod === 'credit_card' && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Paiement sécurisé :</Text>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Une page de paiement sécurisée va s'ouvrir
                  </Text>
                </View>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Entrez les informations de votre carte bancaire
                  </Text>
                </View>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Validez le paiement et revenez sur l'application
                  </Text>
                </View>

                <View style={styles.securityNote}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                  <Text style={styles.securityNoteText}>
                    Paiement sécurisé par NotchPay
                  </Text>
                </View>
              </View>
            )}

            {/* Bouton J'ai déjà payé */}
            {verifyingManually ? (
              <View style={styles.alreadyPaidButton}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.alreadyPaidButtonTextActive}>Vérification en cours...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.alreadyPaidButton}
                onPress={handleAlreadyPaid}
                disabled={cancelling || verifyingManually}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.alreadyPaidButtonText}>J'ai déjà payé</Text>
              </TouchableOpacity>
            )}

            {/* Bouton Annuler */}
            <TouchableOpacity
              style={[styles.cancelButton, (cancelling || verifyingManually) && styles.cancelButtonDisabled]}
              onPress={cancelPayment}
              disabled={cancelling || verifyingManually}
            >
              {cancelling ? (
                <View style={styles.cancellingContainer}>
                  <ActivityIndicator size="small" color={Colors.error} />
                  <Text style={styles.cancelButtonTextActive}>Annulation...</Text>
                </View>
              ) : (
                <Text style={styles.cancelButtonText}>Annuler le paiement</Text>
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
