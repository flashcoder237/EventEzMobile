import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { eventsAPI, categoriesAPI } from '../../api/client';
import { Event, MapMarker, Category, RootStackParamList } from '../../types';
import WebViewMap from '../../components/maps/WebViewMap';
import EventCard from '../../components/events/EventCard';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'list' | 'map';
type EventTypeFilter = 'all' | 'billetterie' | 'inscription';
type PriceFilter = 'all' | 'free' | 'paid';
type DateFilter = 'all' | 'today' | 'weekend' | 'week' | 'month';

interface Filters {
  eventType: EventTypeFilter;
  price: PriceFilter;
  date: DateFilter;
}

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    eventType: 'all',
    price: 'all',
    date: 'all',
  });
  const [tempFilters, setTempFilters] = useState<Filters>({
    eventType: 'all',
    price: 'all',
    date: 'all',
  });
  const [region, setRegion] = useState({
    latitude: 3.848,
    longitude: 11.502,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const activeFiltersCount = [
    filters.eventType !== 'all',
    filters.price !== 'all',
    filters.date !== 'all',
  ].filter(Boolean).length;

  useEffect(() => {
    requestLocationAndFetch();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const applyFilters = () => {
    let result = [...events];

    // Filter by event type
    if (filters.eventType !== 'all') {
      result = result.filter(event => event.event_type === filters.eventType);
    }

    // Filter by price
    if (filters.price === 'free') {
      result = result.filter(event => event.is_free);
    } else if (filters.price === 'paid') {
      result = result.filter(event => !event.is_free);
    }

    // Filter by date
    if (filters.date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter(event => {
        const eventDate = new Date(event.start_date);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

        switch (filters.date) {
          case 'today':
            return eventDay.getTime() === today.getTime();
          case 'weekend': {
            const dayOfWeek = today.getDay();
            const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
            const saturday = new Date(today);
            saturday.setDate(today.getDate() + daysUntilSaturday);
            const sunday = new Date(saturday);
            sunday.setDate(saturday.getDate() + 1);
            return eventDay >= saturday && eventDay <= sunday;
          }
          case 'week': {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + 7);
            return eventDay >= today && eventDay <= weekEnd;
          }
          case 'month': {
            const monthEnd = new Date(today);
            monthEnd.setMonth(today.getMonth() + 1);
            return eventDay >= today && eventDay <= monthEnd;
          }
          default:
            return true;
        }
      });
    }

    setFilteredEvents(result);
  };

  const requestLocationAndFetch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const newLocation = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };
        setUserLocation(newLocation);
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        });
      }
    } catch (error) {
      console.error('Erreur localisation:', error);
    }
    fetchMapEvents();
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;

      const response = await eventsAPI.getEvents(params);
      setEvents(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapEvents = async () => {
    try {
      const response = await eventsAPI.getMapEvents();
      setMarkers(response.data.markers || []);
    } catch (error) {
      console.error('Erreur chargement événements carte:', error);
    }
  };

  const centerOnUser = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch (error) {
      console.error('Erreur localisation:', error);
    }
  };

  const handleMarkerPress = (marker: MapMarker) => {
    setSelectedMarker(marker);
    setRegion({
      latitude: marker.lat,
      longitude: marker.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Calculate event price from various sources
  const getEventPrice = (event: Event): number | undefined => {
    // If explicitly free
    if (event.is_free) return 0;

    // Try direct price fields
    if (typeof event.base_price === 'number' && event.base_price > 0) return event.base_price;
    if (typeof event.min_price === 'number' && event.min_price > 0) return event.min_price;

    // Calculate from ticket_types if available
    if (event.ticket_types && event.ticket_types.length > 0) {
      const prices = event.ticket_types.map(t => t.price).filter(p => typeof p === 'number');
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }

    // For inscription type without price, consider free
    if (event.event_type === 'inscription') return 0;

    return undefined;
  };

  const openFilters = () => {
    setTempFilters({ ...filters });
    setShowFilters(true);
  };

  const applyFilterChanges = () => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
  };

  const resetFilters = () => {
    const defaultFilters: Filters = {
      eventType: 'all',
      price: 'all',
      date: 'all',
    };
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
    setShowFilters(false);
  };

  const renderEvent = useCallback(
    ({ item }: { item: Event }) => {
      const price = getEventPrice(item);
      return (
        <View style={styles.eventCardContainer}>
          <EventCard
            id={item.id}
            title={item.title}
            date={item.start_date}
            time={item.start_time}
            location={item.location_city || item.location_address || 'Lieu à confirmer'}
            imageUrl={item.banner_image || item.display_image}
            category={item.category?.name}
            price={price}
            isFree={item.is_free || price === 0}
            isFeatured={item.is_featured}
            locationType={item.location_type}
            eventType={item.event_type}
            attendees={item.registration_count || item.registrations_count}
            variant="grid"
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          />
        </View>
      );
    },
    [navigation]
  );

  const renderFilterOption = (
    label: string,
    value: string,
    currentValue: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[
        styles.filterOption,
        currentValue === value && styles.filterOptionActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterOptionText,
          currentValue === value && styles.filterOptionTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Event Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Type d'événement</Text>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Tous', 'all', tempFilters.eventType, () =>
                  setTempFilters({ ...tempFilters, eventType: 'all' })
                )}
                {renderFilterOption('Billetterie', 'billetterie', tempFilters.eventType, () =>
                  setTempFilters({ ...tempFilters, eventType: 'billetterie' })
                )}
                {renderFilterOption('Inscription', 'inscription', tempFilters.eventType, () =>
                  setTempFilters({ ...tempFilters, eventType: 'inscription' })
                )}
              </View>
            </View>

            {/* Price Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Prix</Text>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Tous', 'all', tempFilters.price, () =>
                  setTempFilters({ ...tempFilters, price: 'all' })
                )}
                {renderFilterOption('Gratuit', 'free', tempFilters.price, () =>
                  setTempFilters({ ...tempFilters, price: 'free' })
                )}
                {renderFilterOption('Payant', 'paid', tempFilters.price, () =>
                  setTempFilters({ ...tempFilters, price: 'paid' })
                )}
              </View>
            </View>

            {/* Date Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date</Text>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Tous', 'all', tempFilters.date, () =>
                  setTempFilters({ ...tempFilters, date: 'all' })
                )}
                {renderFilterOption("Aujourd'hui", 'today', tempFilters.date, () =>
                  setTempFilters({ ...tempFilters, date: 'today' })
                )}
              </View>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Ce weekend', 'weekend', tempFilters.date, () =>
                  setTempFilters({ ...tempFilters, date: 'weekend' })
                )}
                {renderFilterOption('Cette semaine', 'week', tempFilters.date, () =>
                  setTempFilters({ ...tempFilters, date: 'week' })
                )}
                {renderFilterOption('Ce mois', 'month', tempFilters.date, () =>
                  setTempFilters({ ...tempFilters, date: 'month' })
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilterChanges}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderListView = () => (
    <FlatList
      data={filteredEvents}
      renderItem={renderEvent}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="search-outline" size={48} color={Colors.gray300} />
            </View>
            <Text style={styles.emptyTitle}>Aucun événement trouvé</Text>
            <Text style={styles.emptyText}>
              Essayez de modifier vos critères de recherche
            </Text>
          </View>
        ) : null
      }
    />
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <WebViewMap
        markers={markers}
        userLocation={userLocation}
        selectedMarkerId={selectedMarker?.id}
        onMarkerPress={handleMarkerPress}
        initialRegion={region}
      />

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color={Colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Events Count */}
      <View style={styles.countBadge}>
        <Ionicons name="location" size={14} color={Colors.primary} />
        <Text style={styles.countText}>{markers.length} événements</Text>
      </View>

      {/* Selected Event Card */}
      {selectedMarker && (
        <TouchableOpacity
          style={styles.selectedCard}
          onPress={() => navigation.navigate('EventDetails', { eventId: selectedMarker.id })}
          activeOpacity={0.95}
        >
          <View style={styles.selectedCardContent}>
            <Text style={styles.selectedCardDate}>
              {formatDate(selectedMarker.start_date).toUpperCase()}
            </Text>
            <Text style={styles.selectedCardTitle} numberOfLines={1}>
              {selectedMarker.title}
            </Text>
            <View style={styles.selectedCardMeta}>
              <Ionicons name="location-outline" size={14} color={Colors.gray500} />
              <Text style={styles.selectedCardMetaText}>
                {selectedMarker.location_city}
              </Text>
            </View>
          </View>
          <View style={styles.selectedCardButton}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des événements"
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
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={openFilters}
        >
          <Ionicons name="options-outline" size={22} color={activeFiltersCount > 0 ? Colors.white : Colors.gray700} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapToggleButton}
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={22}
            color={Colors.gray700}
          />
        </TouchableOpacity>
      </View>

      {/* Categories Filter */}
      {viewMode === 'list' && (
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && styles.categoryChipTextActive,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() =>
                  setSelectedCategory(selectedCategory === category.id ? null : category.id)
                }
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.id && styles.categoryChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Header */}
      {viewMode === 'list' && !loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''}
          </Text>
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearFiltersText}>Effacer les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      {loading && viewMode === 'list' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : viewMode === 'list' ? (
        renderListView()
      ) : (
        renderMapView()
      )}

      {/* Filters Modal */}
      {renderFiltersModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  // ===== SEARCH CONTAINER =====
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    paddingVertical: 2,
  },
  // ===== ACTION BUTTONS =====
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  mapToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ===== CATEGORIES =====
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  categoriesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    fontFamily: FontFamily.medium,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  // ===== RESULTS HEADER =====
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  resultsCount: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontFamily: FontFamily.medium,
  },
  clearFiltersText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ===== LIST CONTENT =====
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  eventCardContainer: {
    marginBottom: Spacing.md,
  },
  // ===== EMPTY STATE =====
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...TextStyles.h4,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...TextStyles.small,
    color: Colors.gray500,
    textAlign: 'center',
  },
  // ===== MAP STYLES =====
  mapContainer: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 140,
  },
  mapButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  countBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    ...Shadows.xs,
  },
  countText: {
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    fontSize: FontSizes.sm,
  },
  // ===== SELECTED CARD =====
  selectedCard: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.md,
  },
  selectedCardContent: {
    flex: 1,
  },
  selectedCardDate: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
    marginBottom: 4,
  },
  selectedCardTitle: {
    ...TextStyles.bodyBold,
    marginBottom: Spacing.xs,
  },
  selectedCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedCardMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  selectedCardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ===== MODAL STYLES =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterSectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  filterOptionTextActive: {
    color: Colors.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    gap: Spacing.md,
  },
  resetButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
