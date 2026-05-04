import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { RootStackParamList } from '../../types';
import RoleGuard from '../../components/auth/RoleGuard';
import { siteSettingsAPI } from '../../api';
import { invalidateFeatureFlagsCache } from '../../hooks/useFeatureFlags';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface SiteSettings {
  ai_moderation_enabled?: boolean;
  ai_assist_enabled?: boolean;
  phone_otp_enabled?: boolean;
  sms_notifications_enabled?: boolean;
  sms_pre_payment_enabled?: boolean;
  sms_post_payment_enabled?: boolean;
  payout_approval_mode?: 'auto' | 'moderator' | 'admin_manual';
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value?: string;
  color?: string;
  onPress?: () => void;
  isLast?: boolean;
}

export default function PlatformSettingsScreen() {
  return (
    <RoleGuard allow={['admin']} watermark="CFG" title="Paramètres plateforme">
      <PlatformSettingsContent />
    </RoleGuard>
  );
}

function PlatformSettingsContent() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Toggle key qui est en train d'être patché — on désactive le Switch
  // correspondant pour éviter les double-clicks pendant le PATCH.
  const [patchingKey, setPatchingKey] = useState<keyof SiteSettings | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await siteSettingsAPI.get();
      setSettings(res.data || {});
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      showError('Erreur', detail || 'Impossible de charger les paramètres.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSettings();
  };

  const toggleBoolean = async (key: keyof SiteSettings) => {
    if (!settings || patchingKey) return;
    const next = !settings[key];
    setPatchingKey(key);
    // Optimistic update
    setSettings(prev => prev ? { ...prev, [key]: next } : prev);
    try {
      const res = await siteSettingsAPI.update({ [key]: next });
      setSettings(res.data || { ...settings, [key]: next });
      // Les flags publics sont cachés côté useFeatureFlags — invalider pour
      // que le prochain consumer voit la nouvelle valeur sans attendre 60s.
      if (key === 'phone_otp_enabled' || key === 'sms_notifications_enabled') {
        invalidateFeatureFlagsCache();
      }
      showSuccess('Mis à jour', 'Le paramètre a été enregistré.');
    } catch (error: any) {
      // Rollback optimistic
      setSettings(prev => prev ? { ...prev, [key]: !next } : prev);
      const detail = error?.response?.data?.detail;
      showError('Erreur', detail || 'Modification refusée.');
    } finally {
      setPatchingKey(null);
    }
  };

  const SettingRow = ({ icon, title, subtitle, value, color, onPress, isLast }: SettingRowProps) => {
    const tint = color || colors.primary;
    return (
      <TouchableOpacity
        style={[
          styles.settingRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: hairline },
        ]}
        onPress={onPress}
        activeOpacity={onPress ? 0.6 : 1}
        disabled={!onPress}
      >
        <View style={[styles.iconWell, { backgroundColor: `${tint}15` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>{subtitle}</Text>
        </View>
        {value && <Text style={[styles.settingValue, { color: tint }]}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.gray400} />}
      </TouchableOpacity>
    );
  };

  const ToggleRow = ({
    icon,
    title,
    subtitle,
    settingKey,
    color,
    isLast,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    settingKey: keyof SiteSettings;
    color: string;
    isLast?: boolean;
  }) => {
    const value = !!settings?.[settingKey];
    const isPatching = patchingKey === settingKey;
    return (
      <View
        style={[
          styles.settingRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: hairline },
        ]}
      >
        <View style={[styles.iconWell, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>{subtitle}</Text>
        </View>
        {isPatching ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Switch
            value={value}
            onValueChange={() => toggleBoolean(settingKey)}
            trackColor={{ false: colors.gray300, true: `${color}80` }}
            thumbColor={value ? color : colors.gray100}
            disabled={!!patchingKey}
          />
        )}
      </View>
    );
  };

  const sections: {
    title: string;
    rows: (Omit<SettingRowProps, 'isLast'> & { key: string })[];
  }[] = [
    {
      title: 'GÉNÉRAL',
      rows: [
        { key: 'name', icon: 'globe-outline', title: 'Nom de la plateforme', subtitle: 'Nom affiché aux utilisateurs', value: 'EventEz', color: '#4F46E5' },
        { key: 'tz', icon: 'time-outline', title: 'Fuseau horaire', subtitle: 'Fuseau horaire par défaut', value: 'Africa/Douala', color: '#4F46E5' },
        { key: 'lang', icon: 'language-outline', title: 'Langue', subtitle: 'Langue par défaut', value: 'Français', color: '#4F46E5' },
      ],
    },
    {
      title: 'PAIEMENTS',
      rows: [
        { key: 'gateway', icon: 'card-outline', title: 'Passerelle de paiement', subtitle: 'Service de paiement intégré', value: 'NotchPay', color: '#10B981' },
        { key: 'currency', icon: 'cash-outline', title: 'Devise', subtitle: 'Devise par défaut', value: 'XAF (FCFA)', color: '#10B981' },
        { key: 'commission', icon: 'calculator-outline', title: 'Commission', subtitle: 'Taux de commission plateforme', value: 'Variable', color: '#10B981' },
      ],
    },
    {
      title: 'SÉCURITÉ',
      rows: [
        { key: 'jwt', icon: 'key-outline', title: 'Tokens JWT', subtitle: 'Durée de vie des tokens', value: '15min / 7j', color: '#F59E0B' },
        { key: 'mod', icon: 'shield-checkmark-outline', title: 'Modération', subtitle: 'Validation requise pour publier', value: 'Active', color: '#F59E0B' },
        { key: 'audit', icon: 'document-text-outline', title: 'Audit', subtitle: 'Journalisation des actions', value: 'Actif', color: '#F59E0B' },
      ],
    },
    {
      title: 'INFRASTRUCTURE',
      rows: [
        { key: 'db', icon: 'server-outline', title: 'Base de données', subtitle: 'Type et nom', value: 'PostgreSQL', color: '#A855F7' },
        { key: 'cache', icon: 'flash-outline', title: 'Cache & Queues', subtitle: 'Celery + Redis', value: 'Redis', color: '#A855F7' },
        { key: 'ws', icon: 'wifi-outline', title: 'WebSocket', subtitle: 'Messagerie temps réel', value: 'Channels', color: '#A855F7' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>LE MOTEUR</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Paramètres plateforme</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* === FLAGS ÉDITABLES (POST /api/site-settings/) === */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>FONCTIONNALITÉS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.gray500 }]}>
                Chargement des paramètres...
              </Text>
            </View>
          ) : (
            <>
              <ToggleRow
                icon="sparkles-outline"
                title="Modération IA"
                subtitle="Validation auto des events par Claude"
                settingKey="ai_moderation_enabled"
                color="#8B5CF6"
              />
              <ToggleRow
                icon="bulb-outline"
                title="Assistant IA création"
                subtitle="Suggestions auto à la création d'event"
                settingKey="ai_assist_enabled"
                color="#8B5CF6"
              />
              <ToggleRow
                icon="phone-portrait-outline"
                title="OTP par téléphone"
                subtitle="Permettre la connexion via SMS"
                settingKey="phone_otp_enabled"
                color="#10B981"
              />
              <ToggleRow
                icon="chatbox-outline"
                title="Notifications SMS"
                subtitle="Activer le canal SMS global"
                settingKey="sms_notifications_enabled"
                color="#10B981"
              />
              <ToggleRow
                icon="card-outline"
                title="SMS pré-paiement"
                subtitle="Confirmation avant débit MoMo"
                settingKey="sms_pre_payment_enabled"
                color="#F59E0B"
              />
              <ToggleRow
                icon="receipt-outline"
                title="SMS post-paiement"
                subtitle="Reçu SMS après transaction"
                settingKey="sms_post_payment_enabled"
                color="#F59E0B"
                isLast
              />
            </>
          )}
        </View>

        {sections.map((section) => (
          <React.Fragment key={section.title}>
            <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
              {section.rows.map((row, idx) => {
                const { key, ...rest } = row;
                return <SettingRow key={key} {...rest} isLast={idx === section.rows.length - 1} />;
              })}
            </View>
          </React.Fragment>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  settingSubtitle: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  settingValue: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
});
