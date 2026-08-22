import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ticketTransfersAPI } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

interface TicketInfo {
  id: number;
  ticket_type_name: string;
  quantity: number;
  event_title?: string;
}

interface TransferTicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: TicketInfo | null;
  onTransferComplete: () => void;
}

export default function TransferTicketModal({
  visible,
  onClose,
  ticket,
  onTransferComplete,
}: TransferTicketModalProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showConfirm } = useAlert();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const softBorder = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!recipientEmail.trim()) {
      newErrors.email = t('componentsTickets.errorEmailRequired');
    } else if (!validateEmail(recipientEmail)) {
      newErrors.email = t('componentsTickets.errorEmailInvalid');
    }
    if (quantity < 1) {
      newErrors.quantity = t('componentsTickets.errorQuantityMin');
    } else if (ticket && quantity > ticket.quantity) {
      newErrors.quantity = t('componentsTickets.errorQuantityMax', { max: ticket.quantity });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (!ticket || !validate()) return;

    showConfirm(
      t('componentsTickets.confirmTransferTitle'),
      t('componentsTickets.confirmTransferMessage', {
        count: quantity,
        name: ticket.ticket_type_name,
        email: recipientEmail,
      }),
      async () => {
        setLoading(true);
        try {
          await ticketTransfersAPI.createTransfer({
            ticket_purchase: ticket.id,
            recipient_email: recipientEmail.toLowerCase().trim(),
            recipient_name: recipientName.trim() || undefined,
            quantity,
            message: message.trim() || undefined,
          });
          showSuccess(
            t('componentsTickets.transferInitiatedTitle'),
            t('componentsTickets.transferInitiatedMessage', { email: recipientEmail }),
          );
          resetForm();
          onTransferComplete();
          onClose();
        } catch (error: any) {
          const { message: errorMessage } = getApiErrorMessage(error, t, {
            fallbackKey: 'componentsTickets.errorTransferGeneric',
          });
          showError(t('componentsTickets.errorTitle'), errorMessage);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const resetForm = () => {
    setRecipientEmail('');
    setRecipientName('');
    setQuantity(1);
    setMessage('');
    setErrors({});
    setFocusedField(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!ticket) return null;

  const inputBg = isDark ? colors.gray100 : '#FAFAF7';

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior="padding"
        style={[StyleSheet.absoluteFill, styles.kav]}
        pointerEvents="box-none"
      >
        <Reanimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom + Spacing.xs, Spacing.md),
              borderTopColor: softBorder,
            },
            sheetAnim,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          {/* Header — editorial */}
          <View style={[styles.header, { borderBottomColor: softBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>
                {t('componentsTickets.transferEyebrow')}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('componentsTickets.transferTitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('componentsTickets.close')}
            >
              <Ionicons name="close" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* === TICKET STUB (boarding-pass vibe) === */}
            <View style={[styles.ticketStub, { borderColor: softBorder }, Shadows.sm]}>
              <LinearGradient
                colors={['#0F172A', '#1E1B4B', colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Hologram circles */}
              <View style={styles.stubCircle1} />
              <View style={styles.stubCircle2} />

              {/* Top row : eyebrow + qty pill */}
              <View style={styles.stubTopRow}>
                <Text style={styles.stubEyebrow}>{t('componentsTickets.stubActiveLabel')}</Text>
                <View style={styles.stubQtyPill}>
                  <Ionicons name="ticket-outline" size={11} color="#FFF" />
                  <Text style={styles.stubQtyText}>
                    {t('componentsTickets.stubAvailable', { count: ticket.quantity })}
                  </Text>
                </View>
              </View>

              {/* Ticket name (hero) */}
              <Text style={styles.stubTicketName} numberOfLines={2} adjustsFontSizeToFit>
                {ticket.ticket_type_name}
              </Text>
              {ticket.event_title && (
                <Text style={styles.stubEvent} numberOfLines={1}>
                  {ticket.event_title}
                </Text>
              )}

              {/* Perforation row */}
              <View style={styles.perforationRow}>
                <View style={[styles.notch, styles.notchLeft]} />
                <View style={styles.dashedLine}>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <View key={i} style={styles.dashSegment} />
                  ))}
                </View>
                <View style={[styles.notch, styles.notchRight]} />
              </View>

              {/* Footer row : icon + label + arrow */}
              <View style={styles.stubFooterRow}>
                <Ionicons name="paper-plane-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.stubFooterLabel}>{t('componentsTickets.stubFooterLabel')}</Text>
              </View>
            </View>

            {/* === SECTION 01 : DESTINATAIRE === */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('componentsTickets.section01')}</Text>
              <View style={[styles.sectionLine, { backgroundColor: softBorder }]} />
              <Text style={[styles.sectionLabel, { color: colors.gray500 }]}>
                {t('componentsTickets.sectionRecipient')}
              </Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.gray600 }]}>
                {t('componentsTickets.labelEmailRequired')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: inputBg,
                    borderColor: errors.email
                      ? colors.error
                      : focusedField === 'email'
                        ? colors.primary
                        : softBorder,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? colors.primary : colors.gray400}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder={t('componentsTickets.emailPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  value={recipientEmail}
                  onChangeText={(text) => {
                    setRecipientEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={11} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>
                </View>
              )}
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.gray600 }]}>
                {t('componentsTickets.labelFirstNameOptional')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: inputBg,
                    borderColor: focusedField === 'name' ? colors.primary : softBorder,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={focusedField === 'name' ? colors.primary : colors.gray400}
                />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder={t('componentsTickets.firstNamePlaceholder')}
                  placeholderTextColor={colors.gray400}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* === SECTION 02 : QUANTITÉ === */}
            {ticket.quantity > 1 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('componentsTickets.section02')}</Text>
                  <View style={[styles.sectionLine, { backgroundColor: softBorder }]} />
                  <Text style={[styles.sectionLabel, { color: colors.gray500 }]}>
                    {t('componentsTickets.sectionQuantity')}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.gray600 }]}>
                    {t('componentsTickets.labelTicketCount')}
                  </Text>
                  <View style={[styles.qtyRow, { backgroundColor: inputBg, borderColor: softBorder }]}>
                    <TouchableOpacity
                      onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor: quantity <= 1 ? colors.gray100 : colors.card,
                          borderColor: softBorder,
                        },
                      ]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('componentsTickets.decreaseQuantity')}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={quantity <= 1 ? colors.gray300 : colors.primary}
                      />
                    </TouchableOpacity>

                    <View style={styles.qtyValueWrap}>
                      <Text style={[styles.qtyValue, { color: colors.text }]}>{quantity}</Text>
                      <Text style={[styles.qtySub, { color: colors.gray500 }]}>
                        / {ticket.quantity}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => quantity < ticket.quantity && setQuantity(quantity + 1)}
                      disabled={quantity >= ticket.quantity}
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor: quantity >= ticket.quantity ? colors.gray100 : colors.card,
                          borderColor: softBorder,
                        },
                      ]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('componentsTickets.increaseQuantity')}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={quantity >= ticket.quantity ? colors.gray300 : colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.quantity && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={11} color={colors.error} />
                      <Text style={[styles.errorText, { color: colors.error }]}>{errors.quantity}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* === SECTION 03 : MESSAGE === */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
                {ticket.quantity > 1 ? t('componentsTickets.section03') : t('componentsTickets.section02')}
              </Text>
              <View style={[styles.sectionLine, { backgroundColor: softBorder }]} />
              <Text style={[styles.sectionLabel, { color: colors.gray500 }]}>
                {t('componentsTickets.sectionMessage')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.gray600 }]}>
                {t('componentsTickets.labelMessageOptional')}
              </Text>
              <View
                style={[
                  styles.textareaWrap,
                  {
                    backgroundColor: inputBg,
                    borderColor: focusedField === 'message' ? colors.primary : softBorder,
                  },
                ]}
              >
                <TextInput
                  style={[styles.textareaInput, { color: colors.text }]}
                  placeholder={t('componentsTickets.messagePlaceholder')}
                  placeholderTextColor={colors.gray400}
                  value={message}
                  onChangeText={setMessage}
                  onFocus={() => setFocusedField('message')}
                  onBlur={() => setFocusedField(null)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={300}
                />
                <Text style={[styles.charCount, { color: colors.gray400 }]}>
                  {message.length}/300
                </Text>
              </View>
            </View>

            {/* Info note — éditoriale */}
            <View style={[styles.noteCard, { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '30' }]}>
              <View style={[styles.noteIconWrap, { backgroundColor: colors.primary }]}>
                <Ionicons name="time-outline" size={12} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.noteEyebrow, { color: colors.primary }]}>
                  {t('componentsTickets.noteEyebrow')}
                </Text>
                <Text style={[styles.noteText, { color: colors.text }]}>
                  {t('componentsTickets.noteText')}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky CTA bar */}
          <View style={[styles.actions, { borderTopColor: softBorder, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.gray100 }]}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>{t('componentsTickets.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (loading || !recipientEmail.trim()) && { opacity: 0.55 },
                Shadows.buttonPrimary,
              ]}
              onPress={handleTransfer}
              disabled={loading || !recipientEmail.trim()}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('componentsTickets.sendTransferA11y')}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.confirmBtnText}>{t('componentsTickets.send')}</Text>
                  <View style={styles.confirmArrow}>
                    <Ionicons name="paper-plane" size={14} color={Colors.white} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    borderTopWidth: 0,
    ...Shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -1.0,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // === TICKET STUB ===
  ticketStub: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderWidth: 1,
  },
  stubCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  stubCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,107,107,0.16)',
  },
  stubTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stubEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.75)',
  },
  stubQtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  stubQtyText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#FFF',
  },
  stubTicketName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: '#FFF',
    marginTop: 2,
  },
  stubEvent: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  notch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  notchLeft: {
    marginLeft: -7,
  },
  notchRight: {
    marginRight: -7,
  },
  dashedLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 3,
  },
  dashSegment: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stubFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  stubFooterLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
  },

  // === SECTION HEADERS ===
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },

  // === INPUTS ===
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    paddingVertical: 0,
  },
  textareaWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 92,
  },
  textareaInput: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.4,
    textAlign: 'right',
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.1,
  },

  // === QTY ROW ===
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  qtyValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  qtyValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1,
  },
  qtySub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },

  // === NOTE CARD ===
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  noteIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  noteEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  noteText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },

  // === STICKY ACTIONS ===
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  confirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.3,
    color: '#FFF',
  },
  confirmArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
