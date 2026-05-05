/**
 * ClientReleaseAdminScreen — édite la version min supportée + URLs des stores.
 *
 * Singleton côté backend (1 seule ligne). PATCH partiel : on n'écrase que les
 * champs renseignés. Vider un champ revient à le passer en chaîne vide → le
 * client mobile considérera alors qu'il n'y a pas de gate (cf.
 * ForceUpdateGate.needsUpdate qui vérifie minSupported truthy).
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import RoleGuard from '../../components/auth/RoleGuard';
import { clientReleaseAPI } from '../../api';
import { RootStackParamList } from '../../types';
import {
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClientReleaseAdminScreen() {
  return (
    <RoleGuard allow={['admin']} watermark="VER" title="Versions client">
      <ClientReleaseAdminContent />
    </RoleGuard>
  );
}

function ClientReleaseAdminContent() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? colors.gray100 : colors.gray50;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [minVersion, setMinVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [forceMessage, setForceMessage] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await clientReleaseAPI.get();
        if (cancelled) return;
        const d = res.data || {};
        setMinVersion(d.mobile_min_supported_version || '');
        setLatestVersion(d.mobile_latest_version || '');
        setForceMessage(d.mobile_force_update_message || '');
        setIosUrl(d.ios_store_url || '');
        setAndroidUrl(d.android_store_url || '');
      } catch (error: any) {
        const detail = error?.response?.data?.detail;
        showError('Erreur', detail || 'Impossible de charger la configuration.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await clientReleaseAPI.update({
        mobile_min_supported_version: minVersion.trim(),
        mobile_latest_version: latestVersion.trim(),
        mobile_force_update_message: forceMessage,
        ios_store_url: iosUrl.trim(),
        android_store_url: androidUrl.trim(),
      });
      showSuccess('Configuration enregistrée');
      navigation.goBack();
    } catch (error: any) {
      const data = error?.response?.data;
      const firstError =
        (data && typeof data === 'object' && Object.values(data)[0]) ||
        data?.detail ||
        'Échec de la sauvegarde.';
      const msg = Array.isArray(firstError) ? String(firstError[0]) : String(firstError);
      showError('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

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
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>FORCE UPDATE</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Versions client</Text>
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
          <View style={[styles.alertBox, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }]}>
            <Ionicons name="warning" size={18} color="#F59E0B" />
            <Text style={[styles.alertText, { color: colors.text }]}>
              Toute version inférieure à <Text style={{ fontFamily: FontFamily.bold }}>min. supportée</Text> sera bloquée par un modal qui force la mise à jour.
            </Text>
          </View>

          <Field label="Version minimum supportée" colors={colors} hint="Format semver (1.2.0). Vide = aucun gate.">
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
              value={minVersion}
              onChangeText={setMinVersion}
              placeholder="1.0.0"
              placeholderTextColor={colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          <Field label="Dernière version disponible" colors={colors} hint="Indicatif — futures bannières 'mise à jour disponible'.">
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
              value={latestVersion}
              onChangeText={setLatestVersion}
              placeholder="1.2.0"
              placeholderTextColor={colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          <Field
            label="Message du modal force-update"
            colors={colors}
            hint="Affiché aux utilisateurs bloqués. Vide = texte par défaut."
          >
            <TextInput
              style={[styles.input, styles.inputMulti, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
              value={forceMessage}
              onChangeText={setForceMessage}
              placeholder="Cette version contient des correctifs de sécurité critiques..."
              placeholderTextColor={colors.gray400}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label="URL App Store (iOS)" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
              value={iosUrl}
              onChangeText={setIosUrl}
              placeholder="https://apps.apple.com/app/..."
              placeholderTextColor={colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </Field>

          <Field label="URL Play Store (Android)" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: hairline }]}
              value={androidUrl}
              onChangeText={setAndroidUrl}
              placeholder="https://play.google.com/store/apps/details?id=..."
              placeholderTextColor={colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </Field>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.gray500 }]}>{hint}</Text> : null}
      {children}
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
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  alertText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, marginBottom: 4 },
  hint: { fontFamily: FontFamily.regular, fontSize: 11, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    minHeight: 42,
  },
  inputMulti: { minHeight: 100, paddingTop: Spacing.sm },
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
