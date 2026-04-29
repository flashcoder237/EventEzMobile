import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { usersAPI } from '../../api';
import { RootStackParamList } from '../../types';
import {
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─────────────────────────────────────────────────────────
// Soft toggle — uses platform Switch tinted with theme colors
// ─────────────────────────────────────────────────────────
const SoftToggle = ({
  value,
  onToggle,
  disabled,
}: {
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) => {
  const { colors, isDark } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      trackColor={{
        false: isDark ? colors.gray200 : colors.gray300,
        true: colors.primary,
      }}
      thumbColor={isDark ? colors.card : '#FFFFFF'}
      ios_backgroundColor={isDark ? colors.gray200 : colors.gray300}
    />
  );
};

// ─────────────────────────────────────────────────────────
// Soft option row — rounded card with subtle border & shadow
// ─────────────────────────────────────────────────────────
interface OptionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  tone?: 'default' | 'primary' | 'accent' | 'secondary';
}

const OptionCard = ({
  icon,
  eyebrow,
  title,
  subtitle,
  right,
  onPress,
  disabled,
  danger,
  tone = 'default',
}: OptionCardProps) => {
  const { colors, isDark } = useTheme();

  const cardBg = danger
    ? isDark
      ? 'rgba(255,107,107,0.08)'
      : '#FFF5F5'
    : colors.card;
  const borderCol = danger
    ? colors.accent
    : isDark
    ? colors.gray200
    : 'rgba(0,0,0,0.05)';

  const iconBg =
    tone === 'primary'
      ? `${colors.primary}15`
      : tone === 'accent'
      ? `${colors.accent}15`
      : tone === 'secondary'
      ? `${colors.secondary || colors.primary}15`
      : danger
      ? `${colors.accent}15`
      : isDark
      ? colors.gray100
      : colors.gray50;
  const iconColor =
    tone === 'primary'
      ? colors.primary
      : tone === 'accent'
      ? colors.accent
      : tone === 'secondary'
      ? colors.secondary || colors.primary
      : danger
      ? colors.accent
      : colors.gray600;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        optionStyles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderCol,
          opacity: disabled ? 0.55 : 1,
        },
        Shadows.sm,
      ]}
    >
      <View style={[optionStyles.iconDisc, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={optionStyles.body}>
        <Text
          style={[
            optionStyles.eyebrow,
            { color: danger ? colors.accent : colors.gray500 },
          ]}
          numberOfLines={1}
        >
          {eyebrow}
        </Text>
        <Text
          style={[
            optionStyles.title,
            { color: danger ? colors.accent : colors.text },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[optionStyles.subtitle, { color: colors.gray500 }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Wrapper>
  );
};

const optionStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
});

// ─────────────────────────────────────────────────────────
// Shortcut tile — soft rounded square with colored icon disc
// ─────────────────────────────────────────────────────────
interface ShortcutTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  tone: 'primary' | 'accent' | 'secondary' | 'neutral';
}

