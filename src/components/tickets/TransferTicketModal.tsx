import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ticketTransfersAPI } from '../../api/client';
import { useAlert } from '../../contexts/AlertContext';
import GradientButton from '../ui/GradientButton';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

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
  const { showSuccess, showError, showConfirm } = useAlert();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!recipientEmail.trim()) {
      newErrors.email = "L'email du destinataire est requis";
    } else if (!validateEmail(recipientEmail)) {
      newErrors.email = "Email invalide";
    }

    if (quantity < 1) {
      newErrors.quantity = "La quantité doit être au moins 1";
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

          // Reset form
          setRecipientEmail('');
          setRecipientName('');
          setQuantity(1);
          setMessage('');
          setErrors({});

          onTransferComplete();
          onClose();
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail ||
            error.response?.data?.message ||
            Object.values(error.response?.data || {}).flat().join(', ') ||
            'Erreur lors du transfert';
          showError('Erreur', errorMessage);
        } finally {
          setLoading(false);
        }
      },
      'Confirmer',
      'Annuler'
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
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Transférer un billet</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ticket Info */}
            <View style={styles.ticketInfo}>
              <Ionicons name="ticket-outline" size={24} color={Colors.primary} />
              <View style={styles.ticketDetails}>
                <Text style={styles.ticketName}>{ticket.ticket_type_name}</Text>
                <Text style={styles.ticketQuantity}>
                  {ticket.quantity} billet{ticket.quantity > 1 ? 's' : ''} disponible{ticket.quantity > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Recipient Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email du destinataire *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="exemple@email.com"
                placeholderTextColor={Colors.gray400}
                value={recipientEmail}
                onChangeText={(text) => {
                  setRecipientEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: '' });
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Recipient Name (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom du destinataire (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Jean Dupont"
                placeholderTextColor={Colors.gray400}
                value={recipientName}
                onChangeText={setRecipientName}
                autoCapitalize="words"
              />
            </View>

            {/* Quantity */}
            {ticket.quantity > 1 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de billets à transférer</Text>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity
                    style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                    onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={quantity <= 1 ? Colors.gray300 : Colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={[styles.quantityButton, quantity >= ticket.quantity && styles.quantityButtonDisabled]}
                    onPress={() => quantity < ticket.quantity && setQuantity(quantity + 1)}
                    disabled={quantity >= ticket.quantity}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={quantity >= ticket.quantity ? Colors.gray300 : Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.quantity && (
                  <Text style={styles.errorText}>{errors.quantity}</Text>
                )}
              </View>
            )}

            {/* Message (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message personnel (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ajouter un message pour le destinataire..."
                placeholderTextColor={Colors.gray400}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
              <Text style={styles.infoText}>
                Le destinataire recevra un email avec un lien pour accepter ou refuser le transfert.
                Le transfert expire après 48 heures.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <GradientButton
              title={loading ? 'Envoi...' : 'Transférer'}
              onPress={handleTransfer}
              disabled={loading || !recipientEmail.trim()}
              icon={loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
              style={styles.transferButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
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
    backgroundColor: Colors.primaryLight,
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
    color: Colors.gray900,
  },
  ticketQuantity: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
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
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  quantityButtonDisabled: {
    borderColor: Colors.gray100,
    backgroundColor: Colors.gray50,
  },
  quantityValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    minWidth: 40,
    textAlign: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.infoLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.info,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  transferButton: {
    flex: 1,
  },
});
