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
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ticketTransfersAPI } from '../../api/client';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import GradientButton from '../ui/GradientButton';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showConfirm } = useAlert();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!recipientEmail.trim()) {
      newErrors.email = "L'email du destinataire est requis";
    } else if (!validateEmail(recipientEmail)) {
      newErrors.email = 'Email invalide';
    }
    if (quantity < 1) {
      newErrors.quantity = 'La quantité doit être au moins 1';
    } else if (ticket && quantity > ticket.quantity) {
      newErrors.quantity = `Vous ne pouvez transférer que ${ticket.quantity} billet(s)`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (!ticket || !validate()) return;

    showConfirm(
      'Confirmer le transfert',
      `Voulez-vous vraiment transférer ${quantity} billet(s) "${ticket.ticket_type_name}" à ${recipientEmail}?`,
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
            'Transfert initié',
            `Un email a été envoyé à ${recipientEmail} pour accepter le transfert.`
          );
          setRecipientEmail('');
          setRecipientName('');
          setQuantity(1);
          setMessage('');
          setErrors({});
          onTransferComplete();
          onClose();
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.detail ||
            error.response?.data?.message ||
            Object.values(error.response?.data || {}).flat().join(', ') ||
            'Erreur lors du transfert';
          showError('Erreur', errorMessage);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleClose = () => {
    setRecipientEmail('');
    setRecipientName('');
    setQuantity(1);
    setMessage('');
    setErrors({});
    onClose();
  };

  if (!ticket) return null;

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* KAV for keyboard avoidance */}
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
            },
            sheetAnim,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <Text style={[styles.title, { color: colors.gray900 }]}>Transférer un billet</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ticket Info */}
            <View style={[styles.ticketInfo, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="ticket-outline" size={24} color={colors.primary} />
              <View style={styles.ticketDetails}>
                <Text style={[styles.ticketName, { color: colors.gray900 }]}>
                  {ticket.ticket_type_name}
                </Text>
                <Text style={[styles.ticketQuantity, { color: colors.gray600 }]}>
                  {ticket.quantity} billet{ticket.quantity > 1 ? 's' : ''} disponible
                  {ticket.quantity > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Recipient Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray700 }]}>
                Email du destinataire *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 },
                  errors.email && styles.inputError,
                ]}
                placeholder="exemple@email.com"
                placeholderTextColor={colors.gray400}
                value={recipientEmail}
                onChangeText={(text) => {
                  setRecipientEmail(text);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Recipient Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray700 }]}>
                Nom du destinataire (optionnel)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 },
                ]}
                placeholder="Jean Dupont"
                placeholderTextColor={colors.gray400}
                value={recipientName}
                onChangeText={setRecipientName}
                autoCapitalize="words"
              />
            </View>

            {/* Quantity */}
            {ticket.quantity > 1 && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.gray700 }]}>
                  Nombre de billets à transférer
                </Text>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      { backgroundColor: colors.card, borderColor: colors.gray200 },
                      quantity <= 1 && { borderColor: colors.gray100, backgroundColor: colors.gray50 },
                    ]}
                    onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={quantity <= 1 ? colors.gray300 : colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.quantityValue, { color: colors.gray900 }]}>{quantity}</Text>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      { backgroundColor: colors.card, borderColor: colors.gray200 },
                      quantity >= ticket.quantity && { borderColor: colors.gray100, backgroundColor: colors.gray50 },
                    ]}
                    onPress={() => quantity < ticket.quantity && setQuantity(quantity + 1)}
                    disabled={quantity >= ticket.quantity}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={quantity >= ticket.quantity ? colors.gray300 : colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </View>
            )}

            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray700 }]}>
                Message personnel (optionnel)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 },
                ]}
                placeholder="Ajouter un message pour le destinataire..."
                placeholderTextColor={colors.gray400}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Info */}
            <View style={[styles.infoNote, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.info }]}>
                Le destinataire recevra un email avec un lien pour accepter ou refuser le transfert.
                Le transfert expire après 48 heures.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.gray100 }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.gray300 }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.gray700 }]}>Annuler</Text>
            </TouchableOpacity>
            <GradientButton
              title={loading ? 'Envoi...' : 'Transférer'}
              onPress={handleTransfer}
              disabled={loading || !recipientEmail.trim()}
              icon={
                loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.white} />
                )
              }
              style={styles.transferButton}
            />
          </View>
        </Reanimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  ticketDetails: {
    flex: 1,
  },
  ticketName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  ticketQuantity: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    borderWidth: 1,
  },
  inputError: {
    borderColor: Colors.error,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quantityValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.semiBold,
    minWidth: 40,
    textAlign: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  transferButton: {
    flex: 1,
  },
});
