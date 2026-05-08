import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { authAPI } from '../../api';

interface VerificationBannerProps {
  compact?: boolean;
}

/**
 * Inline banner shown on tab screens when the email is not verified.
 */
export default function VerificationBanner({ compact = false }: VerificationBannerProps) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isAuthenticated || dismissed) return null;

  const emailVerified = Boolean(user?.email_verified);
  const authProvider = user?.auth_provider || 'email';
  const bypassSocial = authProvider !== 'email' && authProvider !== null;
  if (emailVerified || bypassSocial) return null;

  const handleResend = async () => {
    if (!user?.email || sending) return;
    setSending(true);
    try {
      await authAPI.resendVerificationEmail(user.email);
      Alert.alert(t('componentsAuth.verifyEmailSentTitle'), t('componentsAuth.verifyEmailSentMsg'));
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
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        { backgroundColor: Colors.warningBg, borderColor: '#FCD34D' },
      ]}
    >
      <Ionicons name="warning-outline" size={20} color="#B45309" />
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: '#78350F' }]} numberOfLines={1}>
          {t('componentsAuth.bannerTitle')}
        </Text>
        {!compact && (
          <Text style={[styles.subtitle, { color: '#92400E' }]} numberOfLines={2}>
            {user?.email
              ? t('componentsAuth.bannerSubtitleSent', { email: user.email })
              : t('componentsAuth.bannerSubtitleDefault')}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handleResend}
        disabled={sending}
        style={styles.resendBtn}
        accessibilityRole="button"
        accessibilityLabel={t('componentsAuth.bannerResendA11y')}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#78350F" />
        ) : (
          <Text style={[styles.resendText, { color: '#78350F' }]}>{t('componentsAuth.bannerResend')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setDismissed(true)}
        style={styles.closeBtn}
        accessibilityRole="button"
        accessibilityLabel={t('componentsAuth.bannerCloseA11y')}
        hitSlop={8}
      >
        <Ionicons name="close" size={16} color="#78350F" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  compactContainer: {
    paddingVertical: 8,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  resendBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FDE68A',
  },
  resendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
});
