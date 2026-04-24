import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { usersAPI } from '../../api';
import { User, RootStackParamList } from '../../types';
import RegistrationSearchBar from '../../components/organizer/RegistrationSearchBar';
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
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

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
    case 'moderator': return 'Moderateur';
    case 'organizer': return 'Organisateur';
    default: return 'Utilisateur';
  }
};

export default function UserManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
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
      style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
      onPress={() => navigation.navigate('UserEdit', { userId: String(item.id) })}
      activeOpacity={0.7}
    >
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(item.first_name?.[0] || item.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.gray900 }]} numberOfLines={1}>
            {item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : item.email}
          </Text>
          <Text style={[styles.userEmail, { color: colors.gray500 }]} numberOfLines={1}>
            {item.email}
          </Text>
        </View>
        <Badge label={roleLabel(item.role || 'user')} variant={roleBadgeVariant(item.role || 'user')} size="sm" />
      </View>
      <View style={[styles.userMeta, { borderTopColor: colors.gray100 }]}>
        <View style={styles.metaItem}>
          <Ionicons name={item.is_verified ? 'checkmark-circle' : 'close-circle'} size={14} color={item.is_verified ? '#10B981' : '#EF4444'} />
          <Text style={[styles.metaText, { color: colors.gray400 }]}>
            {item.is_verified ? 'Verifie' : 'Non verifie'}
          </Text>
        </View>
        <Text style={[styles.metaText, { color: colors.gray400 }]}>
          {item.date_joined ? new Date(item.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const roles: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'user', label: 'Users' },
    { key: 'organizer', label: 'Orga.' },
    { key: 'moderator', label: 'Mod.' },
    { key: 'admin', label: 'Admin' },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>USRS</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>La communauté</Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Utilisateurs</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{filteredUsers.length}</Text>
        </View>
      </View>

      <View style={[styles.searchSection, { borderBottomColor: colors.gray100 }]}>
        <RegistrationSearchBar onSearch={setSearchQuery} placeholder="Rechercher un utilisateur..." />
      </View>

      <View style={[styles.filtersRow, { borderBottomColor: colors.gray100 }]}>
        {roles.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.filterBtn, { backgroundColor: colors.gray100 }, roleFilter === r.key && { backgroundColor: colors.primary }]}
            onPress={() => setRoleFilter(r.key)}
          >
            <Text style={[styles.filterText, { color: colors.gray600 }, roleFilter === r.key && { color: '#FFFFFF' }]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aucun utilisateur trouve</Text>
          </View>
        }
      />
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { ...TextStyles.h3, textAlign: 'center', letterSpacing: -0.3 },
  countBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  countText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  searchSection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  filterText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  userCard: { borderRadius: BorderRadius.xl, borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm, color: '#FFFFFF' },
  userInfo: { flex: 1, marginHorizontal: Spacing.md },
  userName: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  userEmail: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  userMeta: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.base },
});
