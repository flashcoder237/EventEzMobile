import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { registrationsAPI } from '../../api';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

interface SendEmailModalProps {
  visible: boolean;
  onClose: () => void;
  registrationIds: string[];
}

function SendEmailModal({ visible, onClose, registrationIds }: SendEmailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useAlert();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

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
      showSuccess(
        'Succès',
        `Email envoyé à ${registrationIds.length} participant${registrationIds.length > 1 ? 's' : ''}`
      );
      setSubject('');
      setMessage('');
      onClose();
    } catch (error) {
      if (__DEV__) console.error('Erreur envoi email:', error);
      showError('Erreur', "Impossible d'envoyer l'email");
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

      {/* KAV wraps the sheet so it moves up with keyboard */}
      <KeyboardAvoidingView
        style={[StyleSheet.absoluteFill, styles.kav]}
        behavior="padding"
        pointerEvents="box-none"
      >
        <Reanimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.lg),
            },
            sheetAnim,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <Text style={[styles.title, { color: colors.gray900 }]}>
              Envoyer un email
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={sending}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {/* Recipients badge */}
          <View style={styles.badge}>
            <Ionicons name="people" size={16} color={Colors.primary} />
            <Text style={[styles.badgeText, { color: colors.gray600 }]}>
              {registrationIds.length} destinataire{registrationIds.length > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.gray700 }]}>Sujet</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.gray50,
                  color: colors.gray900,
                  borderColor: colors.gray200,
                },
              ]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Sujet de l'email..."
              placeholderTextColor={colors.gray400}
            />

            <Text style={[styles.label, { color: colors.gray700 }]}>Message</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.gray50,
                  color: colors.gray900,
                  borderColor: colors.gray200,
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Votre message..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.gray100 }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.gray100 }]}
              onPress={handleClose}
              disabled={sending}
            >
              <Text style={[styles.cancelText, { color: colors.gray700 }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: Colors.primary }]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={Colors.white} />
                  <Text style={styles.sendText}>Envoyer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(SendEmailModal);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
    color: Colors.white,
  },
});
