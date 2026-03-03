import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Events as EventsIllustration } from '../../components/illustrations';
import { eventsAPI } from '../../api/client';
import { Event, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';
import { SkeletonList, EventCardSkeleton } from '../../components/ui/Skeleton';
import { useTabletLayout } from '../../hooks/useTabletLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterStatus = 'all' | 'draft' | 'submitted' | 'validated' | 'rejected' | 'completed' | 'cancelled';

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { color: '#6B7280', bgColor: '#F3F4F6', label: 'Brouillon', icon: 'document-outline' },
  submitted: { color: '#F59E0B', bgColor: '#FEF3C7', label: 'En attente', icon: 'time-outline' },
  validated: { color: '#10B981', bgColor: '#D1FAE5', label: 'Validé', icon: 'checkmark-circle-outline' },
  published: { color: '#10B981', bgColor: '#D1FAE5', label: 'Publié', icon: 'checkmark-circle-outline' },
  rejected: { color: '#EF4444', bgColor: '#FEE2E2', label: 'Rejeté', icon: 'close-circle-outline' },
  completed: { color: '#3B82F6', bgColor: '#DBEAFE', label: 'Terminé', icon: 'flag-outline' },
  cancelled: { color: '#6B7280', bgColor: '#F3F4F6', label: 'Annulé', icon: 'ban-outline' },
};

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'validated', label: 'Validés' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'submitted', label: 'En attente' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'completed', label: 'Terminés' },
];

