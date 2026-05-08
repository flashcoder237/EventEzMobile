import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { eventBus } from '../../lib/eventBus';
import { authAPI } from '../../api';
import { Colors, FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import GradientButton from '../ui/GradientButton';

/**
 * Modal globale qui s'ouvre quand une action protégée est tentée par un
 * utilisateur dont l'email n'est pas vérifié.
 *
 * Écoute deux évènements :
 *  - 'verification-required'  → déclenché par useVerificationGuard
 *  - 'api-verification-required' → déclenché par l'intercepteur API (403)
 */
export default function VerificationGuardModal() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const openHandler = (detail?: { message?: string }) => {
      setMessage(detail?.message || null);
      setVisible(true);
    };
    const unsub1 = eventBus.on('verification-required', openHandler);
    const unsub2 = eventBus.on('api-verification-required', openHandler);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const handleResend = async () => {
    if (!user?.email || sending) return;
    setSending(true);
    try {
      await authAPI.resendVerificationEmail(user.email);
      Alert.alert(
        t('componentsAuth.verifyEmailSentTitle'),
        t('componentsAuth.verifyEmailSentMsg'),
      );
      setVisible(false);
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err?.response?.data?.detail || t('componentsAuth.verifyResendError'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={() => setVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => {}}
        >
          <View style={[styles.iconWrap, { backgroundColor: Colors.warningBg }]}>
            <Ionicons name="shield-checkmark" size={32} color="#B45309" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {t('componentsAuth.verifyModalTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {message || t('componentsAuth.verifyModalDefault')}
          </Text>
          {user?.email && (
            <Text style={[styles.email, { color: colors.primary }]}>
              {user.email}
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={[styles.secondaryBtn, { backgroundColor: colors.gray100 }]}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>
                {t('componentsAuth.verifyModalLater')}
              </Text>
            </TouchableOpacity>
            <View style={styles.primaryWrap}>
              <GradientButton
                title={sending ? '' : t('componentsAuth.verifyModalSendLink')}
                onPress={handleResend}
                disabled={sending || !user?.email}
                size="md"
                fullWidth
              />
              {sending && (
                <View style={styles.loaderOverlay} pointerEvents="none">
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  email: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  primaryWrap: {
    flex: 1,
    position: 'relative',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
