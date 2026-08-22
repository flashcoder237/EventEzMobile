import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { dispatchAfterAuth } from '../../lib/utils/authNavigation';
import { RootStackParamList } from '../../types';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import PhoneNumberInput from '../../components/common/PhoneNumberInput';
import { centeredContent, FORM_MAX } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CompleteProfile'>;
type ScreenRoute = RouteProp<RootStackParamList, 'CompleteProfile'>;

/**
 * Complétion de profil après une 1re inscription via Google/Apple.
 * Le login social ne fournit que nom + email : on propose ici téléphone,
 * nom d'utilisateur, et le passage organisateur. Entièrement SKIPPABLE.
 * Navigué uniquement quand le compte vient d'être créé (result.created).
 */
export default function CompleteProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRoute>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const { showError } = useAlert();

  const returnScreen = route.params?.returnScreen ?? null;
  const returnParams = route.params?.returnParams;

  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [wantsOrganizer, setWantsOrganizer] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const finish = (freshUser?: any) => {
    dispatchAfterAuth(navigation as any, freshUser ?? user, returnScreen, returnParams);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (phone.trim()) patch.phone_number = phone.trim();
      if (username.trim()) patch.username = username.trim();
      if (Object.keys(patch).length > 0) {
        await usersAPI.updateCurrentUser(patch);
      }
      if (wantsOrganizer) {
        await usersAPI.becomeOrganizer({
          organizer_type: 'individual',
          phone: phone.trim() || undefined,
          company_name: companyName.trim() || undefined,
        });
      }
      // Rafraîchit le user pour refléter le nouveau rôle / téléphone.
      try { await refreshUser(); } catch { /* non bloquant */ }
      finish();
    } catch (e: any) {
      showError(
        t('common.error'),
        getApiErrorMessage(e, t, { fallbackKey: 'auth.completeProfile.error' }).message,
      );
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.completeProfile.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.completeProfile.subtitle')}
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>{t('auth.completeProfile.phoneLabel')}</Text>
          <PhoneNumberInput
            value={phone}
            onChangeValue={setPhone}
            placeholder={t('auth.completeProfile.phonePlaceholder')}
          />

          <Text style={[styles.label, { color: colors.text, marginTop: Spacing.lg }]}>
            {t('auth.completeProfile.usernameLabel')}
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.completeProfile.usernamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          />

          {/* Devenir organisateur */}
          <TouchableOpacity
            onPress={() => setWantsOrganizer((v) => !v)}
            activeOpacity={0.8}
            style={[
              styles.orgToggle,
              {
                borderColor: wantsOrganizer ? colors.primary : colors.border,
                backgroundColor: wantsOrganizer ? colors.primary + '12' : colors.card,
              },
            ]}
          >
            <Ionicons
              name={wantsOrganizer ? 'checkbox' : 'square-outline'}
              size={22}
              color={wantsOrganizer ? colors.primary : colors.textSecondary}
            />
            <View style={styles.orgTextWrap}>
              <Text style={[styles.orgTitle, { color: colors.text }]}>
                {t('auth.completeProfile.organizerTitle')}
              </Text>
              <Text style={[styles.orgDesc, { color: colors.textSecondary }]}>
                {t('auth.completeProfile.organizerDesc')}
              </Text>
            </View>
          </TouchableOpacity>

          {wantsOrganizer && (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: Spacing.lg }]}>
                {t('auth.completeProfile.companyLabel')}
              </Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={t('auth.completeProfile.companyPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              />
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>{t('auth.completeProfile.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => finish()} disabled={isSaving} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {t('auth.completeProfile.skip')}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingTop: Spacing['2xl'], flexGrow: 1, ...centeredContent(FORM_MAX) },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20, alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold, fontSize: FontSizes.xl, textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular, fontSize: FontSizes.sm, textAlign: 'center',
    marginTop: Spacing.xs, marginBottom: Spacing.xl, lineHeight: 20,
  },
  form: { marginBottom: Spacing.xl },
  label: {
    fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, fontFamily: FontFamily.regular, fontSize: FontSizes.md,
  },
  orgToggle: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderWidth: 1,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.lg,
  },
  orgTextWrap: { flex: 1 },
  orgTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  orgDesc: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2, lineHeight: 16 },
  saveBtn: {
    borderRadius: BorderRadius.full, paddingVertical: Spacing.md, alignItems: 'center',
  },
  saveText: { fontFamily: FontFamily.bold, fontSize: FontSizes.md, color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.lg },
  skipText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
});
