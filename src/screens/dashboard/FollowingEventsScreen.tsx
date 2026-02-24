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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { eventsAPI } from '../../api/client';
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
import { SkeletonList, EventCardSkeleton } from '../../components/ui/Skeleton';

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

  const loadFollowedEvents = async () => {
    try {
      const response = await eventsAPI.getFollowingEvents();
      setFollows(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Error loading followed events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowedEvents();
  };

  const handleUnfollow = async (eventId: string) => {
    showConfirm(
      'Ne plus suivre',
      'Voulez-vous vraiment ne plus suivre cet evenement ?',
      async () => {
        try {
          await eventsAPI.unfollowEvent(eventId);
          setFollows(prev => prev.filter(f => f.event !== eventId && f.event_details?.id !== eventId));
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

  const renderEventCard = ({ item }: { item: FollowData }) => {
    const event = item.event_details;
    if (!event) return null;

    const dateInfo = event.start_date ? formatDate(event.start_date) : null;
    const isNotified = item.notification_preference !== 'none';
    const isPast = event.start_date && new Date(event.start_date) < new Date();

    return (
      <TouchableOpacity
        style={[styles.eventCard, isPast && styles.eventCardPast]}
        onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
        activeOpacity={0.7}
      >
        {/* Date Badge */}
        {dateInfo && (
          <View style={[styles.dateBadge, isPast && styles.dateBadgePast]}>
            <Text style={[styles.dateDay, isPast && styles.dateDayPast]}>{dateInfo.day}</Text>
            <Text style={[styles.dateMonth, isPast && styles.dateMonthPast]}>{dateInfo.month}</Text>
          </View>
        )}

        {/* Event Image */}
        <Image
          source={{ uri: event.banner_image || event.category?.default_event_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400' }}
          style={styles.eventImage}
        />

        {/* Content */}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

          <View style={styles.eventMeta}>
            {event.location_city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.gray500} />
                <Text style={styles.metaText} numberOfLines={1}>{event.location_city}</Text>
              </View>
            )}
            {event.start_date && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={Colors.gray500} />
                <Text style={styles.metaText}>{formatTimeAgo(event.start_date)}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.notifButton, isNotified && styles.notifButtonActive]}
              onPress={() => toggleNotification(item)}
            >
              <Ionicons
                name={isNotified ? 'notifications' : 'notifications-off-outline'}
                size={16}
                color={isNotified ? Colors.primary : Colors.gray500}
              />
              <Text style={[styles.notifButtonText, isNotified && styles.notifButtonTextActive]}>
                {isNotified ? 'Notifs ON' : 'Notifs OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.unfollowButton}
              onPress={() => handleUnfollow(event.id)}
            >
              <Ionicons name="heart-dislike-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={48} color={Colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>
        {follows.length === 0 ? 'Aucun evenement suivi' : 'Aucun resultat'}
      </Text>
      <Text style={styles.emptySubtitle}>
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
      <View style={styles.authIcon}>
        <Ionicons name="heart-outline" size={48} color={Colors.primary} />
      </View>
      <Text style={styles.authTitle}>Connectez-vous</Text>
      <Text style={styles.authSubtitle}>
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        {renderAuthRequired()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Favoris</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
        >
          <Ionicons name="compass-outline" size={24} color={Colors.gray600} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryMain}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="heart" size={24} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>evenements suivis</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Ionicons name="calendar-outline" size={16} color={Colors.success} />
            <Text style={styles.summaryStatText}>{stats.upcoming} a venir</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryStatText}>{stats.withNotifications} notifies</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={Colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {([
          { key: 'upcoming', label: 'A venir', count: stats.upcoming },
          { key: 'past', label: 'Passes', count: stats.total - stats.upcoming },
          { key: 'all', label: 'Tous', count: stats.total },
        ] as { key: TabFilter; label: string; count: number }[]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonList count={4} Component={EventCardSkeleton} />
        </View>
      ) : (
        <FlatList
          data={filteredFollows}
          keyExtractor={(item) => item.id || `${item.event}-${item.created_at}`}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryStatText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray600,
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
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
