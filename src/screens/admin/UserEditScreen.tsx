import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { usersAPI } from '../../api/client';
import { User, RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'UserEdit'>;

const ROLES = ['user', 'organizer', 'moderator', 'admin'] as const;

export default function UserEditScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('user');

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const res = await usersAPI.getUser(userId);
      setUser(res.data);
      setSelectedRole(res.data.role || 'user');
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement utilisateur:', error);
      showError('Erreur', 'Impossible de charger l\'utilisateur');
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
      showSuccess('Succes', 'Role mis a jour');
    } catch (error) {
      showError('Erreur', 'Impossible de mettre a jour le role');
    } finally {
      setSaving(false);
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
      showSuccess('Succes', `Utilisateur ${user.is_verified ? 'deverifie' : 'verifie'}`);
    } catch (error) {
      showError('Erreur', 'Impossible de modifier la verification');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await usersAPI.updateUser(userId, { is_active: !user.is_active });
      setUser(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
      showSuccess('Succes', `Compte ${user.is_active ? 'desactive' : 'active'}`);
    } catch (error) {
      showError('Erreur', 'Impossible de modifier le statut');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showConfirm(
      'Supprimer l\'utilisateur',
      'Cette action est irreversible. Etes-vous sur ?',
      async () => {
        try {
          await usersAPI.deleteUser(userId);
          showSuccess('Succes', 'Utilisateur supprime');
          navigation.goBack();
        } catch (error) {
          showError('Erreur', 'Impossible de supprimer l\'utilisateur');
        }
      }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Modifier utilisateur</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }, Shadows.card]}>
          <View style={[styles.avatarLg, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarLgText}>
              {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.gray900 }]}>
            {user.first_name || ''} {user.last_name || ''}
          </Text>
          <Text style={[styles.email, { color: colors.gray500 }]}>{user.email}</Text>
          <View style={styles.badges}>
            <Badge label={user.is_active ? 'Actif' : 'Inactif'} variant={user.is_active ? 'success' : 'destructive'} size="sm" />
            <Badge label={user.is_verified ? 'Verifie' : 'Non verifie'} variant={user.is_verified ? 'success' : 'warning'} size="sm" />
          </View>
        </View>

        {/* Role Selection */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Role</Text>
        <View style={[styles.rolesCard, { backgroundColor: colors.card }]}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleOption, selectedRole === role && { backgroundColor: colors.primary + '15', borderColor: colors.primary }, { borderColor: colors.gray200 }]}
              onPress={() => setSelectedRole(role)}
            >
              <View style={[styles.roleRadio, selectedRole === role && { borderColor: colors.primary }]}>
                {selectedRole === role && <View style={[styles.roleRadioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.roleLabel, { color: colors.gray900 }, selectedRole === role && { color: colors.primary }]}>
                {role === 'user' ? 'Utilisateur' : role === 'organizer' ? 'Organisateur' : role === 'moderator' ? 'Moderateur' : 'Administrateur'}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedRole !== user.role && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveRole}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Enregistrer le role</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Actions</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.actionRow, { borderBottomColor: colors.gray100 }]} onPress={handleToggleVerified} disabled={saving}>
            <Ionicons name={user.is_verified ? 'shield-checkmark' : 'shield-outline'} size={20} color={user.is_verified ? '#10B981' : colors.gray500} />
            <Text style={[styles.actionText, { color: colors.gray900 }]}>
              {user.is_verified ? 'Retirer la verification' : 'Verifier le profil'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, { borderBottomColor: colors.gray100 }]} onPress={handleToggleActive} disabled={saving}>
            <Ionicons name={user.is_active ? 'ban' : 'checkmark-circle-outline'} size={20} color={user.is_active ? '#F59E0B' : '#10B981'} />
            <Text style={[styles.actionText, { color: colors.gray900 }]}>
              {user.is_active ? 'Desactiver le compte' : 'Activer le compte'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Supprimer l'utilisateur</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Informations</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          {[
            { label: 'ID', value: String(user.id) },
            { label: 'Telephone', value: user.phone || '-' },
            { label: 'Entreprise', value: user.company_name || '-' },
            { label: 'Inscription', value: user.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR') : '-' },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.infoRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.gray100 }]}>
              <Text style={[styles.infoLabel, { color: colors.gray500 }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.gray900 }]}>{item.value}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  userCard: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.lg },
  avatarLg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarLgText: { fontFamily: FontFamily.bold, fontSize: FontSizes['2xl'], color: '#FFFFFF' },
  name: { ...TextStyles.h3 },
  email: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 2 },
  badges: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, marginBottom: Spacing.sm, marginTop: Spacing.md },
  rolesCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.md, ...Shadows.card },
  roleOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.xs, gap: Spacing.md },
  roleRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  roleRadioDot: { width: 10, height: 10, borderRadius: 5 },
  roleLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },
  saveBtn: { paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, color: '#FFFFFF' },
  actionsCard: { borderRadius: BorderRadius['2xl'], ...Shadows.card, overflow: 'hidden' },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: 1 },
  actionText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base, flex: 1 },
  infoCard: { borderRadius: BorderRadius['2xl'], ...Shadows.card, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  infoLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  infoValue: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
});
