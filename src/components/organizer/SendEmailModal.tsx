import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { registrationsAPI } from '../../api/client';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

interface SendEmailModalProps {
  visible: boolean;
  onClose: () => void;
  registrationIds: string[];
}

function SendEmailModal({ visible, onClose, registrationIds }: SendEmailModalProps) {
  const { colors } = useTheme();
  const { showSuccess, showError } = useAlert();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      showError('Erreur', 'Veuillez remplir le sujet et le message');
      return;
    }

    setSending(true);
    try {
      await registrationsAPI.sendEmail({
        registration_ids: registrationIds,
        subject: subject.trim(),
        message: message.trim(),
      });
      showSuccess('Succes', `Email envoye a ${registrationIds.length} participant${registrationIds.length > 1 ? 's' : ''}`);
      setSubject('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Erreur envoi email:', error);
      showError('Erreur', 'Impossible d\'envoyer l\'email');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSubject('');
      setMessage('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.overlay}>
          <View style={[styles.content, { backgroundColor: colors.card }]}>
            <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.title, { color: colors.gray900 }]}>
                Envoyer un email
              </Text>
              <TouchableOpacity onPress={handleClose} disabled={sending}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.badge}>
              <Ionicons name="people" size={16} color="#7C3AED" />
              <Text style={[styles.badgeText, { color: colors.gray600 }]}>
                {registrationIds.length} destinataire{registrationIds.length > 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.body}>
              <Text style={[styles.label, { color: colors.gray700 }]}>Sujet</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 }]}
                value={subject}
                onChangeText={setSubject}
                placeholder="Sujet de l'email..."
                placeholderTextColor={colors.gray400}
              />

              <Text style={[styles.label, { color: colors.gray700 }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Votre message..."
                placeholderTextColor={colors.gray400}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.footer, { borderTopColor: colors.gray100 }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.gray100 }]}
                onPress={handleClose}
                disabled={sending}
              >
                <Text style={[styles.cancelText, { color: colors.gray700 }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: '#7C3AED' }]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.sendText}>Envoyer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(SendEmailModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  body: {
    padding: Spacing.lg,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
  },
  textArea: {
    minHeight: 120,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  sendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
  },
});
