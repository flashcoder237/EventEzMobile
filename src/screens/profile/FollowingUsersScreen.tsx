// ============================================
// FollowingUsersScreen — organisateurs suivis
// ============================================
//
// Pensé pour tenir à 2 000 abonnements (retour testeur 2026-10-03) :
//   - pagination SERVEUR (`/users/following_users/?page=`), 30 par page,
//     `onEndReached` → page suivante ; recherche côté serveur (debounce) ;
//   - lignes denses à hauteur fixe (`getItemLayout`), fenêtre de rendu bornée ;
//   - action secondaire discrète : pastille « Suivi » → confirmation avant de
//     se désabonner (plus de gros bouton « Désabonner » sur chaque ligne).
// Tap sur une ligne → OrganizerProfile.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
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
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { useDebounce } from '../../hooks/useDebounce';
import { usePaginatedList } from '../../hooks/usePaginatedList';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 30;
const ROW_HEIGHT = 68;
/** En dessous, la recherche n'apporte rien : on ne l'affiche pas (sauf saisie en cours). */
const SEARCH_THRESHOLD = 8;

export interface FollowedPerson {
  followId: number | string;
  id: number;
  name: string;
  avatar: string | null;
  verified: boolean;
  isOrganizer: boolean;
  eventCount: number | null;
  rating: number | null;
}

/**
 * Normalise une ligne UserFollow. Le backend sérialise `following` comme un ID
 * brut et l'objet enrichi dans `following_details` (sinon `following.id`
 * valait undefined → OrganizerProfile « impossible de charger »).
 */
export function toFollowedPerson(raw: any): FollowedPerson | null {
  const u = raw?.following_details && typeof raw.following_details === 'object'
    ? raw.following_details
    : (raw?.following && typeof raw.following === 'object' ? raw.following : null);
  if (!u || u.id == null) return null;
  const op = u.organizer_profile || null;
  const name = (
    u.company_name
    || op?.company_name
    || u.name
    || `${u.first_name || ''} ${u.last_name || ''}`.trim()
    || u.username
    || ''
  ).trim();
  return {
    followId: raw.id ?? u.id,
    id: u.id,
    name,
    avatar: u.profile_picture || op?.logo || u.image || null,
    verified: !!(u.is_verified || op?.verified_status),
    isOrganizer: !!op || u.role === 'organizer',
    eventCount: typeof op?.event_count === 'number' ? op.event_count : null,
    rating: typeof op?.rating === 'number' && op.rating > 0 ? op.rating : null,
  };
}

/** Teinte stable par personne pour les initiales (plus de disques gris identiques). */
const INITIAL_TINTS = ['#4F46E5', '#DB2777', '#0891B2', '#059669', '#D97706', '#7C3AED', '#DC2626'];
function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return INITIAL_TINTS[Math.abs(h) % INITIAL_TINTS.length];
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

