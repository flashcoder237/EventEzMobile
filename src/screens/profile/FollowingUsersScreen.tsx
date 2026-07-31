// ============================================
// FollowingUsersScreen — liste des organisateurs / users suivis
// ============================================
//
// Consomme `usersAPI.getFollowingUsers()` qui retourne UserFollow[]
// (chaque entrée contient le user suivi en `following` + ses préférences).
// Tap sur un item → OrganizerProfile (les users suivis sont en pratique des
// organisateurs ; pour un user "individu", on passe quand même par
// OrganizerProfile qui sait afficher un user générique).

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { usersAPI, getMediaUrl } from '../../api';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserFollow {
  id: number;
  follower: number;
  following: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    profile_picture?: string | null;
    image?: string | null;
    role?: string;
    organizer_profile?: { company_name?: string; verified_status?: boolean } | null;
  };
  notification_preference?: 'all' | 'important' | 'none';
}

function getDisplayName(u: UserFollow['following']): string {
  return (
    u.organizer_profile?.company_name
    || `${u.first_name || ''} ${u.last_name || ''}`.trim()
    || u.username
    || u.email
    || 'Utilisateur'
  );
}

export default function FollowingUsersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showError } = useAlert();
  const { t } = useTranslation();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [follows, setFollows] = useState<UserFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Tracking optimistic des unfollows en cours pour désactiver le bouton
  // pendant la requête.
  const [unfollowingId, setUnfollowingId] = useState<number | null>(null);

  const fetchFollows = useCallback(async () => {
    try {
      const res = await usersAPI.getFollowingUsers();
      const data: UserFollow[] = res.data?.results || res.data || [];
      setFollows(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError(t('common.error'), error.response?.data?.detail || t('profile.loadFollowsError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollows();
  };

  const handleUnfollow = async (item: UserFollow) => {
    const userId = item.following.id;
    setUnfollowingId(userId);
    // Retrait optimistic — rollback sur erreur.
    const prev = follows;
    setFollows(prev.filter(f => f.following.id !== userId));
    try {
      await usersAPI.unfollowUser(userId);
    } catch (error: any) {
      setFollows(prev);
      showError(t('common.error'), error.response?.data?.detail || t('profile.unfollowError'));
    } finally {
      setUnfollowingId(null);
    }
  };

  const renderItem = ({ item }: { item: UserFollow }) => {
    const u = item.following;
    const name = getDisplayName(u);
    const avatar = getMediaUrl(u.profile_picture || u.image);
    const subtitle = u.organizer_profile
      ? (u.organizer_profile.verified_status ? t('profile.verifiedOrganizer') : t('profile.organizerLabel'))
      : (u.role === 'organizer' ? t('profile.organizerLabel') : t('profile.userLabel'));
    const isUnfollowing = unfollowingId === u.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => navigation.navigate('OrganizerProfile', { organizerId: String(u.id) })}
          activeOpacity={0.7}
        >
          {avatar ? (
            <Image source={avatar} style={styles.avatar} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.avatarInitial, { color: colors.gray500 }]}>
                {(name[0] || '?').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]} numberOfLines={1}>{subtitle}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unfollowBtn, { backgroundColor: colors.gray100 }, isUnfollowing && { opacity: 0.6 }]}
          onPress={() => handleUnfollow(item)}
          disabled={isUnfollowing}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('profile.unfollowAccessibility', { name })}
        >
          {isUnfollowing ? (
            <ActivityIndicator size="small" color={colors.gray500} />
          ) : (
            <Text style={[styles.unfollowText, { color: colors.gray700 }]}>{t('profile.unfollowButton')}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

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
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('profile.subscriptionsEyebrow')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('profile.subscriptionsTitle')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={follows}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, follows.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('profile.noSubscriptionsTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('profile.noSubscriptionsText')}
              </Text>
            </View>
          }
        />
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
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...centeredContent(CARD_MAX),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  unfollowBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    minWidth: 100,
    alignItems: 'center',
  },
  unfollowText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
