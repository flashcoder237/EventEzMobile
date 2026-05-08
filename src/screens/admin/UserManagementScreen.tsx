import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { usersAPI } from '../../api';
import { User, RootStackParamList } from '../../types';
import RegistrationSearchBar from '../../components/organizer/RegistrationSearchBar';
import Badge from '../../components/ui/Badge';
import ExportButton from '../../components/common/ExportButton';
import RoleGuard from '../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RoleFilter = 'all' | 'user' | 'organizer' | 'moderator' | 'admin';

const roleBadgeVariant = (role: string): 'default' | 'secondary' | 'info' | 'warning' | 'destructive' => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'moderator': return 'warning';
    case 'organizer': return 'info';
    default: return 'secondary';
  }
};

export default function UserManagementScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.users.watermark')} title={t('admin.users.guardTitle')}>
      <UserManagementContent />
    </RoleGuard>
  );
}

function UserManagementContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const roleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return t('admin.users.roles.admin');
      case 'moderator': return t('admin.users.roles.moderator');
      case 'organizer': return t('admin.users.roles.organizer');
      default: return t('admin.users.roles.user');
    }
  };
  const biometric = useBiometricConfirm();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Multi-select state — long-press sur une card pour entrer en mode sélection.
  // Tap sur les cards toggle l'inclusion dans selectedIds (string user.id).
  // Fallback : pas d'API bulk côté backend → on appelle Promise.all sur l'API
  // single-user, ce qui marche pour les batches de quelques dizaines.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const isSelecting = selectedIds.size > 0;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getUsers({ page_size: 100 });
      const data = res.data?.results || res.data || [];
      setUsers(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement utilisateurs:', error);
      showError(t('common.error'), t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => setSelectedIds(new Set());

  /**
   * Exécute `op` sur chaque id sélectionné en parallèle (max 8 concurrentes
   * pour ne pas saturer le backend). Compte succès/échecs et affiche un
   * résumé. Pas d'abort en cours — si un appel échoue, les autres continuent.
   */
  const runBulk = async (
    op: (id: string) => Promise<unknown>,
    confirmTitle: string,
    confirmBody: string,
    successLabel: (n: number) => string,
  ) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    showConfirm(confirmTitle, confirmBody, async () => {
      // Confirmation biométrique catégorie 'admin' AVANT d'exécuter l'action
      // bulk. Posée APRÈS le showConfirm OK pour ne pas double-prompter.
      const okBio = await biometric.confirm({
        promptMessage: confirmTitle,
        category: 'admin',
      });
      if (!okBio) return;

      setBulkLoading(true);
      let ok = 0;
      let fail = 0;
      // Pool de 8 — équilibre entre rapidité et charge backend
      const POOL = 8;
      for (let i = 0; i < ids.length; i += POOL) {
        const batch = ids.slice(i, i + POOL);
        const results = await Promise.allSettled(batch.map(op));
        for (const r of results) {
          if (r.status === 'fulfilled') ok += 1;
          else fail += 1;
        }
      }
      setBulkLoading(false);

      if (fail === 0) {
        showSuccess(t('common.success'), successLabel(ok));
      } else {
        showError(
          t('admin.users.bulk.partial'),
          t('admin.users.bulk.partialDetail', { ok, fail }),
        );
      }
      // Refetch pour synchroniser l'UI avec l'état serveur
      await fetchUsers();
      cancelSelection();
    });
  };

  const handleBulkVerify = () =>
    runBulk(
      (id) => usersAPI.verifyProfile(id, { verified_status: true }),
      t('admin.users.bulk.verifyTitle'),
      t('admin.users.bulk.verifyConfirm', { count: selectedIds.size }),
      (n) => t('admin.users.bulk.verifySuccess', { count: n }),
    );

  const handleBulkDeactivate = () =>
    runBulk(
      (id) => usersAPI.updateUser(id, { is_active: false }),
      t('admin.users.bulk.deactivateTitle'),
      t('admin.users.bulk.deactivateConfirm', { count: selectedIds.size }),
      (n) => t('admin.users.bulk.deactivateSuccess', { count: n }),
    );

  const handleBulkActivate = () =>
    runBulk(
      (id) => usersAPI.updateUser(id, { is_active: true }),
      t('admin.users.bulk.activateTitle'),
      t('admin.users.bulk.activateConfirm', { count: selectedIds.size }),
      (n) => t('admin.users.bulk.activateSuccess', { count: n }),
    );

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    if (!matchesRole) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const renderUser = ({ item }: { item: User }) => {
    const id = String(item.id);
    const isSelected = selectedIds.has(id);
    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
          isSelected && {
            borderColor: colors.primary,
            borderWidth: 2,
            backgroundColor: `${colors.primary}08`,
          },
        ]}
        onPress={() => {
          // En mode sélection, tap = toggle. Sinon, navigation classique.
          if (isSelecting) toggleSelect(id);
          else navigation.navigate('UserEdit', { userId: id });
        }}
        onLongPress={() => toggleSelect(id)}
        delayLongPress={300}
        activeOpacity={0.85}
      >
        <View style={styles.userRow}>
          {isSelecting && (
            <View
              style={[
                styles.selectMark,
                {
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.gray300,
                },
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
          )}
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(item.first_name?.[0] || item.email?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : item.email}
            </Text>
            <Text style={[styles.userEmail, { color: colors.gray500 }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          <Badge label={roleLabel(item.role || 'user')} variant={roleBadgeVariant(item.role || 'user')} size="sm" />
        </View>
        <View style={[styles.userMeta, { borderTopColor: hairline }]}>
          <View style={styles.metaItem}>
            <Ionicons name={item.is_verified ? 'checkmark-circle' : 'close-circle-outline'} size={13} color={item.is_verified ? '#10B981' : '#EF4444'} />
            <Text style={[styles.metaText, { color: colors.gray500 }]}>
              {item.is_verified ? t('admin.users.verified') : t('admin.users.unverified')}
            </Text>
          </View>
          {item.is_active === false && (
            <View style={styles.metaItem}>
              <Ionicons name="ban" size={12} color="#EF4444" />
              <Text style={[styles.metaText, { color: '#EF4444' }]}>{t('admin.users.deactivated')}</Text>
            </View>
          )}
          <Text style={[styles.metaText, { color: colors.gray500 }]}>
            {item.date_joined ? new Date(item.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const roles: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: t('admin.users.filters.all') },
    { key: 'user', label: t('admin.users.filters.user') },
    { key: 'organizer', label: t('admin.users.filters.organizer') },
    { key: 'moderator', label: t('admin.users.filters.moderator') },
    { key: 'admin', label: t('admin.users.filters.admin') },
  ];

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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.users.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.users.title')}</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{filteredUsers.length}</Text>
        </View>
        <ExportButton
          endpoint="/users/export/"
          filename="utilisateurs"
          params={roleFilter !== 'all' ? { role: roleFilter } : {}}
          compact
        />
      </View>

      <View style={styles.searchSection}>
        <RegistrationSearchBar onSearch={setSearchQuery} placeholder={t('admin.users.searchPlaceholder')} />
      </View>

      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
          {roles.map((r) => {
            const active = roleFilter === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.text, borderColor: colors.text }
                    : { backgroundColor: colors.card, borderColor: hairline },
                ]}
                onPress={() => setRoleFilter(r.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? colors.background : colors.gray600 }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          // Padding extra en bas quand la barre bulk est visible pour ne pas
          // qu'elle masque le dernier item.
          isSelecting ? { paddingBottom: 120 } : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('admin.users.empty')}</Text>
          </View>
        }
      />

      {/* Bulk action bar — apparaît dès qu'au moins un user est sélectionné */}
      {isSelecting && (
        <View style={[styles.bulkBar, { backgroundColor: colors.text, borderTopColor: hairline }]}>
          <TouchableOpacity
            onPress={cancelSelection}
            disabled={bulkLoading}
            style={[styles.bulkClose, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
            accessibilityRole="button"
            accessibilityLabel={t('admin.users.bulk.cancelSelection')}
          >
            <Ionicons name="close" size={18} color={colors.background} />
          </TouchableOpacity>
          <Text style={[styles.bulkCount, { color: colors.background }]}>
            {t('admin.users.bulk.selected', { count: selectedIds.size })}
          </Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              onPress={handleBulkVerify}
              disabled={bulkLoading}
              style={[styles.bulkBtn, { backgroundColor: '#10B981' }, bulkLoading && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel={t('admin.users.bulk.verifyTitle')}
            >
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.bulkBtnText}>{t('admin.users.bulk.verify')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBulkActivate}
              disabled={bulkLoading}
              style={[styles.bulkBtn, { backgroundColor: '#3B82F6' }, bulkLoading && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel={t('admin.users.bulk.activateTitle')}
            >
              <Ionicons name="power" size={14} color="#FFFFFF" />
              <Text style={styles.bulkBtnText}>{t('admin.users.bulk.activate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBulkDeactivate}
              disabled={bulkLoading}
              style={[styles.bulkBtn, { backgroundColor: '#EF4444' }, bulkLoading && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel={t('admin.users.bulk.deactivateTitle')}
            >
              <Ionicons name="ban" size={14} color="#FFFFFF" />
              <Text style={styles.bulkBtnText}>{t('admin.users.bulk.deactivate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  filtersRow: {
    paddingVertical: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
  userCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  userInfo: { flex: 1, marginHorizontal: Spacing.md },
  userName: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  userEmail: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },

  // Multi-select
  selectMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },

  // Bulk action bar (sticky bottom when selection mode active)
  bulkBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  bulkClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkCount: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  bulkActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    flexWrap: 'wrap',
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  bulkBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
});
