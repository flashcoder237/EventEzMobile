import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { eventsAPI, getMediaUrl } from '../../api/client';
import CacheService from '../../services/CacheService';
import { SaveToBookmarks, Authentication } from '../../components/illustrations';
import { RootStackParamList, Event } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
  Shadows,
} from '../../constants/theme';
import { FollowingScreenSkeleton, FollowingEventCardSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem, ContentTransition } from '../../components/ui/Animations';
import { useTabletLayout } from '../../hooks/useTabletLayout';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabFilter = 'upcoming' | 'past' | 'all';

interface FollowData {
  id: string;
  event: string;
  event_details: Event;
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_reminders: boolean;
  created_at: string;
}

export default function FollowingEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const { isTablet, columns, padding: containerPadding, cardGap } = useTabletLayout();
  const [follows, setFollows] = useState<FollowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadFollowedEvents();
      }
    }, [user])
  );

  const loadFollowedEvents = async (bypassCache = false) => {
    const cacheKey = `following:${user?.id}`;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<FollowData[]>(cacheKey);
        if (cached) {
          setFollows(cached.data);
          setLoading(false);
          if (!cached.isStale) return; // Données fraîches
          // Périmées : refresh silencieux
        }
      }
      const response = await eventsAPI.getFollowingEvents();
      const data = response.data?.results || response.data || [];
      setFollows(data);
      CacheService.set(cacheKey, data, 2 * 60 * 1000); // fraîcheur : 2 minutes
    } catch (error) {
      console.error('Error loading followed events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowedEvents(true);
  };

  const handleUnfollow = async (eventId: string) => {
    showConfirm(
      'Ne plus suivre',
      'Voulez-vous vraiment ne plus suivre cet evenement ?',
      async () => {
        try {
          await eventsAPI.unfollowEvent(eventId);
          setFollows(prev => prev.filter(f => f.event !== eventId && f.event_details?.id !== eventId));
          CacheService.invalidate(`following:${user?.id}`);
        } catch (error) {
          console.error('Error unfollowing:', error);
          showError('Erreur', 'Impossible de ne plus suivre cet evenement');
        }
      }
    );
  };

  const toggleNotification = async (follow: FollowData) => {
    const eventId = follow.event_details?.id || follow.event;
    const newPreference = follow.notification_preference === 'none' ? 'all' : 'none';

    try {
      await eventsAPI.updateFollowPreferences(eventId, { notification_preference: newPreference });
      setFollows(prev =>
        prev.map(f =>
          (f.event === eventId || f.event_details?.id === eventId)
            ? { ...f, notification_preference: newPreference }
            : f
        )
      );
    } catch (error) {
      console.error('Error updating preferences:', error);
      showError('Erreur', 'Impossible de mettre a jour les preferences');
    }
  };

  // Stats
  const stats = {
    total: follows.length,
    upcoming: follows.filter(f => {
      const eventDate = f.event_details?.start_date;
      return eventDate && new Date(eventDate) > new Date();
    }).length,
    withNotifications: follows.filter(f => f.notification_preference !== 'none').length,
  };

  // Filtered follows
  const filteredFollows = follows.filter(follow => {
    const event = follow.event_details;
    if (!event) return false;

    // Tab filter
    const eventDate = event.start_date ? new Date(event.start_date) : null;
    const now = new Date();

    if (activeTab === 'upcoming' && eventDate && eventDate <= now) return false;
    if (activeTab === 'past' && eventDate && eventDate > now) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        event.title?.toLowerCase().includes(query) ||
        event.location_city?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Termine';
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    if (days < 7) return `Dans ${days} jours`;
    if (days < 30) return `Dans ${Math.ceil(days / 7)} sem.`;
    return `Dans ${Math.ceil(days / 30)} mois`;
  };

  const renderEventCard = ({ item, index }: { item: FollowData; index: number }) => {
    const event = item.event_details;
    if (!event) return null;

    const dateInfo = event.start_date ? formatDate(event.start_date) : null;
    const isNotified = item.notification_preference !== 'none';
    const isPast = event.start_date && new Date(event.start_date) < new Date();

    return (
      <StaggeredItem index={index} staggerDelay={50}>
      <TouchableOpacity
        style={[
          styles.eventCard,
          { backgroundColor: colors.card, borderColor: colors.gray100 },
          isPast && styles.eventCardPast,
        ]}
        onPress={() => navigation.navigate('EventDetails', { eventId: event.id, imageUrl: event.banner_image || event.category?.default_event_image || undefined })}
        activeOpacity={0.7}
      >
        {/* Date Badge */}
        {dateInfo && (
          <View style={[styles.dateBadge, isPast && { backgroundColor: colors.gray400 }]}>
            <Text style={[styles.dateDay, isPast && styles.dateDayPast]}>{dateInfo.day}</Text>
            <Text style={[styles.dateMonth, isPast && styles.dateMonthPast]}>{dateInfo.month}</Text>
          </View>
        )}

        {/* Event Image */}
        <Image
          source={
            getMediaUrl(event.banner_image || event.category?.default_event_image)
              ? { uri: getMediaUrl(event.banner_image || event.category?.default_event_image)! }
              : require('../../../assets/defaults/default-event.png')
          }
          style={[styles.eventImage, { backgroundColor: colors.gray200 }]}
        />

        {/* Content */}
        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: colors.gray900 }]} numberOfLines={2}>{event.title}</Text>

          <View style={styles.eventMeta}>
            {event.location_city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.gray500} />
                <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>{event.location_city}</Text>
              </View>
            )}
            {event.start_date && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.gray500} />
                <Text style={[styles.metaText, { color: colors.gray500 }]}>{formatTimeAgo(event.start_date)}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.notifButton,
                { backgroundColor: colors.gray100 },
                isNotified && { backgroundColor: colors.primaryBg },
              ]}
              onPress={() => toggleNotification(item)}
            >
              <Ionicons
                name={isNotified ? 'notifications' : 'notifications-off-outline'}
                size={16}
                color={isNotified ? colors.primary : colors.gray500}
              />
              <Text style={[
                styles.notifButtonText,
                { color: colors.gray500 },
                isNotified && { color: colors.primary },
              ]}>
                {isNotified ? 'Notifs ON' : 'Notifs OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.unfollowButton, { backgroundColor: colors.errorLight }]}
              onPress={() => handleUnfollow(event.id)}
            >
              <Ionicons name="heart-dislike-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </View>
      </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <SaveToBookmarks color={colors.primary} size={160} />
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
        {follows.length === 0 ? 'Aucun evenement suivi' : 'Aucun resultat'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        {follows.length === 0
          ? 'Commencez a suivre des evenements pour recevoir des notifications.'
          : 'Essayez de modifier vos criteres de recherche.'}
      </Text>
      {follows.length === 0 && (
        <TouchableOpacity
          style={styles.discoverButton}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
        >
          <Ionicons name="compass-outline" size={18} color={Colors.white} />
          <Text style={styles.discoverButtonText}>Decouvrir des evenements</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAuthRequired = () => (
    <View style={styles.authContainer}>
      <Authentication color={colors.primary} size={160} />
      <Text style={[styles.authTitle, { color: colors.gray900 }]}>Connectez-vous</Text>
      <Text style={[styles.authSubtitle, { color: colors.gray500 }]}>
        Vous devez etre connecte pour voir vos evenements suivis
      </Text>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate('Login' as never)}
      >
        <Text style={styles.loginButtonText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        {renderAuthRequired()}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.gray50 }]}>

      {/* Full-bleed Primary Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.primary }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mes Favoris</Text>
            <Text style={styles.headerSubtitle}>Gardez un oeil sur vos evenements preferes</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>A venir</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{stats.withNotifications}</Text>
              {stats.withNotifications > 0 && <View style={styles.statDot} />}
            </View>
            <Text style={styles.statLabel}>Notifies</Text>
          </View>
        </View>
      </View>

      {/* Floating Filter Card */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.card }]}>
        {/* Search Bar */}
        <View style={[styles.searchInputContainer, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <Ionicons name="search" size={18} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.gray900 }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersRow}>
          {([
            { key: 'upcoming', label: 'A venir', count: stats.upcoming },
            { key: 'past', label: 'Passes', count: stats.total - stats.upcoming },
            { key: 'all', label: 'Tous', count: stats.total },
          ] as { key: TabFilter; label: string; count: number }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterButton,
                activeTab === tab.key && [styles.filterButtonActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.filterText,
                { color: colors.gray600 },
                activeTab === tab.key && { color: Colors.white },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ContentTransition
        isLoading={loading}
        skeleton={
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md }}>
            <FollowingEventCardSkeleton />
            <FollowingEventCardSkeleton />
            <FollowingEventCardSkeleton />
            <FollowingEventCardSkeleton />
          </View>
        }
        style={{ flex: 1 }}
      >
        <FlatList
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap: cardGap } : undefined}
          data={filteredFollows}
          keyExtractor={(item) => item.id || `${item.event}-${item.created_at}`}
          renderItem={({ item, index }) => (
            <View style={columns > 1 ? { flex: 1 } : undefined}>
              {renderEventCard({ item, index })}
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: containerPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </ContentTransition>
    </View>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Full-bleed Primary Header
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing['2xl'] + 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.lime,
  },

  // Floating Filter Card
  filtersContainer: {
    marginTop: -20,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    paddingVertical: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 130,
  },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  eventCardPast: {
    opacity: 0.7,
  },
  dateBadge: {
    width: 56,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  dateBadgePast: {
    backgroundColor: Colors.gray400,
  },
  dateDay: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  dateDayPast: {
    color: Colors.white,
  },
  dateMonth: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: 'rgba(255,255,255,0.8)',
  },
  dateMonthPast: {
    color: 'rgba(255,255,255,0.8)',
  },
  eventImage: {
    width: 80,
    height: '100%',
    backgroundColor: Colors.gray200,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    gap: 4,
  },
  notifButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  notifButtonText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  notifButtonTextActive: {
    color: Colors.primary,
  },
  unfollowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  discoverButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Auth
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  authIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  authTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  loginButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
