import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { usersAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ToggleItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleItem = ({ icon, title, subtitle, value, onToggle, disabled = false }: ToggleItemProps) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.settingItem, { borderBottomColor: colors.gray100 }, disabled && styles.settingItemDisabled]}>
      <View style={[styles.settingIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name={icon} size={20} color={disabled ? colors.gray400 : colors.gray600} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.gray900 }, disabled && { color: colors.gray500 }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>{subtitle}</Text>
        {disabled && (
          <Text style={[styles.unavailableLabel, { color: colors.gray400 }]}>(Indisponible pour le moment)</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray200, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.gray400}
        disabled={disabled}
      />
    </View>
  );
};

interface SelectItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

const SelectItem = ({ icon, title, value, onPress, disabled = false, isActive }: SelectItemProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.gray100 }, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name={icon} size={20} color={disabled ? colors.gray400 : colors.gray600} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.gray900 }, disabled && { color: colors.gray500 }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>{value}</Text>
        {disabled && (
          <Text style={[styles.unavailableLabel, { color: colors.gray400 }]}>(Indisponible pour le moment)</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, updateUser } = useAuth();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark, mode: themeMode, setMode: setThemeMode, gradients } = useTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

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
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: boolean | string) => {
    try {
      await usersAPI.updateUserSettings({ [key]: value });
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      // Revert on error
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
      console.error('Erreur suppression compte:', error);
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
      <View style={[styles.rootContainer, { backgroundColor: colors.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LoadingSpinner />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Gradient Header */}
          <LinearGradient
        colors={gradients.brand as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="settings" size={24} color="rgba(255,255,255,0.8)" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerSubtitle}>Configuration</Text>
            <Text style={styles.headerTitle}>Paramètres</Text>
            <Text style={styles.headerDescription}>
              Personnalisez votre expérience EventEz
            </Text>
          </View>
        </View>
          </LinearGradient>

          <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.gray200 }]}>
            <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#0C2D48' : '#E0F2FE' }]}>
              <Ionicons name="notifications" size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Notifications</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.gray500 }]}>Gérez comment vous êtes notifié</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <ToggleItem
              icon="mail-outline"
              title="Notifications par email"
              subtitle="Recevez des emails pour vos événements"
              value={emailNotifications}
              onToggle={(v) => handleToggle('email_notifications', v, setEmailNotifications)}
            />
            <ToggleItem
              icon="phone-portrait-outline"
              title="Notifications push"
              subtitle="Notifications sur votre appareil"
              value={pushNotifications}
              onToggle={(v) => handleToggle('push_notifications', v, setPushNotifications)}
              disabled
            />
            <ToggleItem
              icon="chatbubble-outline"
              title="Notifications SMS"
              subtitle="Recevez des SMS importants"
              value={smsNotifications}
              onToggle={(v) => handleToggle('sms_notifications', v, setSmsNotifications)}
              disabled
            />
            <ToggleItem
              icon="time-outline"
              title="Rappels d'événements"
              subtitle="Rappels avant vos événements"
              value={eventReminders}
              onToggle={(v) => handleToggle('event_reminders', v, setEventReminders)}
            />
            <ToggleItem
              icon="sparkles-outline"
              title="Emails marketing"
              subtitle="Nouveautés et offres spéciales"
              value={marketingEmails}
              onToggle={(v) => handleToggle('marketing_emails', v, setMarketingEmails)}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.gray200 }]}>
            <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#2D1B69' : '#F3E8FF' }]}>
              <Ionicons name="globe" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Préférences</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.gray500 }]}>Personnalisez votre expérience</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <SelectItem
              icon="language-outline"
              title="Langue"
              value={getLanguageLabel()}
              onPress={showLanguagePicker}
              disabled
            />
            <SelectItem
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              title="Thème"
              value={getThemeLabel()}
              onPress={showThemePicker}
            />
            <SelectItem
              icon="time-outline"
              title="Fuseau horaire"
              value={getTimezoneLabel()}
              onPress={showTimezonePicker}
              disabled
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.gray200 }]}>
            <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#0D3B2E' : '#D1FAE5' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Sécurité</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.gray500 }]}>Protégez votre compte</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <ToggleItem
              icon="shield-outline"
              title="Authentification à deux facteurs"
              subtitle="Couche de sécurité supplémentaire"
              value={twoFactorAuth}
              onToggle={(v) => handleToggle('two_factor_auth', v, setTwoFactorAuth)}
              disabled
            />
            <ToggleItem
              icon="notifications-outline"
              title="Notifications de connexion"
              subtitle="Alertes lors de nouvelles connexions"
              value={loginNotifications}
              onToggle={(v) => handleToggle('login_notifications', v, setLoginNotifications)}
              disabled
            />
            <ToggleItem
              icon="eye-outline"
              title="Profil public"
              subtitle="Permettre aux autres de voir votre profil"
              value={publicProfile}
              onToggle={(v) => handleToggle('public_profile', v, setPublicProfile)}
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.gray200 }]}>
            <View style={[styles.sectionIconContainer, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="information-circle" size={20} color={colors.gray600} />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Application</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.gray500 }]}>À propos et aide</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.gray100 }]} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="help-circle-outline" size={20} color={colors.gray600} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.gray900 }]}>Centre d'aide</Text>
                <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>FAQ et support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.gray100 }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Terms')}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.gray600} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.gray900 }]}>Conditions d'utilisation</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.gray100 }]} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="shield-outline" size={20} color={colors.gray600} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.gray900 }]}>Politique de confidentialité</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <View style={[styles.settingItem, { borderBottomColor: colors.gray100 }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="information-outline" size={20} color={colors.gray600} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.gray900 }]}>Version</Text>
                <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection, { backgroundColor: colors.card, borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
            <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.error }]}>Zone de danger</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.gray500 }]}>Actions irréversibles</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.gray100 }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.settingIcon, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.error }]}>Déconnexion</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.gray100 }]}
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.settingIcon, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.error }]}>Supprimer mon compte</Text>
                <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>Cette action est définitive</Text>
              </View>
            </TouchableOpacity>
          </View>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={32} color={colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.gray900 }]}>Supprimer votre compte</Text>
              <Text style={[styles.modalSubtitle, { color: colors.gray600 }]}>
                Cette action est irréversible. Toutes vos données seront définitivement supprimées.
              </Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Raison de la suppression (optionnel)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="Pourquoi supprimez-vous votre compte?"
                placeholderTextColor={colors.gray400}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { color: colors.gray700 }]}>Confirmer avec votre mot de passe</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Votre mot de passe"
                placeholderTextColor={colors.gray400}
                secureTextEntry
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.gray100 }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteReason('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.gray700 }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.deleteButtonText}>Supprimer définitivement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#7C3AED',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },

  // Sections
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: 'hidden',
  },
  dangerSection: {
    borderColor: '#FCA5A5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...TextStyles.bodyBold,
  },
  sectionSubtitle: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  sectionContent: {
    paddingVertical: Spacing.xs,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingTitle: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.medium,
  },
  settingTitleDisabled: {
    color: Colors.gray500,
  },
  settingSubtitle: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  unavailableLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...TextStyles.h4,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...TextStyles.small,
    color: Colors.gray600,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  modalBody: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
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
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...TextStyles.button,
    color: Colors.gray700,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    ...TextStyles.button,
  },
});