export default function FollowingUsersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showError, showConfirm } = useAlert();
  const { t, i18n } = useTranslation();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [query, setQuery] = useState('');
  const search = useDebounce(query.trim(), 350);
  const [unfollowingId, setUnfollowingId] = useState<number | null>(null);

  const {
    items, setItems, total, setTotal, loading, refreshing, loadingMore, failed, refresh, loadMore,
  } = usePaginatedList<FollowedPerson>({
    fetchPage: async (page) =>
      (await usersAPI.getFollowingUsers({ page, page_size: PAGE_SIZE, ...(search ? { search } : {}) })).data,
    mapItem: toFollowedPerson,
    deps: [search],
    onError: (error) =>
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'profile.loadFollowsError' }).message),
  });

  const numberFormat = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);

  const unfollow = useCallback(async (person: FollowedPerson) => {
    setUnfollowingId(person.id);
    // Retrait optimiste — rollback sur erreur.
    const prevItems = items;
    const prevTotal = total;
    setItems((list) => list.filter((p) => p.id !== person.id));
    setTotal((n) => (n == null ? n : Math.max(0, n - 1)));
    try {
      await usersAPI.unfollowUser(person.id);
    } catch (error: any) {
      setItems(prevItems);
      setTotal(prevTotal);
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'profile.unfollowError' }).message);
    } finally {
      setUnfollowingId(null);
    }
  }, [items, total, setItems, setTotal, showError, t]);

  const confirmUnfollow = useCallback((person: FollowedPerson) => {
    showConfirm(
      t('profile.unfollowConfirmTitle', { defaultValue: 'Ne plus suivre ?' }),
      t('profile.unfollowConfirmMessage', {
        name: person.name,
        defaultValue: 'Vous ne serez plus prévenu des prochains événements de {{name}}.',
      }),
      () => { unfollow(person); },
      { confirmText: t('profile.unfollowButton'), destructive: true },
    );
  }, [showConfirm, t, unfollow]);

  const subtitleFor = useCallback((p: FollowedPerson): string => {
    const parts: string[] = [];
    if (p.eventCount != null && p.eventCount > 0) {
      parts.push(t('profile.followedEventCount', {
        count: p.eventCount,
        defaultValue: '{{count}} événements',
      }));
    }
    if (p.rating != null) parts.push(`★ ${p.rating.toFixed(1)}`);
    if (parts.length) return parts.join(' · ');
    return p.isOrganizer ? t('profile.organizerLabel') : t('profile.userLabel');
  }, [t]);

  const renderItem = useCallback(({ item }: { item: FollowedPerson }) => {
    const avatar = item.avatar ? getMediaUrl(item.avatar) : null;
    const isUnfollowing = unfollowingId === item.id;
    const displayName = item.name || t('profile.userLabel');
    return (
      <View style={[styles.row, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={styles.rowMain}
          onPress={() => navigation.navigate('OrganizerProfile', { organizerId: String(item.id) })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={displayName}
        >
          {avatar ? (
            <Image source={avatar} style={styles.avatar} cachePolicy="memory-disk" recyclingKey={String(item.id)} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: `${tintFor(displayName)}1F` }]}>
              <Text style={[styles.avatarInitial, { color: tintFor(displayName) }]}>{initialsOf(displayName)}</Text>
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
              {item.verified && (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.verified} />
              )}
            </View>
            <Text style={[styles.subtitle, { color: colors.gray500 }]} numberOfLines={1}>{subtitleFor(item)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.followingPill, { borderColor: hairline }, isUnfollowing && { opacity: 0.5 }]}
          onPress={() => confirmUnfollow(item)}
          disabled={isUnfollowing}
          activeOpacity={0.7}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('profile.unfollowAccessibility', { name: displayName })}
        >
          {isUnfollowing ? (
            <ActivityIndicator size="small" color={colors.gray500} />
          ) : (
            <>
              <Ionicons name="checkmark" size={13} color={colors.gray600} />
              <Text style={[styles.followingText, { color: colors.gray600 }]}>
                {t('profile.followingPill', { defaultValue: 'Suivi' })}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [colors, hairline, navigation, subtitleFor, t, unfollowingId, confirmUnfollow]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }),
    [],
  );

  const showSearch = query.length > 0 || (total ?? items.length) > SEARCH_THRESHOLD;
  const countLabel = total != null && !search
    ? t('profile.followedCount', { count: total, formatted: numberFormat.format(total), defaultValue: '{{formatted}} suivis' })
    : null;

  const renderEmpty = () => {
    if (loading) return null;
    if (search) {
      return (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('profile.followSearchEmptyTitle', { defaultValue: 'Aucun résultat' })}
          </Text>
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>
            {t('profile.followSearchEmptyText', {
              query: search,
              defaultValue: 'Aucun organisateur suivi ne correspond à « {{query}} ».',
            })}
          </Text>
        </View>
      );
    }
    if (failed) {
      return (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('profile.loadFollowsError')}</Text>
          <TouchableOpacity style={[styles.emptyCta, { backgroundColor: colors.primary }]} onPress={refresh}>
            <Text style={styles.emptyCtaText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Ionicons name="people-outline" size={48} color={colors.gray300} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('profile.noSubscriptionsTitle')}</Text>
        <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('profile.noSubscriptionsText')}</Text>
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
          accessibilityRole="button"
        >
          <Text style={styles.emptyCtaText}>
            {t('profile.followDiscoverCta', { defaultValue: 'Découvrir des événements' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <View style={styles.headerTop}>
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
          {countLabel ? (
            <View style={[styles.countPill, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{countLabel}</Text>
            </View>
          ) : null}
        </View>
        {showSearch && (
          <View style={[styles.searchBox, { backgroundColor: colors.gray100 }]}>
            <Ionicons name="search" size={16} color={colors.gray500} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('profile.followSearchPlaceholder', { defaultValue: 'Rechercher un organisateur' })}
              placeholderTextColor={colors.gray400}
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel={t('profile.followSearchPlaceholder', { defaultValue: 'Rechercher un organisateur' })}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.clear')}>
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.followId)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={14}
          maxToRenderPerBatch={20}
          windowSize={11}
          removeClippedSubviews
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, items.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /></View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  countText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...centeredContent(CARD_MAX),
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flexShrink: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  verified: {
    marginLeft: 4,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  followingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    height: 30,
    minWidth: 72,
    justifyContent: 'center',
  },
  followingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  footer: {
    paddingVertical: Spacing.lg,
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
  emptyCta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
  },
});
