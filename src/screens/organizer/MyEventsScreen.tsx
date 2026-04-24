import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Events as EventsIllustration, AnimatedIllustration } from '../../components/illustrations';
import { eventsAPI, getMediaUrl } from '../../api';
import CacheService from '../../services/CacheService';
import { Event, RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { MyEventsScreenSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem } from '../../components/ui/Animations';
import { useTabletLayout } from '../../hooks/useTabletLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterStatus = 'all' | 'draft' | 'submitted' | 'validated' | 'rejected' | 'completed' | 'cancelled';

const statusConfig: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { color: '#6B7280', label: 'Brouillon', icon: 'document-outline' },
  submitted: { color: '#F59E0B', label: 'En attente', icon: 'time-outline' },
  validated: { color: '#10B981', label: 'Validé', icon: 'checkmark-circle-outline' },
  published: { color: '#10B981', label: 'Publié', icon: 'checkmark-circle-outline' },
  rejected: { color: '#EF4444', label: 'Rejeté', icon: 'close-circle-outline' },
  completed: { color: '#3B82F6', label: 'Terminé', icon: 'flag-outline' },
  cancelled: { color: '#6B7280', label: 'Annulé', icon: 'ban-outline' },
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
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { columns, padding: containerPadding, cardGap } = useTabletLayout();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? colors.gray100 : colors.gray50;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [user?.id])
  );

  const fetchEvents = async (bypassCache = false) => {
    const cacheKey = `my-events:${user?.id}`;
    try {
      if (!bypassCache && user?.id) {
        const cached = await CacheService.get<Event[]>(cacheKey);
        if (cached) {
          setEvents(cached.data);
          setLoading(false);
          if (!cached.isStale) return;
        }
      }
      const response = await eventsAPI.getMyEvents();
      const data = response.data?.results || response.data || [];
      setEvents(data);
      if (user?.id) {
        CacheService.set(cacheKey, data, 2 * 60 * 1000);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents(true);
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
          if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
          showSuccess('Succès', 'Événement supprimé');
        } catch (error) {
          if (__DEV__) console.error('Erreur suppression:', error);
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
          if (__DEV__) console.error('Erreur soumission:', error);
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
      return { icon: 'globe-outline' as const, text: `${event.location_city || 'Hybride'} + En ligne`, color: '#6366F1' };
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

  const renderEvent = ({ item, index }: { item: Event; index: number }) => {
    const config = statusConfig[item.status] || statusConfig.draft;
    const location = getLocationDisplay(item);

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.eventCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
          onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          onLongPress={() => showEventActions(item)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Evenement ${item.title}`}
        >
          <View style={styles.imageWrap}>
            <Image
              source={
                getMediaUrl(item.banner_image || item.category?.default_event_image || item.display_image)
                  || require('../../../assets/defaults/default-event.png')
              }
              placeholder={item.banner_placeholder || item.category?.default_event_image_placeholder || item.display_placeholder || undefined}
              placeholderContentFit="cover"
              style={[styles.eventImage, { backgroundColor: colors.gray200 }]}
              cachePolicy="memory-disk"
              transition={300}
            />
            <View style={[styles.statusBadge, { backgroundColor: `${config.color}15` }]}>
              <Ionicons name={config.icon} size={11} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          <View style={styles.eventContent}>
            <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>

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

            <View style={[styles.eventStats, { borderTopColor: hairline }]}>
              <View style={styles.statCluster}>
                <View style={styles.statBlock}>
                  <Text style={[styles.statBlockValue, { color: colors.text }]}>
                    {item.registration_count || item.registrations_count || 0}
                  </Text>
                  <Text style={[styles.statBlockLabel, { color: colors.gray500 }]}>inscrits</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: hairline }]} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statBlockValue, { color: colors.text }]}>{item.view_count || 0}</Text>
                  <Text style={[styles.statBlockLabel, { color: colors.gray500 }]}>vues</Text>
                </View>
              </View>
              <Text style={[styles.priceText, { color: colors.primary }]}>
                {item.is_free ? 'Gratuit' : `${item.base_price?.toLocaleString() || 0} ${item.currency || 'FCFA'}`}
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={[styles.actionsRow, { borderTopColor: hairline }]}>
              <TouchableOpacity
                style={[styles.actionChip, { backgroundColor: inputBg, borderColor: hairline }]}
                onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                accessibilityRole="button"
                accessibilityLabel="Voir l'evenement"
              >
                <Ionicons name="eye-outline" size={14} color={colors.text} />
                <Text style={[styles.actionChipText, { color: colors.text }]}>Voir</Text>
              </TouchableOpacity>

              {item.status === 'validated' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionChipPrimary, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate('QRScanner', { eventId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel="Scanner QR code"
                  >
                    <Ionicons name="qr-code" size={14} color="#FFFFFF" />
                    <Text style={[styles.actionChipPrimaryText]}>Scanner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionChip, { backgroundColor: inputBg, borderColor: hairline }]}
                    onPress={() => navigation.navigate('EventRegistrations', { eventId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel="Voir les inscrits"
                  >
                    <Ionicons name="people-outline" size={14} color={colors.text} />
                    <Text style={[styles.actionChipText, { color: colors.text }]}>Inscrits</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIcon, { backgroundColor: inputBg, borderColor: hairline }]}
                    onPress={() => navigation.navigate('EventAnalytics', { eventId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel="Voir les statistiques"
                  >
                    <Ionicons name="stats-chart-outline" size={14} color={colors.text} />
                  </TouchableOpacity>
                </>
              )}

              {item.status === 'draft' && (
                <TouchableOpacity
                  style={[styles.actionChipPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => handleSubmitForValidation(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Publier l'evenement"
                >
                  <Ionicons name="send" size={14} color="#FFFFFF" />
                  <Text style={styles.actionChipPrimaryText}>Publier</Text>
                </TouchableOpacity>
              )}

              {(item.status === 'draft' || item.status === 'rejected') && (
                <TouchableOpacity
                  style={[styles.actionIcon, { backgroundColor: inputBg, borderColor: hairline }]}
                  onPress={() => navigation.navigate('EventEdit', { eventId: item.id })}
                  accessibilityRole="button"
                  accessibilityLabel="Modifier l'evenement"
                >
                  <Ionicons name="create-outline" size={14} color={colors.text} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionIcon, { backgroundColor: inputBg, borderColor: hairline }]}
                onPress={() => showEventActions(item)}
                accessibilityRole="button"
                accessibilityLabel="Plus d'actions"
              >
                <Ionicons name="ellipsis-horizontal" size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEventItem = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <View style={columns > 1 ? { flex: 1 } : undefined}>
        {renderEvent({ item, index })}
      </View>
    ),
    [columns, renderEvent],
  );

  const renderFilterItem = useCallback(
    ({ item }: { item: { value: FilterStatus; label: string } }) => {
      const active = filter === item.value;
      return (
        <TouchableOpacity
          style={[
            styles.filterPill,
            active
              ? { backgroundColor: colors.text, borderColor: colors.text }
              : { backgroundColor: colors.card, borderColor: hairline },
          ]}
          onPress={() => setFilter(item.value)}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={`Filtre ${item.label}`}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: active ? colors.background : colors.gray600 },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [filter, colors, hairline],
  );

  const renderHeader = () => (
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
        <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TON CATALOGUE</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes événements</Text>
      </View>
      <TouchableOpacity
        style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        onPress={() => navigation.navigate('EventCreate')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Creer un evenement"
      >
        <Ionicons name="add" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        <EventsIllustration color={colors.primary} size={160} />
      </AnimatedIllustration>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery || filter !== 'all' ? 'Aucun événement trouvé' : 'Aucun événement'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || filter !== 'all'
          ? 'Essayez de modifier vos critères de recherche'
          : 'Créez votre premier événement pour commencer'}
      </Text>
      {!searchQuery && filter === 'all' && (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EventCreate')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Creer un evenement"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Créer mon premier événement</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {renderHeader()}
        <MyEventsScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {renderHeader()}

      {/* Stats Card */}
      <View
        style={[
          styles.statsCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Total</Text>
        </View>
        <View style={[styles.statCardDivider, { backgroundColor: hairline }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.validated}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Validés</Text>
        </View>
        <View style={[styles.statCardDivider, { backgroundColor: hairline }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.draft}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Brouillons</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: hairline }]}>
          <Ionicons name="search" size={18} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher un événement..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Rechercher mes evenements"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Effacer la recherche">
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={renderFilterItem}
        />
      </View>

      {/* Events List */}
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: cardGap } : undefined}
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: containerPadding, paddingBottom: insets.bottom + Spacing.xl },
        ]}
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
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
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
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  statCardDivider: { width: 1 },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  filterContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  listContent: {
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  eventCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageWrap: {
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: 160,
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
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  eventContent: {
    padding: Spacing.md,
  },
  eventTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    lineHeight: FontSizes.lg * 1.25,
    marginBottom: Spacing.sm,
  },
  eventMeta: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
  },
  statCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statBlockValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
  },
  statBlockLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  statDivider: {
    width: 1,
    height: 14,
  },
  priceText: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  actionChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  actionChipPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  actionChipPrimaryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  createButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: '#FFFFFF',
  },
});