export default function MyEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const { isTablet, columns, padding: containerPadding, cardGap } = useTabletLayout();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [])
  );

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getMyEvents();
      setEvents(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const statusMatch = filter === 'all' || event.status === filter;
      const searchMatch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.short_description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [events, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: events.length,
    draft: events.filter(e => e.status === 'draft').length,
    validated: events.filter(e => e.status === 'validated').length,
    submitted: events.filter(e => e.status === 'submitted').length,
  }), [events]);

  const handleDeleteEvent = (eventId: string) => {
    showConfirm(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      async () => {
        try {
          await eventsAPI.deleteEvent(eventId);
          setEvents(prev => prev.filter(e => e.id !== eventId));
          showSuccess('Succès', 'Événement supprimé');
        } catch (error) {
          console.error('Erreur suppression:', error);
          showError('Erreur', 'Impossible de supprimer l\'événement');
        }
      }
    );
  };

  const handleSubmitForValidation = (eventId: string) => {
    showConfirm(
      'Soumettre pour validation',
      'Voulez-vous soumettre cet événement pour validation ?',
      async () => {
        try {
          await eventsAPI.submitForValidation(eventId);
          setEvents(prev => prev.map(e =>
            e.id === eventId ? { ...e, status: 'submitted' } : e
          ));
          showSuccess('Succès', 'Événement soumis pour validation');
        } catch (error: any) {
          console.error('Erreur soumission:', error);
          showError('Erreur', error.response?.data?.detail || 'Impossible de soumettre l\'événement');
        }
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLocationDisplay = (event: Event) => {
    if (event.location_type === 'online') {
      return { icon: 'videocam-outline' as const, text: 'En ligne', color: '#3B82F6' };
    } else if (event.location_type === 'hybrid') {
      return { icon: 'globe-outline' as const, text: `${event.location_city || 'Hybride'} + En ligne`, color: '#8B5CF6' };
    }
    return { icon: 'location-outline' as const, text: event.location_city || 'Non spécifié', color: colors.gray500 };
  };

  const showEventActions = (event: Event) => {
    const actions: { text: string; onPress: () => void; style?: 'destructive' | 'cancel' | 'default' }[] = [
      {
        text: 'Voir l\'événement',
        onPress: () => navigation.navigate('EventDetails', { eventId: event.id }),
      },
    ];

    if (event.status === 'validated') {
      actions.push({
        text: 'Scanner QR (Check-in)',
        onPress: () => navigation.navigate('QRScanner', { eventId: event.id }),
      });
      actions.push({
        text: 'Voir les statistiques',
        onPress: () => navigation.navigate('EventAnalytics', { eventId: event.id }),
      });
      actions.push({
        text: 'Gérer les inscriptions',
        onPress: () => navigation.navigate('EventRegistrations', { eventId: event.id }),
      });
      actions.push({
        text: 'Bénévoles',
        onPress: () => navigation.navigate('Volunteers', { eventId: event.id }),
      });
    }

    if (event.status === 'validated' || event.status === 'draft') {
      actions.push({
        text: 'Codes promo',
        onPress: () => navigation.navigate('DiscountManagement', { eventId: event.id }),
      });
    }

    if (event.status === 'draft' || event.status === 'rejected') {
      actions.push({
        text: 'Modifier',
        onPress: () => navigation.navigate('EventEdit', { eventId: event.id }),
      });
    }

    if (event.status === 'draft') {
      actions.push({
        text: 'Soumettre pour validation',
        onPress: () => handleSubmitForValidation(event.id),
      });
    }

    actions.push({
      text: 'Supprimer',
      onPress: () => handleDeleteEvent(event.id),
      style: 'destructive',
    });

    actions.push({
      text: 'Annuler',
      style: 'cancel',
      onPress: () => {},
    });

    showAlert('Actions', event.title, actions);
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const config = statusConfig[item.status] || statusConfig.draft;
    const location = getLocationDisplay(item);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
        onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
        onLongPress={() => showEventActions(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.banner_image || item.category?.default_event_image || item.display_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400' }}
          style={[styles.eventImage, { backgroundColor: colors.gray200 }]}
        />

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={12} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>

        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: colors.gray900 }]} numberOfLines={2}>{item.title}</Text>

          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.gray500} />
              <Text style={[styles.metaText, { color: colors.gray500 }]}>{formatDate(item.start_date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name={location.icon} size={14} color={location.color} />
              <Text style={[styles.metaText, { color: location.color }]} numberOfLines={1}>
                {location.text}
              </Text>
            </View>
          </View>

          <View style={[styles.eventStats, { borderTopColor: colors.gray100 }]}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color={colors.gray500} />
              <Text style={[styles.statValue, { color: colors.gray900 }]}>
                {item.registration_count || item.registrations_count || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>inscrits</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color={colors.gray500} />
              <Text style={[styles.statValue, { color: colors.gray900 }]}>{item.view_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>vues</Text>
            </View>
            <Text style={[styles.priceText, { color: colors.primary }]}>
              {item.is_free ? 'Gratuit' : `${item.base_price?.toLocaleString() || 0} FCFA`}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={[styles.actionsRow, { borderTopColor: colors.gray100 }]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
              onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
            >
              <Ionicons name="eye-outline" size={16} color={colors.gray600} />
              <Text style={[styles.actionText, { color: colors.gray600 }]}>Voir</Text>
            </TouchableOpacity>

            {item.status === 'validated' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => navigation.navigate('QRScanner', { eventId: item.id })}
                >
                  <Ionicons name="qr-code" size={16} color={Colors.white} />
                  <Text style={[styles.actionText, { color: Colors.white }]}>Scanner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
                  onPress={() => navigation.navigate('EventRegistrations', { eventId: item.id })}
                >
                  <Ionicons name="people" size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Inscrits</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
                  onPress={() => navigation.navigate('EventAnalytics', { eventId: item.id })}
                >
                  <Ionicons name="stats-chart" size={16} color={colors.gray600} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
                  onPress={() => navigation.navigate('Volunteers', { eventId: item.id })}
                >
                  <Ionicons name="people-outline" size={16} color={colors.gray600} />
                  <Text style={[styles.actionText, { color: colors.gray600 }]}>Bénévoles</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === 'draft' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => handleSubmitForValidation(item.id)}
              >
                <Ionicons name="send" size={16} color={Colors.white} />
                <Text style={[styles.actionText, { color: Colors.white }]}>Publier</Text>
              </TouchableOpacity>
            )}

            {(item.status === 'draft' || item.status === 'rejected') && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
                onPress={() => navigation.navigate('EventEdit', { eventId: item.id })}
              >
                <Ionicons name="create-outline" size={16} color={colors.gray600} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
              onPress={() => showEventActions(item)}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <EventsIllustration color={colors.primary} size={160} />
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
        {searchQuery || filter !== 'all' ? 'Aucun événement trouvé' : 'Aucun événement'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || filter !== 'all'
          ? 'Essayez de modifier vos critères de recherche'
          : 'Créez votre premier événement pour commencer'}
      </Text>
      {!searchQuery && filter === 'all' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('EventCreate')}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.createButtonText}>Créer mon premier événement</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top, padding: Spacing.lg }]}>
          <SkeletonList count={4} Component={EventCardSkeleton} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: '#7C3AED' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header with gradient */}
      <LinearGradient
        colors={isDark ? ['#5B21B6', '#6D28D9', '#4338CA'] : ['#7C3AED', '#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes événements</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('EventCreate')}
          >
            <Ionicons name="add" size={24} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerStats}>
          {stats.total} événement{stats.total > 1 ? 's' : ''} · {stats.validated} validé{stats.validated > 1 ? 's' : ''} · {stats.draft} brouillon{stats.draft > 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* Content area */}
      <View style={[styles.contentArea, { backgroundColor: colors.background }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="search" size={20} color={colors.gray400} />
            <TextInput
              style={[styles.searchInput, { color: colors.gray900 }]}
              placeholder="Rechercher un événement..."
              placeholderTextColor={colors.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={filterOptions}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterTab, { backgroundColor: colors.gray100 }, filter === item.value && styles.filterTabActive]}
                onPress={() => setFilter(item.value)}
              >
                <Text style={[styles.filterTabText, { color: colors.gray600 }, filter === item.value && styles.filterTabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Events List */}
        <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: cardGap } : undefined}
        data={filteredEvents}
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {renderEvent({ item })}
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: containerPadding }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#7C3AED',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  contentArea: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    marginTop: -Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TextStyles.h2,
    color: Colors.white,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    fontSize: FontSizes.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  searchContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  filterContainer: {
    paddingBottom: Spacing.sm,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
  },
  filterTabActive: {
    backgroundColor: '#7C3AED',
  },
  filterTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.gray200,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  eventContent: {
    padding: Spacing.md,
  },
  eventTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.sm,
  },
  eventMeta: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    flex: 1,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    marginBottom: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...TextStyles.bodyBold,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  priceText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray50,
    gap: Spacing.xs,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  createButtonText: {
    ...TextStyles.button,
  },
});
