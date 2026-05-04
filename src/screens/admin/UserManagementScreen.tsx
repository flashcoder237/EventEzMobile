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

import { useTheme } from '../../contexts/ThemeContext';
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

const roleLabel = (role: string): string => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'moderator': return 'Modérateur';
    case 'organizer': return 'Organisateur';
    default: return 'Utilisateur';
  }
};

export default function UserManagementScreen() {
  return (
    <RoleGuard allow={['admin']} watermark="USR" title="Utilisateurs">
      <UserManagementContent />
    </RoleGuard>
  );
}

function UserManagementContent() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

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
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    if (!matchesRole) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userCard,
        { backgroundColor: colors.card, borderColor: hairline },
        Shadows.sm,
      ]}
      onPress={() => navigation.navigate('UserEdit', { userId: String(item.id) })}
      activeOpacity={0.85}
    >
      <View style={styles.userRow}>
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
            {item.is_verified ? 'Vérifié' : 'Non vérifié'}
          </Text>
        </View>
        <Text style={[styles.metaText, { color: colors.gray500 }]}>
          {item.date_joined ? new Date(item.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const roles: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'user', label: 'Users' },
    { key: 'organizer', label: 'Organisateurs' },
    { key: 'moderator', label: 'Modérateurs' },
    { key: 'admin', label: 'Admins' },
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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>LA COMMUNAUTÉ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Utilisateurs</Text>
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
        <RegistrationSearchBar onSearch={setSearchQuery} placeholder="Rechercher un utilisateur..." />
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>Aucun utilisateur trouvé</Text>
          </View>
        }
      />
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
});
