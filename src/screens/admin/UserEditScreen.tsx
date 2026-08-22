import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import ErrorState from '../../components/ui/ErrorState';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { usersAPI } from '../../api';
import { User, RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, FORM_MAX } from '../../constants/layout';
import { getApiErrorMessage, formatFieldErrors } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'UserEdit'>;

const ROLES = ['user', 'organizer', 'moderator', 'admin'] as const;

export default function UserEditScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { showSuccess, showError, showConfirm } = useAlert();
  const { toastSuccess } = useFeedback();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  // Champs de profil éditables (avant : uniquement rôle/vérif/actif, aucun champ
  // texte modifiable — reproche testeur « modifier un utilisateur »).
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoadFailed(false);
      const res = await usersAPI.getUser(userId);
      setUser(res.data);
      setSelectedRole(res.data.role || 'user');
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
      setEmail(res.data.email || '');
      setPhone(res.data.phone || (res.data as any).phone_number || '');
      setCompany(res.data.company_name || '');
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement utilisateur:', error);
      // Pas de modale : l'écran affiche son propre état d'échec (avec en-tête,
      // donc bouton retour, et Réessayer). Avant, `if (!user) return null`
      // rendait un écran ENTIÈREMENT VIDE : l'utilisateur était piégé, sans
      // même un bouton pour revenir.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!user || selectedRole === user.role) return;
    setSaving(true);
    try {
      await usersAPI.updateUser(userId, { role: selectedRole });
      setUser(prev => prev ? { ...prev, role: selectedRole as import('../../types').UserRole } : prev);
      toastSuccess(t('admin.userEdit.roleUpdated'));
    } catch (error) {
      showError(t('common.error'), t('admin.userEdit.roleUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      // NB : `email` et `role` sont read-only sur UserSerializer (email = identifiant,
      // role via l'action dédiée) → non inclus ici. Le champ backend est
      // `phone_number`, pas `phone`.
      const payload: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        company_name: company.trim(),
      };
      const res = await usersAPI.updateUser(userId, payload);
      setUser(prev => (prev ? { ...prev, ...res.data } : prev));
      toastSuccess(t('admin.userEdit.profileUpdated'));
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'admin.userEdit.profileUpdateError' });
      const detail = formatFieldErrors(getApiErrorMessage(error, t, { fallbackKey: 'admin.userEdit.profileUpdateError' }).fieldErrors, t);
      showError(t('common.error'), detail || message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleVerified = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (user.is_verified) {
        await usersAPI.updateUser(userId, { is_verified: false });
      } else {
        await usersAPI.verifyProfile(userId);
      }
      setUser(prev => prev ? { ...prev, is_verified: !prev.is_verified } : prev);
      toastSuccess(user.is_verified ? t('admin.userEdit.userUnverified') : t('admin.userEdit.userVerified'));
    } catch (error) {
      showError(t('common.error'), t('admin.userEdit.verificationToggleError'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // `updateUser({ is_active })` etait ignore par le backend (champ absent de
      // UserSerializer) : la reponse 200 + le setUser optimiste affichaient un
      // succes alors que le compte restait actif. On lit desormais l'etat
      // renvoye par l'action dediee plutot que de le deviner.
      const res = await usersAPI.setUserActive(userId, !user.is_active);
      const nowActive = res.data?.is_active ?? !user.is_active;
      setUser(prev => prev ? { ...prev, is_active: nowActive } : prev);
      toastSuccess(nowActive ? t('admin.userEdit.accountActivated') : t('admin.userEdit.accountDeactivated'));
    } catch (error) {
      showError(t('common.error'), t('admin.userEdit.statusToggleError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showConfirm(
      t('admin.userEdit.deleteTitle'),
      t('admin.userEdit.deleteConfirm'),
      async () => {
        try {
          await usersAPI.deleteUser(userId);
          toastSuccess(t('admin.userEdit.userDeleted'));
          navigation.goBack();
        } catch (error) {
          showError(t('common.error'), t('admin.userEdit.deleteError'));
        }
      }
    );
  };

  const renderHeader = () => (
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
        <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.userEdit.eyebrow')}</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.userEdit.title')}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {renderHeader()}
        <ErrorState
          message={loadFailed ? t('admin.userEdit.loadError') : undefined}
          onRetry={fetchUser}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {renderHeader()}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <View style={[styles.avatarLg, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.avatarLgText, { color: colors.primary }]}>
              {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {user.first_name || ''} {user.last_name || ''}
          </Text>
          <Text style={[styles.email, { color: colors.gray500 }]}>{user.email}</Text>
          <View style={styles.badges}>
            <Badge label={user.is_active ? t('admin.userEdit.active') : t('admin.userEdit.inactive')} variant={user.is_active ? 'success' : 'destructive'} size="sm" />
            <Badge label={user.is_verified ? t('admin.userEdit.verified') : t('admin.userEdit.unverified')} variant={user.is_verified ? 'success' : 'warning'} size="sm" />
          </View>
        </View>

        {/* Role Selection */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.userEdit.roleSection')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {ROLES.map((role) => {
            const active = selectedRole === role;
            return (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  { borderColor: active ? colors.primary : hairline },
                  active && { backgroundColor: `${colors.primary}10` },
                ]}
                onPress={() => setSelectedRole(role)}
                activeOpacity={0.7}
              >
                <View style={[styles.roleRadio, { borderColor: active ? colors.primary : colors.gray300 }]}>
                  {active && <View style={[styles.roleRadioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.roleLabel, { color: active ? colors.primary : colors.text }]}>
                  {role === 'user' ? t('admin.userEdit.rolesLabels.user') : role === 'organizer' ? t('admin.userEdit.rolesLabels.organizer') : role === 'moderator' ? t('admin.userEdit.rolesLabels.moderator') : t('admin.userEdit.rolesLabels.admin')}
                </Text>
              </TouchableOpacity>
            );
          })}
          {selectedRole !== user.role && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveRole}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>{t('admin.userEdit.saveRole')}</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.userEdit.actionsSection')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: hairline }]}
            onPress={handleToggleVerified}
            disabled={saving}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWell, { backgroundColor: '#10B98115' }]}>
              <Ionicons name={user.is_verified ? 'shield-checkmark' : 'shield-outline'} size={16} color="#10B981" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>
              {user.is_verified ? t('admin.userEdit.removeVerification') : t('admin.userEdit.verifyProfile')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: hairline }]}
            onPress={handleToggleActive}
            disabled={saving}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWell, { backgroundColor: `${user.is_active ? '#F59E0B' : '#10B981'}15` }]}>
              <Ionicons name={user.is_active ? 'ban' : 'checkmark-circle-outline'} size={16} color={user.is_active ? '#F59E0B' : '#10B981'} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>
              {user.is_active ? t('admin.userEdit.deactivateAccount') : t('admin.userEdit.activateAccount')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleDelete} activeOpacity={0.7}>
            <View style={[styles.iconWell, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('admin.userEdit.deleteUser')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Profil éditable */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.userEdit.profileSection')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {([
            { key: 'first', label: t('admin.userEdit.fieldFirstName'), value: firstName, set: setFirstName, kb: 'default' as const },
            { key: 'last', label: t('admin.userEdit.fieldLastName'), value: lastName, set: setLastName, kb: 'default' as const },
            { key: 'phone', label: t('admin.userEdit.fieldPhone'), value: phone, set: setPhone, kb: 'phone-pad' as const },
            { key: 'company', label: t('admin.userEdit.fieldCompany'), value: company, set: setCompany, kb: 'default' as const },
          ]).map((f) => (
            <View key={f.key} style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: hairline, backgroundColor: colors.gray50 }]}
                value={f.value}
                onChangeText={f.set}
                keyboardType={f.kb}
                autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
                placeholderTextColor={colors.gray400}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.saveProfileBtn, { backgroundColor: colors.primary, opacity: savingProfile ? 0.6 : 1 }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
            activeOpacity={0.85}
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveProfileText}>{t('admin.userEdit.saveProfile')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info (lecture seule) */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.userEdit.infoSection')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {[
            { label: t('admin.userEdit.infoId'), value: String(user.id) },
            { label: t('admin.userEdit.fieldEmail'), value: email || '-' },
            { label: t('admin.userEdit.infoJoined'), value: user.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR') : '-' },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.infoRow, idx > 0 && { borderTopWidth: 1, borderTopColor: hairline }]}>
              <Text style={[styles.infoLabel, { color: colors.gray500 }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, ...centeredContent(FORM_MAX) },
  userCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarLgText: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
  },
  name: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  email: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, marginTop: 2 },
  badges: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
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
    padding: Spacing.sm,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioDot: { width: 10, height: 10, borderRadius: 5 },
  roleLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  saveBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.xs,
  },
  saveBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: '#FFFFFF' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, flex: 1 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  infoLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  infoValue: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  fieldGroup: { padding: Spacing.md, paddingBottom: Spacing.sm },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: 12, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  saveProfileBtn: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  saveProfileText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#fff' },
});
