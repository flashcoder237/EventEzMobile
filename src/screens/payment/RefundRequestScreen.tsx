import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI, refundsAPI } from '../../api';
import { Payment, RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RefundRequestRouteProp = RouteProp<RootStackParamList, 'RefundRequest'>;

interface RefundReason {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  eyebrowKey: string;
}

const refundReasons: RefundReason[] = [
  {
    id: 'event_cancelled',
    labelKey: 'refundRequest.reasonEventCancelled',
    descriptionKey: 'refundRequest.reasonEventCancelledDesc',
    icon: 'calendar-outline',
    eyebrowKey: 'refundRequest.cause01',
  },
  {
    id: 'cannot_attend',
    labelKey: 'refundRequest.reasonCannotAttend',
    descriptionKey: 'refundRequest.reasonCannotAttendDesc',
    icon: 'walk-outline',
    eyebrowKey: 'refundRequest.cause02',
  },
  {
    id: 'duplicate_payment',
    labelKey: 'refundRequest.reasonDuplicate',
    descriptionKey: 'refundRequest.reasonDuplicateDesc',
    icon: 'copy-outline',
    eyebrowKey: 'refundRequest.cause03',
  },
  {
    id: 'wrong_event',
    labelKey: 'refundRequest.reasonWrongEvent',
    descriptionKey: 'refundRequest.reasonWrongEventDesc',
    icon: 'swap-horizontal-outline',
    eyebrowKey: 'refundRequest.cause04',
  },
  {
    id: 'other',
    labelKey: 'refundRequest.reasonOther',
    descriptionKey: 'refundRequest.reasonOtherDesc',
    icon: 'ellipsis-horizontal',
    eyebrowKey: 'refundRequest.cause05',
  },
];

export default function RefundRequestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RefundRequestRouteProp>();
  const insets = useSafeAreaInsets();
  const { paymentId } = route.params;
  const { showSuccess, showError, showAlert } = useAlert();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const numberLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const biometric = useBiometricConfirm();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

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
      showError(t('common.error'), t('refundRequest.loadError'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const submitRefund = async (amount: number, fullReason: string) => {
    // Confirmation biométrique avant d'envoyer la demande de remboursement.
    // Catégorie 'payments' (même bucket que retrait/paiement).
    const confirmed = await biometric.confirm({
      promptMessage: t('refundRequest.biometricPrompt', { amount: amount.toLocaleString(numberLocale) }),
      category: 'payments',
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await refundsAPI.createRefund({
        payment: paymentId,
        amount: amount,
        reason: fullReason,
      });
      // Modal de confirmation avec délai au lieu d'un simple toast
      showAlert(
        t('refundRequest.successTitle'),
        t('refundRequest.successMessage'),
        [
          {
            text: t('refundRequest.viewMyRequests'),
            onPress: () => {
              try {
                navigation.replace('RefundsList' as any);
              } catch {
                navigation.goBack();
              }
            },
          },
          { text: t('refundRequest.okButton'), style: 'cancel', onPress: () => navigation.goBack() },
        ],
        'success',
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error creating refund:', error);
      showError(
        t('common.error'),
        error.response?.data?.detail ||
        error.response?.data?.error ||
        t('refundRequest.submitError')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showError(t('common.error'), t('refundRequest.selectReasonError'));
      return;
    }

    const reasonObj = refundReasons.find(r => r.id === selectedReason);
    const reasonLabel = reasonObj ? t(reasonObj.labelKey) : '';
    const fullReason = additionalDetails.trim()
      ? `${reasonLabel}: ${additionalDetails}`
      : reasonLabel;

    const amount = isPartialRefund ? parseFloat(refundAmount) : Number(payment?.amount || 0);

    if (isNaN(amount) || amount <= 0) {
      showError(t('common.error'), t('refundRequest.invalidAmountError'));
      return;
    }

    if (amount > Number(payment?.amount || 0)) {
      showError(t('common.error'), t('refundRequest.amountTooHighError'));
      return;
    }

    // Confirmation explicite — c'est une action financière, pas réversible côté UI
    showAlert(
      t('refundRequest.confirmTitle'),
      t('refundRequest.confirmMessage', { amount: formatAmount(amount), currency: payment?.currency || 'XAF' }),
      [
        { text: t('refundRequest.cancelButton'), style: 'cancel' },
        { text: t('refundRequest.confirmButton'), style: 'destructive', onPress: () => submitRefund(amount, fullReason) },
      ],
      'warning',
    );
  };

  const formatAmount = (amount: number | string) => {
    return Number(amount).toLocaleString(numberLocale);
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>{t('refundRequest.watermarkBack')}</WatermarkNumeral>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  if (!payment) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>{t('refundRequest.watermarkOops')}</WatermarkNumeral>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>{t('refundRequest.paymentNotFound')}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>{t('refundRequest.back')}</Text>
          </TouchableOpacity>
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>{t('refundRequest.watermarkBack')}</WatermarkNumeral>

      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
            accessibilityLabel={t('refundRequest.closeA11y')}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('refundRequest.eyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('refundRequest.title')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
      >
        {/* === PAYMENT REFERENCE CARD === */}
        <View style={[styles.refCard, Shadows.lg]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark, '#312E81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.refCardCircle1} />
          <View style={styles.refCardCircle2} />
          <View style={styles.refCardTopRow}>
            <Text style={styles.refCardEyebrow}>{t('refundRequest.refCardEyebrow')}</Text>
            <Text style={styles.refCardId}>#{paymentId.slice(0, 8).toUpperCase()}</Text>
          </View>
          <Text style={styles.refCardLabel}>{t('refundRequest.refCardLabel')}</Text>
          <View style={styles.refCardAmountRow}>
            <Text style={styles.refCardAmount}>{formatAmount(payment.amount)}</Text>
            <Text style={styles.refCardCurrency}>{payment.currency || 'XAF'}</Text>
          </View>
        </View>

        {/* === TRANSPARENCY BANNER — conditions + délais avant tout === */}
        <View style={[styles.transparencyBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <View style={[styles.transparencyIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="information" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.transparencyTitle, { color: colors.text }]}>{t('refundRequest.transparencyTitle')}</Text>
            <Text style={[styles.transparencyLine, { color: colors.gray600 }]}>
              <Text style={{ fontFamily: FontFamily.bold }}>{t('refundRequest.transparencyDelay')}</Text>{t('refundRequest.transparencyDelayValue')}
            </Text>
            <Text style={[styles.transparencyLine, { color: colors.gray600 }]}>
              <Text style={{ fontFamily: FontFamily.bold }}>{t('refundRequest.transparencyFees')}</Text>{t('refundRequest.transparencyFeesValue')}
            </Text>
            <Text style={[styles.transparencyLine, { color: colors.gray600 }]}>
              <Text style={{ fontFamily: FontFamily.bold }}>{t('refundRequest.transparencyTracking')}</Text>{t('refundRequest.transparencyTrackingValue')}
            </Text>
          </View>
        </View>

        {/* === REFUND AMOUNT === */}
        <View style={styles.section}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('refundRequest.step1Eyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('refundRequest.step1Title')}</Text>

          <TouchableOpacity
            style={[
              styles.amountOption,
              {
                backgroundColor: colors.card,
                borderColor: !isPartialRefund ? colors.primary : hairline,
              },
              !isPartialRefund && Shadows.buttonPrimary,
            ]}
            onPress={() => {
              setIsPartialRefund(false);
              setRefundAmount(String(payment.amount));
            }}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.radioOuter,
                { borderColor: !isPartialRefund ? colors.primary : colors.gray300 },
              ]}
            >
              {!isPartialRefund && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.amountOptionEyebrow, { color: colors.accent }]}>{t('refundRequest.optionA')}</Text>
              <Text style={[styles.amountOptionTitle, { color: colors.text }]}>{t('refundRequest.totalRefund')}</Text>
              <Text style={[styles.amountOptionValue, { color: colors.primary }]}>
                {formatAmount(payment.amount)} {payment.currency || 'XAF'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.amountOption,
              {
                backgroundColor: colors.card,
                borderColor: isPartialRefund ? colors.primary : hairline,
              },
              isPartialRefund && Shadows.buttonPrimary,
            ]}
            onPress={() => setIsPartialRefund(true)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.radioOuter,
                { borderColor: isPartialRefund ? colors.primary : colors.gray300 },
              ]}
            >
              {isPartialRefund && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.amountOptionEyebrow, { color: colors.accent }]}>{t('refundRequest.optionB')}</Text>
              <Text style={[styles.amountOptionTitle, { color: colors.text }]}>{t('refundRequest.partialRefund')}</Text>
              {isPartialRefund && (
                <View style={styles.partialInputRow}>
                  <TextInput
                    style={[
                      styles.amountInput,
                      {
                        backgroundColor: colors.gray100,
                        borderColor: hairline,
                        color: colors.text,
                      },
                    ]}
                    value={refundAmount}
                    onChangeText={setRefundAmount}
                    keyboardType="numeric"
                    placeholder={t('refundRequest.amountPlaceholder')}
                    placeholderTextColor={colors.gray400}
                    accessibilityLabel={t('refundRequest.amountA11y')}
                  />
                  <Text style={[styles.amountInputCurrency, { color: colors.gray500 }]}>
                    {payment.currency || 'XAF'}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* === REASON SELECTION === */}
        <View style={styles.section}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('refundRequest.step2Eyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('refundRequest.step2Title')}</Text>

          {refundReasons.map((reason) => {
            const isSelected = selectedReason === reason.id;
            return (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : hairline,
                  },
                  isSelected && Shadows.buttonPrimary,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.reasonIconBox,
                    {
                      backgroundColor: isSelected ? colors.primary : `${colors.primary}15`,
                    },
                  ]}
                >
                  <Ionicons
                    name={reason.icon}
                    size={16}
                    color={isSelected ? Colors.white : colors.primary}
                  />
                </View>
                <View style={styles.reasonContent}>
                  <Text style={[styles.reasonEyebrow, { color: colors.accent }]}>{t(reason.eyebrowKey)}</Text>
                  <Text style={[styles.reasonTitle, { color: colors.text }]}>{t(reason.labelKey)}</Text>
                  <Text style={[styles.reasonDescription, { color: colors.gray500 }]}>
                    {t(reason.descriptionKey)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? colors.primary : colors.gray300 },
                  ]}
                >
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* === ADDITIONAL DETAILS === */}
        <View style={styles.section}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('refundRequest.step3Eyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('refundRequest.step3Title')}
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: hairline,
                color: colors.text,
              },
            ]}
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            placeholder={t('refundRequest.detailsPlaceholder')}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel={t('refundRequest.detailsA11y')}
          />
        </View>

        {/* === INFO BANNER === */}
        <View style={[styles.infoCallout, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <View style={[styles.infoRail, { backgroundColor: '#3B82F6' }]} />
          <View style={[styles.infoIcon, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="information" size={14} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoEyebrow}>{t('refundRequest.policyEyebrow')}</Text>
            <Text style={styles.infoText}>
              {t('refundRequest.policyText')}
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* === BOTTOM CTA === paddingBottom dynamique pour la nav bar Android. */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: hairline,
            paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
          },
          Shadows.dramatic,
        ]}
      >
        {/* Option de désescalade : contacter l'organizer avant de soumettre.
            Souvent un échange règle le souci sans refund (report sur autre event,
            geste commercial, etc.) — bénéfique pour les deux parties. */}
        {(() => {
          const reg: any = (payment as any).registration_details;
          const organizerId = reg?.event_detail?.organizer?.id || reg?.event?.organizer?.id;
          const organizerObj = reg?.event_detail?.organizer || reg?.event?.organizer;
          if (!organizerId) return null;
          const organizerName =
            `${organizerObj?.first_name || ''} ${organizerObj?.last_name || ''}`.trim() ||
            organizerObj?.email ||
            t('refundRequest.contactOrganizerFallback');
          return (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                marginBottom: 8,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: colors.gray300,
              }}
              onPress={() =>
                navigation.navigate('Conversation', {
                  userId: String(organizerId),
                  userName: organizerName,
                })
              }
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('refundRequest.contactOrganizerA11y')}
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.gray700} />
              <Text style={{ fontFamily: FontFamily.semiBold, fontSize: 13, color: colors.gray700 }}>
                {t('refundRequest.contactOrganizerCTA')}
              </Text>
            </TouchableOpacity>
          );
        })()}

        <TouchableOpacity
          style={[
            styles.submitPill,
            (!selectedReason || submitting) && { opacity: 0.5 },
            Shadows.buttonPrimary,
          ]}
          onPress={handleSubmit}
          disabled={!selectedReason || submitting}
          activeOpacity={0.9}
          accessibilityLabel={t('refundRequest.submitA11y')}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <Text style={styles.submitEyebrow}>{t('refundRequest.submitEyebrow')}</Text>
                <Text style={styles.submitLabel} numberOfLines={1}>
                  {t('refundRequest.submitLabel', { amount: formatAmount(isPartialRefund ? refundAmount : payment.amount), currency: payment.currency || 'XAF' })}
                </Text>
              </View>
              <View style={styles.submitArrow}>
                <Ionicons name="return-down-back" size={16} color={Colors.white} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  retryButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: '#FFFFFF',
  },

  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1.1,
    lineHeight: 32,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 140,
  },

  // === REF CARD ===
  refCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  refCardCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  refCardCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  refCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refCardEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.7)',
  },
  refCardId: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.85)',
  },
  refCardLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  refCardAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  refCardAmount: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  refCardCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },

  // === SECTION ===
  section: {
    marginBottom: Spacing.xl,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },

  // === AMOUNT OPTIONS ===
  amountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  amountOptionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  amountOptionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  amountOptionValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  partialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  amountInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  amountInputCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 1,
  },

  // === RADIO ===
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // === REASON OPTIONS ===
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  reasonIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonContent: {
    flex: 1,
  },
  reasonEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  reasonTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  reasonDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // === TEXT AREA ===
  textArea: {
    borderRadius: 18,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    minHeight: 110,
    borderWidth: 1,
    lineHeight: 20,
  },

  // === INFO CALLOUT ===
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingLeft: Spacing.lg + 6,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#1E40AF',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 17,
  },

  // === FOOTER ===
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  submitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
  },
  submitEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  submitLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  submitArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
  // Transparency banner — conditions + délais
  transparencyBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  transparencyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  transparencyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  transparencyLine: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
});
