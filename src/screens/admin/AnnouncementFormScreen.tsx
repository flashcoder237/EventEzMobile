/**
 * AnnouncementFormScreen — création / édition d'une annonce.
 *
 * Mode dérivé du paramètre de route :
 *   { announcementId } absent → création
 *   { announcementId } présent → édition (fetch + pré-remplissage)
 *
 * Le formulaire ne gère pas les datepickers natifs ici — les fenêtres de
 * validité s'entrent en ISO YYYY-MM-DDTHH:mm (string libre). Pour des dates
 * complexes, l'admin Django reste plus confortable. La majorité des annonces
 * créées depuis mobile sont "à effet immédiat, sans échéance" → champs vides.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import RoleGuard from '../../components/auth/RoleGuard';
import { announcementsAPI, AnnouncementAdminPayload } from '../../api';
import {
  AnnouncementSeverity,
  AnnouncementAudience,
  AnnouncementPlatform,
  RootStackParamList,
} from '../../types';
import {
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, FORM_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AnnouncementForm'>;
type ScreenRoute = RouteProp<RootStackParamList, 'AnnouncementForm'>;

export default function AnnouncementFormScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.announcements.form.watermark')} title={t('admin.announcements.form.guardTitle')}>
      <AnnouncementFormContent />
    </RoleGuard>
  );
}

function AnnouncementFormContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRoute>();
  const announcementId = route.params?.announcementId;
  const isEdit = !!announcementId;

  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useAlert();
  const SEVERITY_OPTIONS: { value: AnnouncementSeverity; label: string; color: string }[] = [
    { value: 'info', label: t('admin.announcements.form.severityInfo'), color: '#3B82F6' },
    { value: 'warning', label: t('admin.announcements.form.severityWarning'), color: '#F59E0B' },
    { value: 'critical', label: t('admin.announcements.form.severityCritical'), color: '#EF4444' },
  ];
  const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
    { value: 'all', label: t('admin.announcements.form.audienceAll') },
    { value: 'users', label: t('admin.announcements.form.audienceUsers') },
    { value: 'organizers', label: t('admin.announcements.form.audienceOrganizers') },
    { value: 'admins', label: t('admin.announcements.form.audienceAdmins') },
  ];
  const PLATFORM_OPTIONS: { value: AnnouncementPlatform; label: string }[] = [
    { value: 'all', label: t('admin.announcements.form.platformAll') },
    { value: 'mobile', label: t('admin.announcements.form.platformMobile') },
    { value: 'mobile_ios', label: t('admin.announcements.form.platformIos') },
    { value: 'mobile_android', label: t('admin.announcements.form.platformAndroid') },
    { value: 'web', label: t('admin.announcements.form.platformWeb') },
  ];
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? colors.gray100 : colors.gray50;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AnnouncementSeverity>('info');
  const [isDismissible, setIsDismissible] = useState(true);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [platform, setPlatform] = useState<AnnouncementPlatform>('all');
  const [minVersion, setMinVersion] = useState('');
  const [maxVersion, setMaxVersion] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!isEdit || !announcementId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await announcementsAPI.get(announcementId);
        if (cancelled) return;
        const a = res.data;
        setTitle(a.title || '');
        setMessage(a.message || '');
        setSeverity(a.severity || 'info');
        setIsDismissible(a.is_dismissible ?? true);
        setCtaLabel(a.cta_label || '');
        setCtaUrl(a.cta_url || '');
        setAudience(a.audience || 'all');
        setPlatform(a.platform || 'all');
        setMinVersion(a.target_min_app_version || '');
        setMaxVersion(a.target_max_app_version || '');
        setValidFrom(a.valid_from || '');
        setValidUntil(a.valid_until || '');
        setIsPublished(a.is_published ?? false);
      } catch (error: any) {
        const detail = error?.response?.data?.detail;
        showError(t('common.error'), detail || t('admin.announcements.form.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [announcementId, isEdit, showError]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !message.trim()) {
      showError(t('admin.announcements.form.validationTitle'), t('admin.announcements.form.validationMessage'));
      return;
    }
    setSaving(true);
    const payload: AnnouncementAdminPayload = {
      title: title.trim(),
      message: message.trim(),
      severity,
      is_dismissible: isDismissible,
      cta_label: ctaLabel.trim(),
      cta_url: ctaUrl.trim(),
      audience,
      platform,
      target_min_app_version: minVersion.trim(),
      target_max_app_version: maxVersion.trim(),
      valid_from: validFrom.trim() || null,
      valid_until: validUntil.trim() || null,
      is_published: isPublished,
    };
    try {
      if (isEdit && announcementId) {
        await announcementsAPI.update(announcementId, payload);
      } else {
        await announcementsAPI.create(payload);
      }
      showSuccess(isEdit ? t('admin.announcements.form.updateSuccess') : t('admin.announcements.form.createSuccess'));
      navigation.goBack();
    } catch (error: any) {
      const data = error?.response?.data;
      // Erreurs DRF par champ : on affiche le premier message rencontré
      const firstError =
        (data && typeof data === 'object' && Object.values(data)[0]) ||
        data?.detail ||
        t('admin.announcements.form.saveError');
      const msg = Array.isArray(firstError) ? String(firstError[0]) : String(firstError);
      showError(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  }, [
    title,
    message,
    severity,
    isDismissible,
    ctaLabel,
    ctaUrl,
    audience,
    platform,
    minVersion,
    maxVersion,
    validFrom,
    validUntil,
    isPublished,
    isEdit,
    announcementId,
    showError,
    showSuccess,
    navigation,
    t,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.announcements.form.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEdit ? t('admin.announcements.form.titleEdit') : t('admin.announcements.form.titleNew')}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Contenu */}
          <Section title={t('admin.announcements.form.sectionContent')} colors={colors}>
            <Field label={t('admin.announcements.form.fieldTitle')} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('admin.announcements.form.fieldTitlePlaceholder')}
                placeholderTextColor={colors.gray400}
                maxLength={200}
              />
            </Field>
            <Field label={t('admin.announcements.form.fieldMessage')} colors={colors}>
              <TextInput
                style={[styles.input, styles.inputMulti, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={message}
                onChangeText={setMessage}
                placeholder={t('admin.announcements.form.fieldMessagePlaceholder')}
                placeholderTextColor={colors.gray400}
                multiline
                textAlignVertical="top"
              />
            </Field>
            <Field label={t('admin.announcements.form.fieldSeverity')} colors={colors}>
              <View style={styles.pillRow}>
                {SEVERITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pill,
                      severity === opt.value
                        ? { backgroundColor: opt.color, borderColor: opt.color }
                        : { borderColor: hairline },
                    ]}
                    onPress={() => setSeverity(opt.value)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: severity === opt.value ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <ToggleField
              label={t('admin.announcements.form.fieldDismissible')}
              hint={t('admin.announcements.form.fieldDismissibleHint')}
              value={isDismissible}
              onChange={setIsDismissible}
              colors={colors}
            />
          </Section>

          {/* CTA */}
          <Section title={t('admin.announcements.form.sectionAction')} colors={colors}>
            <Field label={t('admin.announcements.form.fieldCtaLabel')} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={ctaLabel}
                onChangeText={setCtaLabel}
                placeholder={t('admin.announcements.form.fieldCtaLabelPlaceholder')}
                placeholderTextColor={colors.gray400}
                maxLength={64}
              />
            </Field>
            <Field label={t('admin.announcements.form.fieldCtaUrl')} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={ctaUrl}
                onChangeText={setCtaUrl}
                placeholder="https://..."
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </Field>
          </Section>

          {/* Ciblage */}
          <Section title={t('admin.announcements.form.sectionTargeting')} colors={colors}>
            <Field label={t('admin.announcements.form.fieldAudience')} colors={colors}>
              <View style={styles.pillRow}>
                {AUDIENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pill,
                      audience === opt.value
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { borderColor: hairline },
                    ]}
                    onPress={() => setAudience(opt.value)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: audience === opt.value ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <Field label={t('admin.announcements.form.fieldPlatform')} colors={colors}>
              <View style={styles.pillRow}>
                {PLATFORM_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pill,
                      platform === opt.value
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { borderColor: hairline },
                    ]}
                    onPress={() => setPlatform(opt.value)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: platform === opt.value ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <Field label={t('admin.announcements.form.fieldMinVersion')} colors={colors} hint={t('admin.announcements.form.fieldMinVersionHint')}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={minVersion}
                onChangeText={setMinVersion}
                placeholder="1.0.0"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
              />
            </Field>
            <Field label={t('admin.announcements.form.fieldMaxVersion')} colors={colors} hint={t('admin.announcements.form.fieldMaxVersionHint')}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={maxVersion}
                onChangeText={setMaxVersion}
                placeholder="1.4.9"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
              />
            </Field>
          </Section>

          {/* Publication */}
          <Section title={t('admin.announcements.form.sectionPublication')} colors={colors}>
            <ToggleField
              label={t('admin.announcements.form.fieldPublish')}
              hint={t('admin.announcements.form.fieldPublishHint')}
              value={isPublished}
              onChange={setIsPublished}
              colors={colors}
            />
            <Field label={t('admin.announcements.form.fieldValidFrom')} colors={colors} hint={t('admin.announcements.form.fieldValidFromHint')}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={validFrom}
                onChangeText={setValidFrom}
                placeholder="2026-05-15T08:00:00Z"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <Field label={t('admin.announcements.form.fieldValidUntil')} colors={colors} hint={t('admin.announcements.form.fieldValidUntilHint')}>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="2026-05-20T23:59:00Z"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
          </Section>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>{isEdit ? t('admin.announcements.form.save') : t('admin.announcements.form.create')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sous-composants compactés ───────────────────────────────────────────

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>{title}</Text>
      <View style={{ gap: Spacing.md }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  hint,
  children,
  colors,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.gray500 }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function ToggleField({
  label,
  hint,
  value,
  onChange,
  colors,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.gray500 }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.gray300, true: `${colors.primary}80` }}
        thumbColor={value ? colors.primary : colors.gray100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: { fontFamily: FontFamily.bold, fontSize: 10, letterSpacing: 1.4, marginBottom: 2 },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['2xl'], ...centeredContent(FORM_MAX) },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    marginBottom: 4,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    minHeight: 42,
  },
  inputMulti: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  pillText: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  saveBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
