import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { registrationsAPI, paymentsAPI } from '../../api/client';
import { Registration, RootStackParamList } from '../../types';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

type PaymentMethod = 'mtn_money' | 'orange_money' | 'card';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'mtn_money',
    name: 'MTN Mobile Money',
    icon: '📱',
    color: '#FFCC00',
    description: 'Payez avec votre compte MTN MoMo',
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: '📱',
    color: '#FF6600',
    description: 'Payez avec votre compte Orange Money',
  },
  {
    id: 'card',
    name: 'Carte bancaire',
    icon: '💳',
    color: '#1A1F71',
    description: 'Visa, Mastercard, etc.',
  },
];

export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { registrationId } = route.params;

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistration();
  }, [registrationId]);

  const fetchRegistration = async () => {
    try {
      const response = await registrationsAPI.getRegistration(registrationId);
      setRegistration(response.data);
    } catch (error) {
      console.error('Error fetching registration:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la commande');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!registration?.tickets) return 0;
    return registration.tickets.reduce((total, ticket) => {
      return total + (ticket.total_price || (ticket.unit_price || 0) * (ticket.quantity || 1));
    }, 0);
  };

  const validatePhoneNumber = (method: PaymentMethod) => {
    if (method === 'card') return true;

    const cleanNumber = phoneNumber.replace(/\s/g, '');
    if (cleanNumber.length < 9) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide');
      return false;
    }

    if (method === 'mtn_money' && !cleanNumber.match(/^(237)?(6[78]\d{7})$/)) {
      Alert.alert('Erreur', 'Ce numéro n\'est pas un numéro MTN valide');
      return false;
    }

    if (method === 'orange_money' && !cleanNumber.match(/^(237)?(6[59]\d{7})$/)) {
      Alert.alert('Erreur', 'Ce numéro n\'est pas un numéro Orange valide');
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner un mode de paiement');
      return;
    }

    if (!validatePhoneNumber(selectedMethod)) {
      return;
    }

    setProcessing(true);

    try {
      // Create payment
      const paymentResponse = await paymentsAPI.createPayment({
        registration: registrationId,
        amount: calculateTotal(),
        payment_method: selectedMethod === 'mtn_money' ? 'momo' : selectedMethod === 'orange_money' ? 'om' : 'card',
        phone_number: phoneNumber.replace(/\s/g, ''),
      });

      const newPaymentId = paymentResponse.data.id;
      setPaymentId(newPaymentId);

      // Initialize payment based on method
      if (selectedMethod === 'mtn_money') {
        await paymentsAPI.processMtnMoney(newPaymentId, { phone_number: phoneNumber });
      } else if (selectedMethod === 'orange_money') {
        await paymentsAPI.processOrangeMoney(newPaymentId, { phone_number: phoneNumber });
      } else {
        await paymentsAPI.initializePayment(newPaymentId);
      }

      // Poll for payment status
      pollPaymentStatus(newPaymentId);
    } catch (error: any) {
      setProcessing(false);
      Alert.alert(
        'Erreur de paiement',
        error.response?.data?.detail || 'Une erreur est survenue lors du paiement'
      );
    }
  };

  const pollPaymentStatus = async (pId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s interval)

    const checkStatus = async () => {
      try {
        const response = await paymentsAPI.verifyPayment(pId);
        const status = response.data.status || response.data.payment_status;

        if (status === 'completed') {
          setProcessing(false);
          navigation.replace('PaymentSuccess', {
            paymentId: pId,
            eventType: registration?.event?.event_type || registration?.registration_type,
            registrationStatus: registration?.status,
            approvalStatus: registration?.approval_status,
            eventTitle: registration?.event?.title,
          });
        } else if (status === 'failed') {
          setProcessing(false);
          navigation.replace('PaymentFailed', { paymentId: pId, error: 'Le paiement a échoué' });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        } else {
          setProcessing(false);
          Alert.alert(
            'Délai dépassé',
            'Le paiement prend plus de temps que prévu. Vérifiez votre téléphone pour confirmer la transaction.',
            [
              { text: 'Réessayer', onPress: () => pollPaymentStatus(pId) },
              { text: 'Annuler', style: 'cancel' },
            ]
          );
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        }
      }
    };

    // Show waiting message for Mobile Money
    if (selectedMethod === 'mtn_money' || selectedMethod === 'orange_money') {
      Alert.alert(
        'Confirmation requise',
        'Une demande de paiement a été envoyée à votre téléphone. Veuillez valider la transaction avec votre code PIN.',
        [{ text: 'OK' }]
      );
    }

    checkStatus();
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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderEventTitle} numberOfLines={2}>
                {(registration?.event as any)?.title || registration?.event_detail?.title || 'Événement'}
              </Text>
            </View>

            {registration?.tickets?.map((ticket, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.orderItemLeft}>
                  <Text style={styles.orderItemName}>
                    {ticket.ticket_type_name || ticket.ticket_type?.name}
                  </Text>
                  <Text style={styles.orderItemQty}>x{ticket.quantity || 1}</Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  {(ticket.total_price || (ticket.unit_price || 0) * (ticket.quantity || 1)).toLocaleString()} FCFA
                </Text>
              </View>
            ))}

            <View style={styles.orderTotal}>
              <Text style={styles.orderTotalLabel}>Total</Text>
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
                <Text style={styles.methodIconText}>{method.icon}</Text>
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

        {/* Phone Number Input */}
        {(selectedMethod === 'mtn_money' || selectedMethod === 'orange_money') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Numéro de téléphone</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+237</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="6XX XXX XXX"
                placeholderTextColor={Colors.gray400}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
            <Text style={styles.phoneHint}>
              {selectedMethod === 'mtn_money'
                ? 'Entrez votre numéro MTN (67, 68)'
                : 'Entrez votre numéro Orange (65, 69)'}
            </Text>
          </View>
        )}
      </ScrollView>

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
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingTitle}>Traitement en cours</Text>
            <Text style={styles.processingText}>
              {selectedMethod === 'mtn_money' || selectedMethod === 'orange_money'
                ? 'Veuillez valider la transaction sur votre téléphone'
                : 'Veuillez patienter...'}
            </Text>
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
  methodIconText: {
    fontSize: 24,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    ...Shadows.lg,
  },
  processingTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  processingText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
  },
});
