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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../contexts/AuthContext';
import { eventsAPI } from '../../api/client';
import { RootStackParamList, Event } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

interface NotificationBadgeConfig {
  text: string;
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const notificationBadges: Record<string, NotificationBadgeConfig> = {
  all: { text: 'Toutes', color: '#059669', bgColor: '#D1FAE5', icon: 'notifications' },
  important: { text: 'Importantes', color: '#D97706', bgColor: '#FEF3C7', icon: 'notifications-outline' },
  none: { text: 'Aucune', color: '#6B7280', bgColor: '#F3F4F6', icon: 'notifications-off-outline' },
};

export default function FollowingEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [follows, setFollows] = useState<FollowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNotification, setFilterNotification] = useState<string>('');

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
    Alert.alert(
      'Ne plus suivre',
      'Voulez-vous vraiment ne plus suivre cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsAPI.unfollowEvent(eventId);
              setFollows(prev => prev.filter(f => f.event !== eventId && f.event_details?.id !== eventId));
            } catch (error) {
              console.error('Error unfollowing:', error);
              Alert.alert('Erreur', 'Impossible de ne plus suivre cet événement');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePreferences = (follow: FollowData) => {
    const options = ['Toutes les notifications', 'Importantes seulement', 'Aucune notification', 'Annuler'];
    Alert.alert(
      'Préférences de notification',
      'Choisissez le niveau de notifications pour cet événement',
      [
        {
          text: 'Toutes les notifications',
          onPress: () => updatePreference(follow.event_details?.id || follow.event, 'all'),
        },
        {
          text: 'Importantes seulement',
          onPress: () => updatePreference(follow.event_details?.id || follow.event, 'important'),
        },
        {
          text: 'Aucune notification',
          onPress: () => updatePreference(follow.event_details?.id || follow.event, 'none'),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const updatePreference = async (eventId: string, preference: 'all' | 'important' | 'none') => {
    try {
      await eventsAPI.updateFollowPreferences(eventId, { notification_preference: preference });
      setFollows(prev =>
        prev.map(f =>
          (f.event === eventId || f.event_details?.id === eventId)
            ? { ...f, notification_preference: preference }
            : f
        )
      );
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les préférences');
    }
  };

  const filteredFollows = follows.filter(follow => {
    const event = follow.event_details;
    if (!event) return false;

    const matchesSearch =
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location_city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterNotification || follow.notification_preference === filterNotification;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: follows.length,
    upcoming: follows.filter(f => {
      const eventDate = f.event_details?.start_date;
      return eventDate && new Date(eventDate) > new Date();
    }).length,
    withNotifications: follows.filter(f => f.notification_preference !== 'none').length,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Passé';
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    if (days < 7) return `Dans ${days} jours`;
    if (days < 30) return `Dans ${Math.ceil(days / 7)} sem.`;
    return `Dans ${Math.ceil(days / 30)} mois`;
  };

  const showFilterOptions = () => {
    Alert.alert(
      'Filtrer par notifications',
      '',
      [
        { text: 'Toutes', onPress: () => setFilterNotification('') },
        { text: 'Toutes activées', onPress: () => setFilterNotification('all') },
        { text: 'Importantes', onPress: () => setFilterNotification('important') },
        { text: 'Désactivées', onPress: () => setFilterNotification('none') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const renderEventCard = ({ item }: { item: FollowData }) => {
    const event = item.event_details;
    if (!event) return null;

    const badge = notificationBadges[item.notification_preference] || notificationBadges.important;
    const isUpcoming = event.start_date && new Date(event.start_date) > new Date();

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
        activeOpacity={0.7}
      >
        {/* Event Image */}
        <Image
          source={{ uri: event.banner_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400' }}
          style={styles.eventImage}
        />

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: badge.bgColor }]}>
            <Ionicons name={badge.icon} size={12} color={badge.color} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
          {isUpcoming && (
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.badgeText, { color: '#059669' }]}>À venir</Text>
            </View>
          )}
        </View>

        {/* Date Badge */}
        {event.start_date && (
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{formatDate(event.start_date)}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

          <View style={styles.eventMeta}>
            {event.start_date && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={Colors.gray500} />
                <Text style={styles.metaText}>{formatTimeAgo(event.start_date)}</Text>
              </View>
            )}
            {event.location_city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.gray500} />
                <Text style={styles.metaText} numberOfLines={1}>{event.location_city}</Text>
              </View>
            )}
          </View>

          {/* Notification Channels */}
          <View style={styles.channelsRow}>
            {item.notify_email && (
              <View style={styles.channelBadge}>
                <Ionicons name="mail-outline" size={12} color="#3B82F6" />
                <Text style={styles.channelText}>Email</Text>
              </View>
            )}
            {item.notify_push && (
              <View style={styles.channelBadge}>
                <Ionicons name="phone-portrait-outline" size={12} color="#8B5CF6" />
                <Text style={styles.channelText}>Push</Text>
              </View>
            )}
            {item.notify_reminders && (
              <View style={styles.channelBadge}>
                <Ionicons name="alarm-outline" size={12} color="#F59E0B" />
                <Text style={styles.channelText}>Rappels</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.preferencesButton}
              onPress={() => handleUpdatePreferences(item)}
            >
              <Ionicons name="settings-outline" size={16} color={Colors.gray600} />
              <Text style={styles.preferencesText}>Préférences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.unfollowButton}
              onPress={() => handleUnfollow(event.id)}
            >
              <Ionicons name="heart" size={16} color="#EF4444" />
              <Text style={styles.unfollowText}>Suivi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={48} color="#EC4899" />
      </View>
      <Text style={styles.emptyTitle}>
        {follows.length === 0 ? 'Aucun événement suivi' : 'Aucun résultat'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {follows.length === 0
          ? 'Commencez à suivre des événements pour recevoir des notifications et mises à jour.'
          : 'Essayez de modifier vos critères de recherche'}
      </Text>
      {follows.length === 0 && (
        <TouchableOpacity
          style={styles.discoverButton}
          onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
        >
          <Ionicons name="sparkles" size={18} color={Colors.white} />
          <Text style={styles.discoverButtonText}>Découvrir des événements</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.authRequired}>
          <View style={styles.authIcon}>
            <Ionicons name="heart-outline" size={48} color="#EC4899" />
          </View>
          <Text style={styles.authTitle}>Connectez-vous</Text>
          <Text style={styles.authSubtitle}>
            Vous devez être connecté pour voir vos événements suivis
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#EC4899" />

      {/* Header with gradient */}
      <LinearGradient
        colors={['#EC4899', '#F43F5E', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="heart" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerSubtitle}>Vos favoris</Text>
          </View>
          <Text style={styles.headerTitle}>Événements Suivis</Text>
          <Text style={styles.headerDescription}>
            Restez informé des mises à jour de vos événements préférés.
          </Text>

          <TouchableOpacity
            style={styles.discoverLink}
            onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
          >
            <Ionicons name="sparkles" size={16} color="#EC4899" />
            <Text style={styles.discoverLinkText}>Découvrir plus</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="heart" size={18} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(251, 191, 36, 0.3)' }]}>
              <Ionicons name="calendar" size={18} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.statLabel}>À venir</Text>
              <Text style={styles.statValue}>{stats.upcoming}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(52, 211, 153, 0.3)' }]}>
              <Ionicons name="notifications" size={18} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.statLabel}>Notifiés</Text>
              <Text style={styles.statValue}>{stats.withNotifications}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Search and filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement..."
            placeholderTextColor={Colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.filterButton} onPress={showFilterOptions}>
          <Ionicons name="filter" size={20} color={filterNotification ? Colors.primary : Colors.gray600} />
        </TouchableOpacity>
      </View>

      {/* Filter indicator */}
      {filterNotification && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterIndicatorText}>
            Filtre: {notificationBadges[filterNotification]?.text || filterNotification}
          </Text>
          <TouchableOpacity onPress={() => setFilterNotification('')}>
            <Ionicons name="close" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
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
    backgroundColor: Colors.white,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerContent: {
    marginBottom: Spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    ...TextStyles.h2,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  headerDescription: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md,
  },
  discoverLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  discoverLinkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: '#EC4899',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
  },
  filterIndicatorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  eventImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.gray200,
  },
  badgesRow: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  dateBadge: {
    position: 'absolute',
    top: 100,
    left: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  dateText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.xs,
    color: Colors.gray900,
  },
  eventContent: {
    padding: Spacing.md,
  },
  eventTitle: {
    ...TextStyles.bodyBold,
    marginBottom: Spacing.sm,
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
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  channelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  channelText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  preferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  preferencesText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  unfollowText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  discoverButtonText: {
    ...TextStyles.button,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },
  authRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  authIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  authTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  loginButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  loginButtonText: {
    ...TextStyles.button,
  },
});
