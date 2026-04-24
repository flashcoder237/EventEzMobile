import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI, refundsAPI } from '../../api';
import { Payment, RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RefundRequestRouteProp = RouteProp<RootStackParamList, 'RefundRequest'>;

interface RefundReason {
  id: string;
  label: string;
  description: string;
}

const refundReasons: RefundReason[] = [
  {
    id: 'event_cancelled',
    label: 'Événement annulé',
    description: 'L\'événement a été annulé par l\'organisateur',
  },
  {
    id: 'cannot_attend',
    label: 'Impossible d\'y assister',
    description: 'Je ne peux plus assister à l\'événement',
  },
  {
    id: 'duplicate_payment',
    label: 'Paiement en double',
    description: 'J\'ai payé deux fois par erreur',
  },
  {
    id: 'wrong_event',
    label: 'Mauvais événement',
    description: 'Je me suis trompé d\'événement',
  },
  {
    id: 'other',
    label: 'Autre raison',
    description: 'Une autre raison non listée ci-dessus',
  },
];

export default function RefundRequestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RefundRequestRouteProp>();
  const { paymentId } = route.params;
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [isPartialRefund, setIsPartialRefund] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await paymentsAPI.getPayment(paymentId);
      setPayment(response.data);
      setRefundAmount(String(response.data.amount || 0));
    } catch (error) {
      if (__DEV__) console.error('Error fetching payment:', error);
      showError('Erreur', 'Impossible de charger les détails du paiement');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showError('Erreur', 'Veuillez sélectionner une raison');
      return;
    }

    const reasonLabel = refundReasons.find(r => r.id === selectedReason)?.label || '';
    const fullReason = additionalDetails.trim()
      ? `${reasonLabel}: ${additionalDetails}`
      : reasonLabel;

    const amount = isPartialRefund ? parseFloat(refundAmount) : Number(payment?.amount || 0);

    if (isNaN(amount) || amount <= 0) {
      showError('Erreur', 'Montant invalide');
      return;
    }

    if (amount > Number(payment?.amount || 0)) {
      showError('Erreur', 'Le montant ne peut pas dépasser le montant du paiement');
      return;
    }

    setSubmitting(true);
    try {
      await refundsAPI.createRefund({
        payment: paymentId,
        amount: amount,
        reason: fullReason,
      });
      showSuccess('Succès', 'Votre demande de remboursement a été soumise');
      navigation.goBack();
    } catch (error: any) {
      if (__DEV__) console.error('Error creating refund:', error);
      showError(
        'Erreur',
        error.response?.data?.detail ||
        error.response?.data?.error ||
        'Impossible de soumettre la demande de remboursement'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount: number | string) => {
    return Number(amount).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>RFND</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <LoadingSpinner />
        </View>
      </EditorialCanvas>
    );
  }

  if (!payment) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>NO</WatermarkNumeral>
        <View style={[styles.errorContainer, { zIndex: 1 }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>Paiement non trouvé</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>RFND</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Fermer"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Demande de remboursement</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={80}
        >
          {/* Payment Summary */}
          <View style={[styles.paymentSummary, { backgroundColor: isDark ? colors.card : '#E0E7FF' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="card" size={24} color="#6366F1" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryTitle, { color: isDark ? colors.textSecondary : '#6B21A8' }]}>Paiement #{paymentId.slice(0, 8)}</Text>
              <Text style={[styles.summaryAmount, { color: isDark ? colors.text : '#6B21A8' }]}>
                {formatAmount(payment.amount)} {payment.currency || 'XAF'}
              </Text>
            </View>
          </View>

          {/* Refund Amount */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray700 }]}>Montant du remboursement</Text>

            <TouchableOpacity
              style={[styles.amountOption, { borderColor: colors.gray200 }, !isPartialRefund && [styles.amountOptionActive, { backgroundColor: isDark ? colors.card : '#FAF5FF' }]]}
              onPress={() => {
                setIsPartialRefund(false);
                setRefundAmount(String(payment.amount));
              }}
            >
              <View style={styles.radioOuter}>
                {!isPartialRefund && <View style={styles.radioInner} />}
              </View>
              <View style={styles.amountOptionContent}>
                <Text style={[styles.amountOptionTitle, { color: colors.gray900 }]}>Remboursement total</Text>
                <Text style={styles.amountOptionValue}>
                  {formatAmount(payment.amount)} {payment.currency || 'XAF'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.amountOption, { borderColor: colors.gray200 }, isPartialRefund && [styles.amountOptionActive, { backgroundColor: isDark ? colors.card : '#FAF5FF' }]]}
              onPress={() => setIsPartialRefund(true)}
            >
              <View style={styles.radioOuter}>
                {isPartialRefund && <View style={styles.radioInner} />}
              </View>
              <View style={styles.amountOptionContent}>
                <Text style={[styles.amountOptionTitle, { color: colors.gray900 }]}>Remboursement partiel</Text>
                {isPartialRefund && (
                  <TextInput
                    style={[styles.amountInput, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }]}
                    value={refundAmount}
                    onChangeText={setRefundAmount}
                    keyboardType="numeric"
                    placeholder="Montant"
                    placeholderTextColor={colors.gray400}
                    accessibilityLabel="Montant du remboursement"
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Reason Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray700 }]}>Raison du remboursement</Text>

            {refundReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  { borderColor: colors.gray200 },
                  selectedReason === reason.id && [styles.reasonOptionActive, { backgroundColor: isDark ? colors.card : '#FAF5FF' }]
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={styles.radioOuter}>
                  {selectedReason === reason.id && <View style={styles.radioInner} />}
                </View>
                <View style={styles.reasonContent}>
                  <Text style={[styles.reasonTitle, { color: colors.gray900 }]}>{reason.label}</Text>
                  <Text style={[styles.reasonDescription, { color: colors.gray500 }]}>{reason.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray700 }]}>Détails supplémentaires (optionnel)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              placeholder="Ajoutez des détails pour aider à traiter votre demande..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Raison du remboursement"
            />
          </View>

          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: isDark ? colors.card : '#EFF6FF', borderColor: isDark ? colors.gray200 : '#BFDBFE' }]}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={[styles.infoText, { color: isDark ? colors.textSecondary : '#1E40AF' }]}>
              Le remboursement sera traité dans un délai de 5-10 jours ouvrés.
              Vous recevrez une notification une fois la demande traitée.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </KeyboardAwareScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.gray100, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedReason || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            accessibilityLabel="Demander le remboursement"
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="refresh-circle" size={20} color={Colors.white} />
                <Text style={styles.submitButtonText}>
                  Soumettre la demande ({formatAmount(isPartialRefund ? refundAmount : payment.amount)} {payment.currency || 'XAF'})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.white,
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
  closeButton: {
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
    padding: Spacing.lg,
  },

  // Payment Summary
  paymentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#E0E7FF',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: '#6B21A8',
  },
  summaryAmount: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: '#6B21A8',
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.md,
  },

  // Amount Options
  amountOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    marginBottom: Spacing.sm,
  },
  amountOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#FAF5FF',
  },
  amountOptionContent: {
    flex: 1,
  },
  amountOptionTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  amountOptionValue: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: '#6366F1',
    marginTop: 4,
  },
  amountInput: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },

  // Radio Button
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },

  // Reason Options
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    marginBottom: Spacing.sm,
  },
  reasonOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#FAF5FF',
  },
  reasonContent: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  reasonDescription: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },

  // Text Area
  textArea: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#EFF6FF',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: '#1E40AF',
    lineHeight: 20,
  },

  // Footer
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
