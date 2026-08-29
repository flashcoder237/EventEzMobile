import React, { useState, useEffect, useRef, useCallback } from 'react';
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

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage, LANGUAGE_STORAGE_KEY, LANGUAGE_EXPLICIT_KEY } from '../../i18n';
import { getAvailableLanguageCodes } from '../../i18n/translations';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useAppLock } from '../../hooks/useAppLock';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { useBiometricPrefs } from '../../hooks/useBiometricPrefs';
import { useTicketLockPref } from '../../hooks/useTicketLockPref';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { usersAPI, messagesAPI, languagesAPI } from '../../api';
import CacheService from '../../services/CacheService';
import SearchableSelectModal from '../../components/common/SearchableSelectModal';
import { RootStackParamList } from '../../types';
import {
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─────────────────────────────────────────────────────────
// Search helper — case-insensitive, accent-insensitive substring match.
// Empty query matches everything (no filter applied). Used to filter both
// individual settings rows and entire sections at once.
// ─────────────────────────────────────────────────────────
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function matchesQuery(query: string, terms: (string | undefined)[]): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const q = normalize(trimmed);
  return terms.some((term) => term && normalize(term).includes(q));
}

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
  const { logout, user } = useAuth();
  const { showAlert, showError, showConfirm, showSuccess } = useAlert();
  const { colors, isDark, mode: themeMode, setMode: setThemeMode } = useTheme();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Mode de confirmation de suppression de compte : mot de passe pour les
  // comptes email, saisie de l'email/numéro pour les comptes Google/Apple/
  // téléphone (sans mot de passe utilisable). has_password peut être absent
  // d'un cache user ancien → repli sur "mot de passe" (le plus sûr).
  const accountHasPassword = user?.has_password !== false;
  const deleteConfirmTarget =
    user?.auth_provider === 'phone'
      ? user?.phone_number || user?.email || ''
      : user?.email || '';

  // Search bar — filters both individual settings rows and entire sections.
  // `isSearching` is just a convenience for conditional rendering downstream.
  // `hasAnyMatch` is the OR of all section-level term aggregates; we use it
  // to decide whether to show the "no results" empty state.
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.trim().length > 0;

  // Effets sonores
  const { enabled: soundsEnabled, setEnabled: setSoundsEnabled, play: playSound } = useSoundEffect();

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Préférences granulaires par catégorie (s'appliquent en plus des canaux globaux)
  const [notifyEventUpdates, setNotifyEventUpdates] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifyMessagesPref, setNotifyMessagesPref] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);
  const [notifySocial, setNotifySocial] = useState(true);
  // Fréquence emails "nouvelle inscription" (organisateur) : realtime/hourly/daily/off
  const [notifyNewRegistrations, setNotifyNewRegistrations] = useState<'realtime' | 'hourly' | 'daily' | 'off'>('hourly');
  // Heures de silence (push/SMS non essentiels reportés la nuit)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState<string>('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>('07:00');

  // Confidentialité (P19)
  const [showInAttendees, setShowInAttendees] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  // Messagerie — opt-outs serveur (UserMessagingSettings)
  const [messagingEnabled, setMessagingEnabled] = useState(true);
  const [messagingReadReceipts, setMessagingReadReceipts] = useState(true);
  const [messagingPresenceVisible, setMessagingPresenceVisible] = useState(true);
  const [messagingSettingsId, setMessagingSettingsId] = useState<string | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  // Politique anti-spam DM : qui peut me contacter
  type ContactPolicy = 'everyone' | 'connections' | 'connections_strict' | 'nobody';
  const [whoCanContact, setWhoCanContact] = useState<ContactPolicy>('connections');

  // Préférences
  const [language, setLanguage] = useState('fr');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageList, setLanguageList] = useState<{ code: string; label: string }[]>([
    { code: 'fr', label: 'Français (French)' },
    { code: 'en', label: 'English' },
  ]);
  useEffect(() => {
    // /languages/ renvoie le référentiel ISO complet (~184 langues), pensé pour
    // la « langue de rédaction d'un événement » — PAS pour l'UI. On ne garde que
    // les langues d'interface RÉELLEMENT traduites (fr/en bundlées + celles
    // publiées sur le CDN, cf. manifest.json), sinon on proposerait des langues
    // qui retombent silencieusement en anglais.
    Promise.all([
      languagesAPI.list().then((res) => (Array.isArray(res.data) ? res.data : [])).catch(() => []),
      getAvailableLanguageCodes().catch(() => ['fr', 'en']),
    ])
      .then(([iso, available]) => {
        const labelByCode = new Map(
          (iso as { code: string; label: string }[]).map((l) => [l.code, l.label])
        );
        const filtered = available
          .map((code) => ({ code, label: labelByCode.get(code) || code.toUpperCase() }))
          .sort((a, b) => a.label.localeCompare(b.label));
        if (filtered.length) setLanguageList(filtered);
      })
      .catch(() => {});
  }, []);
  const [timezone, setTimezone] = useState('Africa/Douala');

  // Sécurité
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  // App lock biométrique — la pref vit en SecureStore (cf. useAppLock).
  // Hook désactivé ici pour éviter de re-déclencher l'auth au mount du
  // SettingsScreen ; on ne tape qu'aux helpers exposés.
  const { isSupported: appLockSupported, isEnabled: appLockEnabled, setEnabled: setAppLockEnabled } = useAppLock();
  const biometric = useBiometricConfirm();
  const { enabled: bioPrefs, setEnabled: setBioPref } = useBiometricPrefs();
  const { isEnabled: ticketLockEnabled, setEnabled: setTicketLockEnabled } = useTicketLockPref();

  useEffect(() => {
    fetchSettings();
    fetchMessagingSettings();
  }, []);

  // Ref pour les settings — accessible immédiatement dans les callbacks async
  // sans attendre le re-render React (évite la race au tap rapide).
  const messagingSettingsIdRef = useRef<string | null>(null);

  const resolveSettings = async (): Promise<string | null> => {
    try {
      const response = await messagesAPI.getUserMessagingSettings();
      const data = response.data;
      const settings = Array.isArray(data?.results)
        ? data.results[0]
        : Array.isArray(data)
          ? data[0]
          : data;
      if (settings) {
        const sid = settings.id != null ? String(settings.id) : null;
        if (sid) {
          messagingSettingsIdRef.current = sid;
          setMessagingSettingsId(sid);
        }
        setMessagingEnabled(settings.messaging_enabled ?? true);
        setMessagingReadReceipts(settings.read_receipts_enabled ?? true);
        setMessagingPresenceVisible(settings.presence_visible ?? true);
        if (settings.who_can_contact) {
          setWhoCanContact(settings.who_can_contact as ContactPolicy);
        }
        const blocked = Array.isArray(settings.blocked_users) ? settings.blocked_users : [];
        setBlockedCount(blocked.length);
        return sid;
      }
    } catch (error) {
      if (__DEV__) console.warn('[Settings] resolveSettings failed', error);
    }
    return null;
  };

  const fetchMessagingSettings = async () => {
    await resolveSettings();
  };

  const updateMessagingSetting = async (
    key: 'messaging_enabled' | 'read_receipts_enabled' | 'presence_visible' | 'who_can_contact',
    value: boolean | string,
  ) => {
    let sid = messagingSettingsIdRef.current;
    if (!sid) {
      sid = await resolveSettings();
    }
    if (!sid) return;
    try {
      await messagesAPI.updateUserMessagingSettings(sid, {
        [key]: value,
      });
    } catch (error) {
      if (__DEV__) console.error('[Settings] updateMessagingSetting failed', error);
      // Rollback en cas d'erreur
      fetchMessagingSettings();
    }
  };

  const openWhoCanContactPicker = () => {
    const options: { value: ContactPolicy; label: string; desc: string }[] = [
      { value: 'everyone', label: t('settings.whoCanContactEveryone'), desc: t('settings.whoCanContactEveryoneDesc') },
      { value: 'connections', label: t('settings.whoCanContactConnections'), desc: t('settings.whoCanContactConnectionsDesc') },
      { value: 'connections_strict', label: t('settings.whoCanContactConnectionsStrict'), desc: t('settings.whoCanContactConnectionsStrictDesc') },
      { value: 'nobody', label: t('settings.whoCanContactNobody'), desc: t('settings.whoCanContactNobodyDesc') },
    ];
    showAlert(
      t('settings.whoCanContactPickerTitle'),
      t('settings.whoCanContactPickerMessage'),
      [
        ...options.map(opt => ({
          text: `${opt.value === whoCanContact ? '✓ ' : ''}${opt.label}`,
          onPress: () => {
            setWhoCanContact(opt.value);
            updateMessagingSetting('who_can_contact', opt.value);
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
      'info',
    );
  };

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
        setNotifyEventUpdates(settings.notify_event_updates ?? true);
        setNotifyPayment(settings.notify_payment ?? true);
        setNotifyMessagesPref(settings.notify_messages ?? true);
        setNotifyMarketing(settings.notify_marketing ?? false);
        setNotifySocial(settings.notify_social ?? true);
        setNotifyNewRegistrations(settings.notify_new_registrations ?? 'hourly');
        setQuietHoursEnabled(settings.quiet_hours_enabled ?? false);
        setQuietHoursStart(settings.quiet_hours_start ?? '22:00');
        setQuietHoursEnd(settings.quiet_hours_end ?? '07:00');
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

  // SettingsScreen est un ecran de stack pousse PAR-DESSUS Main. Contrairement
  // a ProfileScreen (dans l'onglet Profile, dont le wrapper bascule vers
  // AuthGuardScreen quand isAuthenticated devient false), SettingsScreen reste
  // monte apres un logout. Sans reset explicite, l'utilisateur se retrouve
  // bloque sur un ecran Settings d'un compte qui n'existe plus.
  const resetToHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
  }, [navigation]);

  const handleLogout = () => {
    showConfirm(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmDetail'),
      async () => {
        await logout();
        resetToHome();
      }
    );
  };

  const handleDeleteAccount = async () => {
    if (accountHasPassword) {
      if (!deletePassword) {
        showError(t('common.error'), t('settings.passwordRequired'));
        return;
      }
    } else if (!deleteConfirmation.trim()) {
      showError(t('common.error'), t('settings.deleteConfirmRequired'));
      return;
    }

    // Double-barrière : password/confirmation (savoir) + biométrique (être).
    // Critique pour une action irréversible. Catégorie 'account'.
    const confirmed = await biometric.confirm({
      promptMessage: t('settings.biometricPrompt'),
      category: 'account',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await usersAPI.deleteAccount({
        ...(accountHasPassword
          ? { password: deletePassword }
          : { confirmation: deleteConfirmation.trim() }),
        reason: deleteReason,
      });
      setShowDeleteModal(false);
      // Compte deja supprime serveur : on skip les calls API du logout
      // (unregister-device + /logout/) qui retourneraient 401 user_not_found
      // et declencheraient un retry de refresh tout aussi voue a l'echec.
      await logout({ accountDeleted: true });
      // Reset de navigation : SettingsScreen ne se demonte pas tout seul
      // quand isAuthenticated passe a false (cf. resetToHome).
      resetToHome();
    } catch (error: any) {
      if (__DEV__) console.error('Erreur suppression compte:', error);
      showError(
        t('common.error'),
        getApiErrorMessage(error, t, { fallbackKey: 'settings.deleteAccountError' }).message
      );
    } finally {
      setSaving(false);
    }
  };

  const getLanguageLabel = () => {
    // Prioriser la langue i18n active (source de vérité côté UI), fallback sur
    // la pref stockée en BDD si i18n n'est pas encore initialisé.
    const active = (i18n.language || language || 'en').slice(0, 2);
    if (active === 'fr') return `🇫🇷 ${t('settings.french')}`;
    if (active === 'en') return `🇬🇧 ${t('settings.english')}`;
    const found = languageList.find((l) => l.code === active);
    return found ? found.label : active.toUpperCase();
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return t('settings.themeLightLabel');
      case 'dark': return t('settings.themeDarkLabel');
      case 'system': return t('settings.themeSystemLabel');
      default: return t('settings.themeLightLabel');
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

  const persistAndApplyLanguage = async (lang: string) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Choix explicite : protège contre la migration auto de langue.
      await AsyncStorage.setItem(LANGUAGE_EXPLICIT_KEY, 'true');
      await changeLanguage(lang);
      // Purge du cache : une partie du contenu est localisée PAR LE BACKEND
      // (noms de catégories, etc.) via le header `Accept-Language`. Sans purge,
      // les entrées mises en cache dans l'ancienne langue restaient affichées
      // jusqu'à expiration du TTL → UI mi-FR mi-EN après un changement.
      await CacheService.clearAll();
    } catch (error) {
      if (__DEV__) console.error('[Settings] failed to persist language', error);
    }
    // Sync server-side UNIQUEMENT pour fr/en : User.language pilote la langue
    // des emails/factures/notifications backend, dont les templates n'existent
    // qu'en fr/en. Une langue d'interface autre (ex. es) reste donc locale —
    // les comms backend gardent fr/en. (Découplage volontaire : voir Phase 2.)
    if (lang === 'fr' || lang === 'en') {
      try {
        await usersAPI.updateLanguage(lang);
      } catch (error) {
        if (__DEV__) console.warn('[Settings] backend language sync failed (offline?)', error);
      }
      handleUpdateSetting('language', lang);
    }
    showSuccess(t('settings.languageActivated'));
  };

  const showLanguagePicker = () => setLanguageModalOpen(true);

  const showThemePicker = () => {
    showAlert(
      t('settings.themeDialogTitle'),
      t('settings.themeDialogSubtitle'),
      [
        { text: t('settings.themeLightLabel'), onPress: () => { setThemeMode('light'); handleUpdateSetting('theme', 'light'); } },
        { text: t('settings.themeDarkLabel'), onPress: () => { setThemeMode('dark'); handleUpdateSetting('theme', 'dark'); } },
        { text: t('settings.themeSystemLabel'), onPress: () => { setThemeMode('system'); handleUpdateSetting('theme', 'system'); } },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const showTimezonePicker = () => {
    showAlert(
      t('settings.timezoneDialogTitle'),
      t('settings.timezoneDialogSubtitle'),
      [
        { text: 'Douala (GMT+1)', onPress: () => { setTimezone('Africa/Douala'); handleUpdateSetting('timezone', 'Africa/Douala'); } },
        { text: 'Paris (GMT+1)', onPress: () => { setTimezone('Europe/Paris'); handleUpdateSetting('timezone', 'Europe/Paris'); } },
        { text: 'UTC', onPress: () => { setTimezone('UTC'); handleUpdateSetting('timezone', 'UTC'); } },
        { text: 'New York (GMT-5)', onPress: () => { setTimezone('America/New_York'); handleUpdateSetting('timezone', 'America/New_York'); } },
        { text: t('common.cancel'), style: 'cancel' },
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

  // Union of all section-level term aggregates — used to drive the "no
  // results" empty state. If this returns false, none of the sections
  // below render and the empty state takes over.
  const hasAnyMatch = matchesQuery(searchQuery, [
    t('settings.notificationsSectionEyebrow'),
    t('settings.rowEmailNotifs'), t('settings.rowPushNotifs'), t('settings.rowSmsNotifs'),
    t('settings.rowEventUpdates'), t('settings.rowEventUpdatesSubtitle'),
    t('settings.rowPaymentConfirmations'), t('settings.rowNewConversations'), t('settings.rowMarketing'),
    t('settings.preferencesSectionEyebrow'),
    t('settings.languageEyebrow'), t('eyebrow.theme'), t('eyebrow.timezoneSoon'),
    t('settings.rowSounds'), t('settings.rowSoundsSubtitle'),
    t('settings.securitySectionEyebrow'),
    t('settings.rowTwoFA'), t('settings.rowAppLock'), t('settings.rowTicketLock'),
    t('settings.rowPaymentLock'), t('settings.rowAccountLock'), t('settings.rowAdminLock'),
    t('settings.rowLoginAlerts'), t('settings.rowPublicProfile'), t('settings.rowShowInGoing'),
    t('settings.rowReadConfirmations'), t('settings.rowReadConfirmationsSubtitle'),
    'CONFIDENTIALITÉ MESSAGERIE', 'MESSAGING PRIVACY',
    t('settings.rowMessagingEnabled'), t('settings.rowMessagingEnabledSubtitle'),
    t('settings.rowReadReceipts'), t('settings.rowReadReceiptsSubtitle'),
    t('settings.rowPresenceVisible'), t('settings.rowPresenceVisibleSubtitle'),
    t('settings.rowWhoCanContact'),
    t('settings.rowBlockedUsers'), t('settings.rowBlockedUsersSubtitle'),
    t('settings.aboutSection'),
    t('settings.rowHelpCenter'), t('settings.rowTermsOfUse'),
    t('settings.rowPrivacyPolicy'), t('settings.rowAppVersion'),
    t('settings.dangerZone'),
    t('settings.rowLogout'), t('settings.rowDeleteAccount'),
  ]);

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
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('settings.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.preferencesTitle')}</Text>
          </View>
        </View>
        <Text style={[styles.headerLead, { color: colors.gray500 }]}>
          {t('settings.headerLead')}
        </Text>

        {/* Search input — type-ahead filter across all sections and rows */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? colors.gray100 : '#F2F1ED',
              borderColor: isDark ? colors.gray200 : 'rgba(17,17,16,0.06)',
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.gray500} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('settings.searchPlaceholder')}
            placeholderTextColor={colors.gray400}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t('settings.searchA11y')}
          />
          {isSearching && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
            >
              <Ionicons name="close-circle" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shortcuts */}
        <View style={styles.shortcutsBlock}>
          <View style={styles.shortcutsHeader}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>{t('settings.shortcutsSection')}</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>
          <View style={styles.shortcutsRow}>
            <ShortcutTile
              icon="receipt-outline"
              label={t('settings.shortcutInvoices')}
              tone="primary"
              onPress={() => navigation.navigate('MyPayments')}
            />
            <ShortcutTile
              icon="cash-outline"
              label={t('settings.shortcutTaxes')}
              tone="secondary"
              onPress={() => navigation.navigate('MyPayments')}
            />
            <ShortcutTile
              icon="calendar-outline"
              label={t('settings.shortcutMyEvents')}
              tone="primary"
              onPress={() => navigation.navigate('Main', { screen: 'Tickets' } as any)}
            />
            <ShortcutTile
              icon="help-circle-outline"
              label={t('settings.shortcutHelp')}
              tone="accent"
            />
          </View>
        </View>

        {/* Section: Notifications */}
        {matchesQuery(searchQuery, [
          t('settings.notificationsSectionEyebrow'),
          t('settings.rowEmailNotifs'),
          t('settings.rowPushNotifs'),
          t('settings.rowSmsNotifs'),
          t('settings.rowEventUpdates'),
          t('settings.rowEventUpdatesSubtitle'),
          t('settings.rowPaymentConfirmations'),
          t('settings.rowNewConversations'),
          t('settings.rowMarketing'),
        ]) && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>{t('settings.notificationsSectionEyebrow')}</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>

          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowEmailNotifs'), t('eyebrow.email')]) && (
          <OptionCard
            icon="mail-outline"
            eyebrow={t('eyebrow.email')}
            title={t('settings.rowEmailNotifs')}
            right={
              <SoftToggle
                value={emailNotifications}
                onToggle={(v) => handleToggle('email_notifications', v, setEmailNotifications)}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowPushNotifs'), t('eyebrow.pushSoon')]) && (
          <OptionCard
            icon="phone-portrait-outline"
            eyebrow={t('eyebrow.pushSoon')}
            title={t('settings.rowPushNotifs')}
            disabled
            right={<SoftToggle value={pushNotifications} onToggle={() => {}} disabled />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowSmsNotifs'), t('eyebrow.smsSoon')]) && (
          <OptionCard
            icon="chatbubble-outline"
            eyebrow={t('eyebrow.smsSoon')}
            title={t('settings.rowSmsNotifs')}
            disabled
            right={<SoftToggle value={smsNotifications} onToggle={() => {}} disabled />}
          />
          )}
          {/* === Catégories : s'appliquent en plus des canaux globaux ci-dessus.
              Si email_notifications=false, aucun email même si notify_event_updates=true.
              Les notifs transactionnelles critiques (vérif compte, sécurité) passent toujours. */}
          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowEventUpdates'), t('settings.rowEventUpdatesSubtitle'), t('eyebrow.events')]) && (
          <OptionCard
            icon="calendar-outline"
            eyebrow={t('eyebrow.events')}
            title={t('settings.rowEventUpdates')}
            subtitle={t('settings.rowEventUpdatesSubtitle')}
            right={
              <SoftToggle
                value={notifyEventUpdates}
                onToggle={(v) => handleToggle('notify_event_updates', v, setNotifyEventUpdates)}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowPaymentConfirmations'), t('eyebrow.payments')]) && (
          <OptionCard
            icon="card-outline"
            eyebrow={t('eyebrow.payments')}
            title={t('settings.rowPaymentConfirmations')}
            right={
              <SoftToggle
                value={notifyPayment}
                onToggle={(v) => handleToggle('notify_payment', v, setNotifyPayment)}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowNewConversations'), t('eyebrow.messages')]) && (
          <OptionCard
            icon="chatbubbles-outline"
            eyebrow={t('eyebrow.messages')}
            title={t('settings.rowNewConversations')}
            right={
              <SoftToggle
                value={notifyMessagesPref}
                onToggle={(v) => handleToggle('notify_messages', v, setNotifyMessagesPref)}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.notificationsSectionEyebrow'), t('settings.rowMarketing'), t('eyebrow.suggestions')]) && (
          <OptionCard
            icon="sparkles-outline"
            eyebrow={t('eyebrow.suggestions')}
            title={t('settings.rowMarketing')}
            right={
              <SoftToggle
                value={notifyMarketing}
                onToggle={(v) => handleToggle('notify_marketing', v, setNotifyMarketing)}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.rowSocial'), t('settings.rowSocialDesc')]) && (
          <OptionCard
            icon="person-add-outline"
            eyebrow={t('settings.rowSocialEyebrow')}
            title={t('settings.rowSocial')}
            subtitle={t('settings.rowSocialDesc')}
            right={
              <SoftToggle
                value={notifySocial}
                onToggle={(v) => handleToggle('notify_social', v, setNotifySocial)}
              />
            }
          />
          )}
          {/* Fréquence emails "nouvelle inscription" — organisateurs uniquement */}
          {(user?.role === 'organizer' || user?.role === 'admin') &&
            matchesQuery(searchQuery, [t('settings.newRegistrationsTitle'), t('settings.newRegistrationsDescription')]) && (
            <OptionCard
              icon="people-outline"
              eyebrow={t('settings.newRegistrationsEyebrow')}
              title={t('settings.newRegistrationsTitle')}
              subtitle={t('settings.newRegistrationsDescription')}
            />
          )}
          {(user?.role === 'organizer' || user?.role === 'admin') &&
            matchesQuery(searchQuery, [t('settings.newRegistrationsTitle'), t('settings.newRegistrationsDescription')]) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4, marginBottom: 8, paddingHorizontal: 4 }}>
              {(['realtime', 'hourly', 'daily', 'off'] as const).map((opt) => {
                const active = notifyNewRegistrations === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setNotifyNewRegistrations(opt);
                      handleUpdateSetting('notify_new_registrations', opt);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(`settings.newRegistrationsFreq.${opt}`)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : (isDark ? colors.gray200 : 'rgba(0,0,0,0.08)'),
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.text }}>
                      {t(`settings.newRegistrationsFreq.${opt}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {/* Heures de silence : push/SMS non essentiels reportés la nuit. */}
          {matchesQuery(searchQuery, [t('settings.quietHoursTitle'), t('settings.quietHoursDescription')]) && (
          <OptionCard
            icon="moon-outline"
            eyebrow={t('settings.quietHoursEyebrow')}
            title={t('settings.quietHoursTitle')}
            subtitle={t('settings.quietHoursDescription')}
            right={
              <SoftToggle
                value={quietHoursEnabled}
                onToggle={(v) => handleToggle('quiet_hours_enabled', v, setQuietHoursEnabled)}
              />
            }
          />
          )}
          {quietHoursEnabled && matchesQuery(searchQuery, [t('settings.quietHoursTitle')]) && (
            <View style={{ marginTop: -4, marginBottom: 8, paddingHorizontal: 4, gap: 10 }}>
              {([
                { label: t('settings.quietHoursFrom'), value: quietHoursStart, set: setQuietHoursStart, key: 'quiet_hours_start' },
                { label: t('settings.quietHoursTo'), value: quietHoursEnd, set: setQuietHoursEnd, key: 'quiet_hours_end' },
              ] as const).map((row) => (
                <View key={row.key}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray400, marginBottom: 6 }}>
                    {row.label}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['20:00', '21:00', '22:00', '23:00', '00:00', '06:00', '07:00', '08:00'] as const).map((h) => {
                      const active = row.value === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          onPress={() => { row.set(h); handleUpdateSetting(row.key, h); }}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`${row.label} ${h}`}
                          style={{
                            paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
                            backgroundColor: active ? colors.primary : colors.card,
                            borderColor: active ? colors.primary : (isDark ? colors.gray200 : 'rgba(0,0,0,0.08)'),
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.text }}>{h}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        )}

        {/* Section: Préférences */}
        {matchesQuery(searchQuery, [
          t('settings.preferencesSectionEyebrow'),
          t('settings.languageEyebrow'), getLanguageLabel(),
          t('eyebrow.theme'), getThemeLabel(),
          t('eyebrow.timezoneSoon'), getTimezoneLabel(),
          t('settings.rowSounds'), t('settings.rowSoundsSubtitle'), t('eyebrow.soundEffects'),
        ]) && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>{t('settings.preferencesSectionEyebrow')}</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>
          {matchesQuery(searchQuery, [t('settings.preferencesSectionEyebrow'), t('settings.languageEyebrow'), getLanguageLabel()]) && (
          <OptionCard
            icon="language-outline"
            eyebrow={t('settings.languageEyebrow')}
            title={getLanguageLabel()}
            onPress={showLanguagePicker}
            tone="primary"
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.preferencesSectionEyebrow'), t('eyebrow.theme'), getThemeLabel()]) && (
          <OptionCard
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            eyebrow={t('eyebrow.theme')}
            title={getThemeLabel()}
            onPress={showThemePicker}
            tone="primary"
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.preferencesSectionEyebrow'), t('eyebrow.timezoneSoon'), getTimezoneLabel()]) && (
          <OptionCard
            icon="time-outline"
            eyebrow={t('eyebrow.timezoneSoon')}
            title={getTimezoneLabel()}
            onPress={showTimezonePicker}
            disabled
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.preferencesSectionEyebrow'), t('settings.rowSounds'), t('settings.rowSoundsSubtitle'), t('eyebrow.soundEffects')]) && (
          <OptionCard
            icon="musical-note-outline"
            eyebrow={t('eyebrow.soundEffects')}
            title={t('settings.rowSounds')}
            subtitle={t('settings.rowSoundsSubtitle')}
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
          )}
        </View>
        )}

        {/* Section: Sécurité */}
        {matchesQuery(searchQuery, [
          t('settings.securitySectionEyebrow'),
          t('settings.rowTwoFA'),
          t('settings.rowAppLock'),
          t('settings.rowTicketLock'),
          t('settings.rowPaymentLock'),
          t('settings.rowAccountLock'),
          t('settings.rowAdminLock'),
          t('settings.rowLoginAlerts'),
          t('settings.rowPublicProfile'),
          t('settings.rowShowInGoing'),
          t('settings.rowReadConfirmations'), t('settings.rowReadConfirmationsSubtitle'),
        ]) && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>{t('settings.securitySectionEyebrow')}</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>

          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowTwoFA'), t('eyebrow.authSoon')]) && (
          <OptionCard
            icon="shield-checkmark-outline"
            eyebrow={t('eyebrow.authSoon')}
            title={t('settings.rowTwoFA')}
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
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowAppLock'), t('settings.biometricEyebrow')]) && (
          <OptionCard
            icon="finger-print"
            eyebrow={appLockSupported ? t('settings.biometricEyebrow') : t('settings.biometricUnavailable')}
            title={t('settings.rowAppLock')}
            subtitle={
              appLockSupported
                ? 'FaceID / Empreinte requise au lancement et après 1 min en arrière-plan'
                : t('settings.biometricNoEnrolled')
            }
            disabled={!appLockSupported}
            right={
              <SoftToggle
                value={appLockEnabled}
                onToggle={async (v) => {
                  await setAppLockEnabled(v);
                }}
                disabled={!appLockSupported}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowTicketLock'), t('settings.biometricTicketsEyebrow')]) && (
          <OptionCard
            icon="qr-code-outline"
            eyebrow={appLockSupported ? t('settings.biometricTicketsEyebrow') : t('settings.biometricUnavailable')}
            title={t('settings.rowTicketLock')}
            subtitle={
              appLockSupported
                ? 'FaceID / Empreinte requise pour révéler le QR code à l\'entrée'
                : t('settings.biometricNoEnrolled')
            }
            disabled={!appLockSupported}
            right={
              <SoftToggle
                value={ticketLockEnabled}
                onToggle={async (v) => {
                  await setTicketLockEnabled(v);
                }}
                disabled={!appLockSupported}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowPaymentLock'), t('settings.biometricPaymentsEyebrow')]) && (
          <OptionCard
            icon="card-outline"
            eyebrow={appLockSupported ? t('settings.biometricPaymentsEyebrow') : t('settings.biometricUnavailable')}
            title={t('settings.rowPaymentLock')}
            subtitle={
              appLockSupported
                ? 'FaceID / Empreinte avant retrait, paiement, modif IBAN, remboursement'
                : t('settings.biometricNoEnrolled')
            }
            disabled={!appLockSupported}
            right={
              <SoftToggle
                value={bioPrefs.payments}
                onToggle={(v) => setBioPref('payments', v)}
                disabled={!appLockSupported}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowAccountLock'), t('settings.biometricAccountEyebrow')]) && (
          <OptionCard
            icon="person-outline"
            eyebrow={appLockSupported ? t('settings.biometricAccountEyebrow') : t('settings.biometricUnavailable')}
            title={t('settings.rowAccountLock')}
            subtitle={
              appLockSupported
                ? 'FaceID / Empreinte pour suppression de compte ou changement de mot de passe'
                : t('settings.biometricNoEnrolled')
            }
            disabled={!appLockSupported}
            right={
              <SoftToggle
                value={bioPrefs.account}
                onToggle={(v) => setBioPref('account', v)}
                disabled={!appLockSupported}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowAdminLock'), t('settings.biometricAdminEyebrow')]) && (user?.role === 'admin' || user?.role === 'moderator' || (user as any)?.is_staff) && (
            <OptionCard
              icon="shield-checkmark-outline"
              eyebrow={appLockSupported ? t('settings.biometricAdminEyebrow') : t('settings.biometricUnavailable')}
              title={t('settings.rowAdminLock')}
              subtitle={
                appLockSupported
                  ? t('settings.biometricAdminDescription')
                  : t('settings.biometricNoEnrolled')
              }
              disabled={!appLockSupported}
              right={
                <SoftToggle
                  value={bioPrefs.admin}
                  onToggle={(v) => setBioPref('admin', v)}
                  disabled={!appLockSupported}
                />
              }
            />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowLoginAlerts'), t('eyebrow.connectionsSoon')]) && (
          <OptionCard
            icon="notifications-outline"
            eyebrow={t('eyebrow.connectionsSoon')}
            title={t('settings.rowLoginAlerts')}
            disabled
            right={<SoftToggle value={loginNotifications} onToggle={() => {}} disabled />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowPublicProfile'), t('eyebrow.visibilitySoon')]) && (
          <OptionCard
            icon="eye-outline"
            eyebrow={t('eyebrow.visibilitySoon')}
            title={t('settings.rowPublicProfile')}
            disabled
            right={<SoftToggle value={publicProfile} onToggle={() => {}} disabled />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowShowInGoing'), t('eyebrow.attendeesSoon')]) && (
          <OptionCard
            icon="people-outline"
            eyebrow={t('eyebrow.attendeesSoon')}
            title={t('settings.rowShowInGoing')}
            disabled
            right={<SoftToggle value={showInAttendees} onToggle={() => {}} disabled />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.securitySectionEyebrow'), t('settings.rowReadConfirmations'), t('settings.rowReadConfirmationsSubtitle'), t('eyebrow.readingSoon')]) && (
          <OptionCard
            icon="checkmark-done-outline"
            eyebrow={t('eyebrow.readingSoon')}
            title={t('settings.rowReadConfirmations')}
            subtitle={t('settings.rowReadConfirmationsSubtitle')}
            disabled
            right={<SoftToggle value={showReadReceipts} onToggle={() => {}} disabled />}
          />
          )}
        </View>
        )}

        {/* Section: Confidentialité messagerie */}
        {matchesQuery(searchQuery, [
          'CONFIDENTIALITÉ MESSAGERIE', 'MESSAGING PRIVACY',
          t('settings.rowMessagingEnabled'), t('settings.rowMessagingEnabledSubtitle'),
          t('settings.rowReadReceipts'), t('settings.rowReadReceiptsSubtitle'),
          t('settings.rowPresenceVisible'), t('settings.rowPresenceVisibleSubtitle'),
          t('settings.rowWhoCanContact'),
          t('settings.rowBlockedUsers'), t('settings.rowBlockedUsersSubtitle'),
        ]) && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>
              CONFIDENTIALITÉ MESSAGERIE
            </Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>

          {matchesQuery(searchQuery, ['CONFIDENTIALITÉ MESSAGERIE', t('settings.rowMessagingEnabled'), t('settings.rowMessagingEnabledSubtitle'), t('eyebrow.messaging')]) && (
          <OptionCard
            icon="chatbubbles-outline"
            eyebrow={t('eyebrow.messaging')}
            title={t('settings.rowMessagingEnabled')}
            subtitle={t('settings.rowMessagingEnabledSubtitle')}
            tone="primary"
            right={
              <SoftToggle
                value={messagingEnabled}
                onToggle={(v) => {
                  setMessagingEnabled(v);
                  updateMessagingSetting('messaging_enabled', v);
                }}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, ['CONFIDENTIALITÉ MESSAGERIE', t('settings.rowReadReceipts'), t('settings.rowReadReceiptsSubtitle'), t('eyebrow.reading')]) && (
          <OptionCard
            icon="checkmark-done-outline"
            eyebrow={t('eyebrow.reading')}
            title={t('settings.rowReadReceipts')}
            subtitle={t('settings.rowReadReceiptsSubtitle')}
            right={
              <SoftToggle
                value={messagingReadReceipts}
                onToggle={(v) => {
                  setMessagingReadReceipts(v);
                  updateMessagingSetting('read_receipts_enabled', v);
                }}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, ['CONFIDENTIALITÉ MESSAGERIE', t('settings.rowPresenceVisible'), t('settings.rowPresenceVisibleSubtitle'), t('eyebrow.presence')]) && (
          <OptionCard
            icon="radio-outline"
            eyebrow={t('eyebrow.presence')}
            title={t('settings.rowPresenceVisible')}
            subtitle={t('settings.rowPresenceVisibleSubtitle')}
            right={
              <SoftToggle
                value={messagingPresenceVisible}
                onToggle={(v) => {
                  setMessagingPresenceVisible(v);
                  updateMessagingSetting('presence_visible', v);
                }}
              />
            }
          />
          )}
          {matchesQuery(searchQuery, ['CONFIDENTIALITÉ MESSAGERIE', t('settings.rowWhoCanContact')]) && (
          <OptionCard
            icon="shield-checkmark-outline"
            eyebrow={t('settings.whoCanContactCurrent', { defaultValue: 'ANTI-SPAM' })}
            title={t('settings.rowWhoCanContact')}
            subtitle={
              whoCanContact === 'everyone' ? t('settings.whoCanContactEveryone') :
              whoCanContact === 'connections' ? t('settings.whoCanContactConnections') :
              whoCanContact === 'connections_strict' ? t('settings.whoCanContactConnectionsStrict') :
              t('settings.whoCanContactNobody')
            }
            tone="primary"
            onPress={() => openWhoCanContactPicker()}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, ['CONFIDENTIALITÉ MESSAGERIE', t('settings.rowBlockedUsers'), t('settings.rowBlockedUsersSubtitle')]) && (
          <OptionCard
            icon="ban-outline"
            eyebrow={blockedCount > 0 ? t('settings.blockedSection', { count: blockedCount, plural: blockedCount > 1 ? 'S' : '' }) : t('settings.blockedSectionNone')}
            title={t('settings.rowBlockedUsers')}
            subtitle={t('settings.rowBlockedUsersSubtitle')}
            tone="accent"
            onPress={() => navigation.navigate('BlockedUsers')}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
        </View>
        )}

        {/* Section: À propos */}
        {matchesQuery(searchQuery, [
          t('settings.aboutSection'),
          t('settings.rowHelpCenter'),
          t('settings.rowTermsOfUse'),
          t('settings.rowPrivacyPolicy'),
          t('settings.rowAppVersion'),
        ]) && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: eyebrowColor }]}>{t('settings.aboutSection')}</Text>
            <View style={[styles.dashLine, { backgroundColor: sectionHairline }]} />
          </View>
          {matchesQuery(searchQuery, [t('settings.aboutSection'), t('settings.rowHelpCenter'), t('eyebrow.support')]) && (
          <OptionCard
            icon="help-circle-outline"
            eyebrow={t('eyebrow.support')}
            title={t('settings.rowHelpCenter')}
            onPress={() => {}}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.aboutSection'), t('settings.rowTermsOfUse'), t('eyebrow.legal')]) && (
          <OptionCard
            icon="document-text-outline"
            eyebrow={t('eyebrow.legal')}
            title={t('settings.rowTermsOfUse')}
            onPress={() => navigation.navigate('Terms')}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.aboutSection'), t('settings.rowPrivacyPolicy'), t('eyebrow.gdpr')]) && (
          <OptionCard
            icon="shield-outline"
            eyebrow={t('eyebrow.gdpr')}
            title={t('settings.rowPrivacyPolicy')}
            onPress={() => {}}
            right={<Ionicons name="chevron-forward" size={18} color={colors.gray400} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.aboutSection'), t('settings.rowAppVersion'), t('eyebrow.version')]) && (
          <OptionCard
            icon="information-outline"
            eyebrow={t('eyebrow.version')}
            title={t('settings.rowAppVersion')}
            right={
              <View style={[styles.versionPill, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.versionPillText, { color: colors.gray600 }]}>{t('settings.buildBadge')}</Text>
              </View>
            }
          />
          )}
        </View>
        )}

        {/* Zone sensible — Déconnexion + Suppression */}
        {matchesQuery(searchQuery, [
          t('settings.dangerZone'),
          t('settings.rowLogout'),
          t('settings.rowDeleteAccount'),
        ]) && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.eyebrowSection, { color: colors.accent }]}>{t('settings.dangerZone')}</Text>
            <View style={[styles.dashLine, { backgroundColor: `${colors.accent}40` }]} />
          </View>
          {matchesQuery(searchQuery, [t('settings.dangerZone'), t('settings.rowLogout'), t('eyebrow.session')]) && (
          <OptionCard
            icon="log-out-outline"
            eyebrow={t('eyebrow.session')}
            title={t('settings.rowLogout')}
            onPress={handleLogout}
            danger
            right={<Ionicons name="chevron-forward" size={18} color={colors.accent} />}
          />
          )}
          {matchesQuery(searchQuery, [t('settings.dangerZone'), t('settings.rowDeleteAccount'), t('eyebrow.irreversible')]) && (
          <OptionCard
            icon="trash-outline"
            eyebrow={t('eyebrow.irreversible')}
            title={t('settings.rowDeleteAccount')}
            onPress={() => setShowDeleteModal(true)}
            danger
            right={<Ionicons name="chevron-forward" size={18} color={colors.accent} />}
          />
          )}
        </View>
        )}

        {/* No results — shown when search yields nothing across all sections */}
        {isSearching && !hasAnyMatch && (
          <View style={styles.noResultsBlock}>
            <Ionicons name="search" size={32} color={colors.gray300} />
            <Text style={[styles.noResultsEyebrow, { color: colors.accent }]}>
              {t('settings.noResultsEyebrow')}
            </Text>
            <Text style={[styles.noResultsTitle, { color: colors.text }]}>
              {t('settings.noResultsTitle')}
            </Text>
            <Text style={[styles.noResultsBody, { color: colors.gray500 }]}>
              {t('settings.noResultsBody')}
            </Text>
          </View>
        )}

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
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.deleteModalTitle')}</Text>
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
                  placeholder={t('settings.deleteReasonPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {accountHasPassword ? (
                  <>
                    <Text style={[styles.inputLabel, { color: eyebrowColor }]}>{t('settings.passwordLabel')}</Text>
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
                      placeholder={t('settings.passwordPlaceholder')}
                      placeholderTextColor={colors.gray400}
                      secureTextEntry
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.inputLabel, { color: eyebrowColor }]}>{t('settings.deleteConfirmLabel')}</Text>
                    <Text style={[styles.deleteConfirmHint, { color: colors.gray500 }]}>
                      {t('settings.deleteConfirmInstruction', { value: deleteConfirmTarget })}
                    </Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: isDark ? colors.gray100 : colors.gray50,
                          borderColor: isDark ? colors.gray200 : colors.gray100,
                          color: colors.text,
                        },
                      ]}
                      value={deleteConfirmation}
                      onChangeText={setDeleteConfirmation}
                      placeholder={deleteConfirmTarget}
                      placeholderTextColor={colors.gray400}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </>
                )}
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
                    setDeleteConfirmation('');
                    setDeleteReason('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.accent }]}
                  onPress={handleDeleteAccount}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.deleteButtonText}>{t('settings.deleteButton')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sélecteur de langue de l'interface — toutes les langues. fr/en sont
          bundlées ; les autres se téléchargent à la demande (OTA). */}
      <SearchableSelectModal<{ code: string; label: string }>
        visible={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        eyebrow={t('settings.languageEyebrow')}
        title={t('settings.languageDialogTitle')}
        searchPlaceholder={t('common.search', { defaultValue: 'Rechercher…' })}
        items={languageList}
        getKey={(l) => l.code}
        getLabel={(l) => l.label}
        selectedKey={(i18n.language || language || 'en').slice(0, 2)}
        onSelect={(l) => persistAndApplyLanguage(l.code)}
      />
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
    ...centeredContent(620),
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

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    padding: 0,
  },
  noResultsBlock: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
    gap: 8,
  },
  noResultsEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  noResultsTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  noResultsBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
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
  deleteConfirmHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: Spacing.sm,
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