const ShortcutTile = ({ icon, label, onPress, tone }: ShortcutTileProps) => {
  const { colors, isDark } = useTheme();
  const tint =
    tone === 'primary'
      ? colors.primary
      : tone === 'accent'
      ? colors.accent
      : tone === 'secondary'
      ? colors.secondary || colors.primary
      : colors.gray500;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={shortcutStyles.wrap}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          shortcutStyles.tile,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.05)',
          },
          Shadows.sm,
        ]}
      >
        <View style={[shortcutStyles.iconWell, { backgroundColor: `${tint}15` }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
      </View>
      <Text
        style={[shortcutStyles.label, { color: colors.gray700 }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const shortcutStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  tile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  const { showAlert, showError, showConfirm } = useAlert();
  const { colors, isDark, mode: themeMode, setMode: setThemeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Effets sonores
  const { enabled: soundsEnabled, setEnabled: setSoundsEnabled, play: playSound } = useSoundEffect();

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Confidentialité (P19)
  const [showInAttendees, setShowInAttendees] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  // Préférences
  const [language, setLanguage] = useState('fr');
  const [timezone, setTimezone] = useState('Africa/Douala');

  // Sécurité
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getUserSettings();
      const settings = response.data;

      if (settings) {
        setEmailNotifications(settings.email_notifications ?? true);
        setPushNotifications(settings.push_notifications ?? true);
        setSmsNotifications(settings.sms_notifications ?? false);
        setEventReminders(settings.event_reminders ?? true);
        setMarketingEmails(settings.marketing_emails ?? false);
        setLanguage(settings.language ?? 'fr');
        setTimezone(settings.timezone ?? 'Africa/Douala');
        setTwoFactorAuth(settings.two_factor_auth ?? false);
        setLoginNotifications(settings.login_notifications ?? true);
        setPublicProfile(settings.public_profile ?? true);
        setShowInAttendees(settings.show_in_attendees ?? true);
        setShowReadReceipts(settings.show_read_receipts ?? true);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: boolean | string) => {
    try {
      await usersAPI.updateUserSettings({ [key]: value });
    } catch (error) {
      if (__DEV__) console.error('Erreur mise à jour:', error);
      fetchSettings();
    }
  };

  const handleToggle = (
    key: string,
    value: boolean,
    setter: (v: boolean) => void
  ) => {
    setter(value);
    handleUpdateSetting(key, value);
  };

  const handleLogout = () => {
    showConfirm(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      logout
    );
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showError('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }

    setSaving(true);
    try {
      await usersAPI.deleteAccount({
        password: deletePassword,
        reason: deleteReason,
      });
      setShowDeleteModal(false);
      logout();
    } catch (error: any) {
      if (__DEV__) console.error('Erreur suppression compte:', error);
      showError(
        'Erreur',
        error.response?.data?.detail || 'Impossible de supprimer le compte'
      );
    } finally {
      setSaving(false);
    }
  };

  const getLanguageLabel = () => {
    switch (language) {
      case 'fr': return 'Français';
      case 'en': return 'English';
      default: return 'Français';
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Clair';
      case 'dark': return 'Sombre';
      case 'system': return 'Système';
      default: return 'Clair';
    }
  };

  const getTimezoneLabel = () => {
    switch (timezone) {
      case 'Africa/Douala': return 'Douala (GMT+1)';
      case 'Europe/Paris': return 'Paris (GMT+1)';
      case 'UTC': return 'UTC';
      case 'America/New_York': return 'New York (GMT-5)';
      default: return 'Douala (GMT+1)';
    }
  };

  const showLanguagePicker = () => {
    showAlert(
      'Langue',
      'Choisissez votre langue',
      [
        { text: 'Français', onPress: () => { setLanguage('fr'); handleUpdateSetting('language', 'fr'); } },
        { text: 'English', onPress: () => { setLanguage('en'); handleUpdateSetting('language', 'en'); } },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const showThemePicker = () => {
    showAlert(
      'Thème',
      'Choisissez votre thème',
      [
        { text: 'Clair', onPress: () => { setThemeMode('light'); handleUpdateSetting('theme', 'light'); } },
        { text: 'Sombre', onPress: () => { setThemeMode('dark'); handleUpdateSetting('theme', 'dark'); } },
        { text: 'Système', onPress: () => { setThemeMode('system'); handleUpdateSetting('theme', 'system'); } },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const showTimezonePicker = () => {
    showAlert(
      'Fuseau horaire',
      'Choisissez votre fuseau horaire',
      [
        { text: 'Douala (GMT+1)', onPress: () => { setTimezone('Africa/Douala'); handleUpdateSetting('timezone', 'Africa/Douala'); } },
        { text: 'Paris (GMT+1)', onPress: () => { setTimezone('Europe/Paris'); handleUpdateSetting('timezone', 'Europe/Paris'); } },
        { text: 'UTC', onPress: () => { setTimezone('UTC'); handleUpdateSetting('timezone', 'UTC'); } },
        { text: 'New York (GMT-5)', onPress: () => { setTimezone('America/New_York'); handleUpdateSetting('timezone', 'America/New_York'); } },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const eyebrowColor = colors.gray500;
  const sectionHairline = isDark ? colors.gray200 : colors.gray100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header: back disc + eyebrow (rounded bottom card style) */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: isDark ? colors.border : 'rgba(255,255,255,0.5)',
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backDisc,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
              },
              Shadows.sm,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>RÉGLAGES</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Préférences</Text>
          </View>
        </View>
        <Text style={[styles.headerLead, { color: colors.gray500 }]}>
          Règle ton app, ta confidentialité et tes notifications. Rien de compliqué, tout au bon endroit.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shortcuts */}
        <View style={styles.shortcutsBlock}>
          <View style={styles.shortcutsHeader}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>RACCOURCIS</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>
          <View style={styles.shortcutsRow}>
            <ShortcutTile
              icon="receipt-outline"
              label="Factures"
              tone="primary"
              onPress={() => navigation.navigate('MyPayments')}
            />
            <ShortcutTile
              icon="cash-outline"
              label="Fiscalité"
              tone="secondary"
              onPress={() => navigation.navigate('MyPayments')}
            />
            <ShortcutTile
              icon="calendar-outline"
              label="Mes Évén."
              tone="primary"
              onPress={() => navigation.navigate('Main', { screen: 'Tickets' } as any)}
            />
            <ShortcutTile
              icon="help-circle-outline"
              label="Aide"
              tone="accent"
            />
          </View>
        </View>

        {/* Section: Notifications */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>NOTIFICATIONS</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>

          <OptionCard
            icon="mail-outline"
            eyebrow="EMAIL"
            title="Notifications par email"
            right={
              <SoftToggle
                value={emailNotifications}
                onToggle={(v) => handleToggle('email_notifications', v, setEmailNotifications)}
              />
            }
          />
          <OptionCard
            icon="phone-portrait-outline"
            eyebrow="PUSH · BIENTÔT"
            title="Notifications push"
            disabled
            right={<SoftToggle value={pushNotifications} onToggle={() => {}} disabled />}
          />
          <OptionCard
            icon="chatbubble-outline"
            eyebrow="SMS · BIENTÔT"
            title="Notifications SMS"
            disabled
            right={<SoftToggle value={smsNotifications} onToggle={() => {}} disabled />}
          />
          <OptionCard
            icon="time-outline"
            eyebrow="RAPPELS"
            title="Avant tes événements"
            right={
              <SoftToggle
                value={eventReminders}
                onToggle={(v) => handleToggle('event_reminders', v, setEventReminders)}
              />
            }
          />
          <OptionCard
            icon="sparkles-outline"
            eyebrow="MARKETING"
            title="Nouveautés et offres"
            right={
              <SoftToggle
                value={marketingEmails}
                onToggle={(v) => handleToggle('marketing_emails', v, setMarketingEmails)}
              />
            }
          />
        </View>

        {/* Section: Préférences */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>PRÉFÉRENCES</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>
          <OptionCard
            icon="language-outline"
            eyebrow="LANGUE · BIENTÔT"
            title={getLanguageLabel()}
            onPress={showLanguagePicker}
            disabled
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          <OptionCard
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            eyebrow="THÈME"
            title={getThemeLabel()}
            onPress={showThemePicker}
            tone="primary"
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          <OptionCard
            icon="time-outline"
            eyebrow="FUSEAU · BIENTÔT"
            title={getTimezoneLabel()}
            onPress={showTimezonePicker}
            disabled
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          <OptionCard
            icon="musical-note-outline"
            eyebrow="EFFETS SONORES"
            title="Sons aux moments clés"
            subtitle="Joue un son à la confirmation d'un paiement ou d'un scan QR"
            right={
              <SoftToggle
                value={soundsEnabled}
                onToggle={async (v) => {
                  await setSoundsEnabled(v);
                  if (v) playSound('payment-success');
                }}
              />
            }
          />
        </View>

        {/* Section: Sécurité */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>SÉCURITÉ</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>

          <OptionCard
            icon="shield-checkmark-outline"
            eyebrow="AUTHENTIFICATION · BIENTÔT"
            title="Double authentification"
            disabled
            tone="primary"
            right={
              twoFactorAuth ? (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: colors.primary }]}>2FA ACTIVÉE</Text>
                </View>
              ) : (
                <SoftToggle value={twoFactorAuth} onToggle={() => {}} disabled />
              )
            }
          />
          <OptionCard
            icon="notifications-outline"
            eyebrow="CONNEXIONS · BIENTÔT"
            title="Alertes de connexion"
            disabled
            right={<SoftToggle value={loginNotifications} onToggle={() => {}} disabled />}
          />
          <OptionCard
            icon="eye-outline"
            eyebrow="VISIBILITÉ"
            title="Profil public"
            right={
              <SoftToggle
                value={publicProfile}
                onToggle={(v) => handleToggle('public_profile', v, setPublicProfile)}
              />
            }
          />
          <OptionCard
            icon="people-outline"
            eyebrow="ÉVÉNEMENTS"
            title="Apparaître dans « Qui y va ? »"
            right={
              <SoftToggle
                value={showInAttendees}
                onToggle={(v) => handleToggle('show_in_attendees', v, setShowInAttendees)}
              />
            }
          />
          <OptionCard
            icon="checkmark-done-outline"
            eyebrow="MESSAGES"
            title="Confirmer la lecture"
            subtitle="Quand désactivé, les autres ne voient plus que tu as lu leurs messages"
            right={
              <SoftToggle
                value={showReadReceipts}
                onToggle={(v) => handleToggle('show_read_receipts', v, setShowReadReceipts)}
              />
            }
          />
        </View>

        {/* Section: À propos */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>À PROPOS</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>
          <OptionCard
            icon="help-circle-outline"
            eyebrow="SUPPORT"
            title="Centre d'aide"
            onPress={() => {}}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          <OptionCard
            icon="document-text-outline"
            eyebrow="JURIDIQUE"
            title="Conditions d'utilisation"
            onPress={() => navigation.navigate('Terms')}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          <OptionCard
            icon="shield-outline"
            eyebrow="RGPD"
            title="Politique de confidentialité"
            onPress={() => {}}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          <OptionCard
            icon="information-outline"
            eyebrow="VERSION"
            title="EventEz 1.0.0"
            right={
              <View style={[styles.versionPill, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.versionPillText, { color: colors.gray600 }]}>BUILD 2026</Text>
              </View>
            }
          />
        </View>

        {/* Zone sensible — Déconnexion + Suppression */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: colors.accent }]}>ZONE SENSIBLE</Text>
            <View style={[styles.dashLine, { backgroundColor: `${colors.accent}40` }]} />
          </View>
          <OptionCard
            icon="log-out-outline"
            eyebrow="SESSION"
            title="Déconnexion"
            onPress={handleLogout}
            danger
            right={<Ionicons name="chevron-forward" size={18} color={colors.accent} />}
          />
          <OptionCard
            icon="trash-outline"
            eyebrow="IRRÉVERSIBLE"
            title="Supprimer mon compte"
            onPress={() => setShowDeleteModal(true)}
            danger
            right={<Ionicons name="chevron-forward" size={18} color={colors.accent} />}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerBlock}>
          <View style={[styles.footerLine, { backgroundColor: sectionHairline }]} />
          <Text style={[styles.footerText, { color: eyebrowColor }]}>
            EVENTEZ — ÉDITION 2026
          </Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
                },
                Shadows.md,
              ]}
            >
              <View style={styles.modalHeader}>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: `${colors.accent}15` },
                  ]}
                >
                  <Ionicons name="alert-circle" size={28} color={colors.accent} />
                </View>
                <Text style={[styles.modalEyebrow, { color: colors.accent }]}>
                  IRRÉVERSIBLE
                </Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Supprimer</Text>
                <Text style={[styles.modalSubtitle, { color: colors.gray500 }]}>
                  Cette action supprime définitivement ton compte et toutes tes données.
                </Text>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, { color: eyebrowColor }]}>RAISON (OPTIONNEL)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    styles.textArea,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.gray50,
                      borderColor: isDark ? colors.gray200 : colors.gray100,
                      color: colors.text,
                    },
                  ]}
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                  placeholder="Pourquoi supprimes-tu ton compte ?"
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={[styles.inputLabel, { color: eyebrowColor }]}>MOT DE PASSE</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.gray50,
                      borderColor: isDark ? colors.gray200 : colors.gray100,
                      color: colors.text,
                    },
                  ]}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Ton mot de passe"
                  placeholderTextColor={colors.gray400}
                  secureTextEntry
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.gray50,
                      borderColor: isDark ? colors.gray200 : colors.gray100,
                    },
                  ]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteReason('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.accent }]}
                  onPress={handleDeleteAccount}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Supprimer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backDisc: {
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
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  headerLead: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: '92%',
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },

  // Shortcuts
  shortcutsBlock: {
    marginBottom: Spacing.lg,
  },
  shortcutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 14,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  // Section
  sectionBlock: {
    marginTop: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 14,
  },
  eyebrowSection: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dashLine: {
    flex: 1,
    height: 1,
  },

  // Pills
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  versionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  versionPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  // Footer
  footerBlock: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerLine: {
    width: 40,
    height: 1,
  },
  footerText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,16,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 40,
    lineHeight: 32,
    letterSpacing: -1.1,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBody: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  inputLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  textArea: {
    minHeight: 80,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});
