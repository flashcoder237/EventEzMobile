import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';

import { eventsAPI, categoriesAPI, recommendationsAPI } from '../../api/client';
import { Event, Category, MapMarker, RootStackParamList, MainTabParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SkeletonList, EventCardSkeleton } from '../../components/ui/Skeleton';
import { FadeInView, SectionEntrance, PulsingBadge, ContentTransition, StaggeredItem } from '../../components/ui/Animations';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { getApiResults } from '../../lib/utils/apiHelpers';
import { getEventPrice, getEventPriceRange } from '../../lib/utils/priceFormatters';
import { isEventInFuture, formatDate } from '../../lib/utils/dateFormatters';
import { EmptyState } from '../../components/ui';
import EventCard from '../../components/events/EventCard';
import CategoryCard from '../../components/events/CategoryCard';
import WebViewMap from '../../components/maps/WebViewMap';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category icons map
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'musique': 'musical-notes',
  'music': 'musical-notes',
  'concert': 'musical-notes',
  'sport': 'football',
  'sports': 'football',
  'art': 'color-palette',
  'culture': 'library',
  'food': 'restaurant',
  'gastronomie': 'restaurant',
  'tech': 'hardware-chip',
  'technologie': 'hardware-chip',
  'business': 'briefcase',
  'education': 'school',
  'santé': 'fitness',
  'health': 'fitness',
  'film': 'film',
  'cinéma': 'film',
  'default': 'calendar',
};

// Filter types
type EventTypeFilter = 'all' | 'billetterie' | 'inscription';
type PriceFilter = 'all' | 'free' | 'paid';
type DateFilter = 'all' | 'today' | 'weekend' | 'week' | 'month';
type LocationTypeFilter = 'all' | 'in_person' | 'online' | 'hybrid';
type SortOption = 'date' | 'price_asc' | 'price_desc' | 'popularity' | 'distance';

interface Filters {
  eventType: EventTypeFilter;
  price: PriceFilter;
  date: DateFilter;
  locationType: LocationTypeFilter;
  distance: number;
  priceMin: number;
  priceMax: number;
  sortBy: SortOption;
}

const PAGE_SIZE = 20;
const defaultFilters: Filters = {
  eventType: 'all',
  price: 'all',
  date: 'all',
  locationType: 'all',
  distance: 0,
  priceMin: 0,
  priceMax: 0,
  sortBy: 'date',
};

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Discover'>>();
  const { user } = useAuth();
  const { unreadNotificationCount, unreadMessageCount } = useNotifications();

  // === State: Discovery Feed ===
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [freeEvents, setFreeEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // === State: Search Mode ===
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [filteredResults, setFilteredResults] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tempFilters, setTempFilters] = useState<Filters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapRadius, setMapRadius] = useState(100);
  const [region, setRegion] = useState({
    latitude: 3.848,
    longitude: 11.502,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const activeFiltersCount = [
    filters.eventType !== 'all',
    filters.price !== 'all',
    filters.date !== 'all',
    filters.locationType !== 'all',
    filters.distance > 0,
    filters.priceMin > 0,
    filters.priceMax > 0,
    filters.sortBy !== 'date',
  ].filter(Boolean).length;

  // === Initial load ===
  useEffect(() => {
    fetchDiscoveryData();
    fetchRecommendations();
    requestLocation();
  }, []);

  // Category from navigation params
  useEffect(() => {
    if (route.params?.category) {
      setSelectedCategory(route.params.category);
      setIsSearchActive(true);
    }
  }, [route.params?.category]);

  // Search when query or category changes
  useEffect(() => {
    if (isSearchActive) {
      setCurrentPage(1);
      fetchSearchResults(1, false);
    }
  }, [searchQuery, selectedCategory, filters.sortBy]);

  // Apply filters
  useEffect(() => {
    if (isSearchActive) {
      applyFilters();
    }
  }, [searchResults, filters]);

  // Location-dependent fetch
  useEffect(() => {
    if (location) {
      fetchNearbyEvents();
    }
  }, [location]);

  // === Data fetching: Discovery ===

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
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
  };

  const fetchDiscoveryData = async () => {
    try {
      const [featuredRes, categoriesRes, upcomingRes] = await Promise.all([
        eventsAPI.getFeaturedEvents(),
        categoriesAPI.getCategories(),
        eventsAPI.getEvents({ ordering: 'start_date', limit: 15 }),
      ]);

      const featuredData = getApiResults<Event>(featuredRes).filter(e => isEventInFuture(e.start_date));
      const upcomingData = getApiResults<Event>(upcomingRes).filter(e => isEventInFuture(e.start_date));

      setFeaturedEvents(featuredData);
      setCategories(getApiResults<Category>(categoriesRes));
      setUpcomingEvents(upcomingData);
      setFreeEvents(upcomingData.filter(e => e.is_free));
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await recommendationsAPI.getRecommendations({ limit: 10 });
      setRecommendations(getApiResults<Event>(response).filter(e => isEventInFuture(e.start_date)));
    } catch {
      // Recommendations may not be available
    }
  };

  const fetchNearbyEvents = async () => {
    if (!location) return;
    try {
      const response = await eventsAPI.getNearbyEvents(location.lat, location.lng, 50, 10);
      setNearbyEvents(getApiResults<Event>(response).filter(e => isEventInFuture(e.start_date)));
    } catch (error) {
      console.error('Erreur événements proches:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDiscoveryData(), fetchRecommendations(), location && fetchNearbyEvents()]);
    setRefreshing(false);
  };

  // === Data fetching: Search ===

  const fetchSearchResults = async (page: number = 1, append: boolean = false) => {
    if (page === 1) setSearchLoading(true);
    else setLoadingMore(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (filters.sortBy === 'date') params.ordering = 'start_date';
      else if (filters.sortBy === 'popularity') params.ordering = '-registration_count';

      const response = await eventsAPI.getEvents(params);
      const newEvents = response.data?.results || response.data || [];
      const count = response.data?.count || newEvents.length;
      const nextPage = response.data?.next;

      setSearchResults(prev => append ? [...prev, ...newEvents] : newEvents);
      setTotalCount(count);
      setHasNextPage(!!nextPage);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setSearchLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchMapEvents = async () => {
    try {
      const response = await eventsAPI.getMapEvents();
      setMarkers(response.data.markers || []);
    } catch (error) {
      console.error('Erreur événements carte:', error);
    }
  };

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // === Filter logic ===

  const applyFilters = () => {
    let result = [...searchResults];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result = result.filter(e => !e.start_date || new Date(e.start_date) >= today);

    if (filters.eventType !== 'all') result = result.filter(e => e.event_type === filters.eventType);
    if (filters.locationType !== 'all') result = result.filter(e => e.location_type === filters.locationType);
    if (filters.price === 'free') result = result.filter(e => e.is_free || getEventPrice(e) === 0);
    else if (filters.price === 'paid') result = result.filter(e => !e.is_free && getEventPrice(e) !== 0);
    if (filters.priceMin > 0 || filters.priceMax > 0) {
      result = result.filter(e => {
        const p = getEventPrice(e);
        if (p === undefined) return true;
        if (filters.priceMin > 0 && p < filters.priceMin) return false;
        if (filters.priceMax > 0 && p > filters.priceMax) return false;
        return true;
      });
    }
    if (filters.distance > 0 && location) {
      result = result.filter(e => {
        if (!e.location_latitude || !e.location_longitude) return true;
        return calculateDistance(location.lat, location.lng, e.location_latitude, e.location_longitude) <= filters.distance;
      });
    }
    if (filters.date !== 'all') {
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(e => {
        const eventDay = new Date(new Date(e.start_date).getFullYear(), new Date(e.start_date).getMonth(), new Date(e.start_date).getDate());
        switch (filters.date) {
          case 'today': return eventDay.getTime() === todayDate.getTime();
          case 'weekend': {
            const sat = new Date(todayDate);
            sat.setDate(todayDate.getDate() + (6 - todayDate.getDay() + 7) % 7);
            const sun = new Date(sat);
            sun.setDate(sat.getDate() + 1);
            return eventDay >= sat && eventDay <= sun;
          }
          case 'week': {
            const end = new Date(todayDate);
            end.setDate(todayDate.getDate() + 7);
            return eventDay >= todayDate && eventDay <= end;
          }
          case 'month': {
            const end = new Date(todayDate);
            end.setMonth(todayDate.getMonth() + 1);
            return eventDay >= todayDate && eventDay <= end;
          }
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date': return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'price_asc': return (getEventPrice(a) ?? 0) - (getEventPrice(b) ?? 0);
        case 'price_desc': return (getEventPrice(b) ?? 0) - (getEventPrice(a) ?? 0);
        case 'popularity': return (b.registration_count || 0) - (a.registration_count || 0);
        case 'distance': {
          if (!location) return 0;
          const dA = a.location_latitude && a.location_longitude
            ? calculateDistance(location.lat, location.lng, a.location_latitude, a.location_longitude) : Infinity;
          const dB = b.location_latitude && b.location_longitude
            ? calculateDistance(location.lat, location.lng, b.location_latitude, b.location_longitude) : Infinity;
          return dA - dB;
        }
        default: return 0;
      }
    });

    setFilteredResults(result);
  };

  const filteredMarkers = useMemo(() => {
    let result = [...markers];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result = result.filter(m => !m.start_date || new Date(m.start_date) >= today);
    if (location && mapRadius > 0) {
      result = result.filter(m => m.lat && m.lng && calculateDistance(location.lat, location.lng, m.lat, m.lng) <= mapRadius);
    }
    return result;
  }, [markers, location, mapRadius, calculateDistance]);

  // === Handlers ===

  const activateSearch = () => {
    setIsSearchActive(true);
    fetchSearchResults(1, false);
    fetchMapEvents();
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const deactivateSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setSelectedCategory(null);
    setFilters(defaultFilters);
    setViewMode('list');
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
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
    setShowFilters(false);
  };

  const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    return categoryIcons[name.toLowerCase()] || categoryIcons.default;
  };

  const navigateToEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  // === Render helpers ===

  const renderEventCard = useCallback((item: Event, variant: 'default' | 'featured' | 'horizontal' | 'grid' = 'default') => {
    const range = getEventPriceRange(item);
    return (
      <EventCard
        id={item.id}
        title={item.title}
        date={item.start_date}
        time={item.start_time}
        location={item.location_city || item.location_address || 'Lieu à confirmer'}
        imageUrl={item.banner_image || item.category?.default_event_image || item.display_image}
        category={item.category?.name}
        price={range?.min}
        priceMax={range?.max}
        isFree={item.is_free || (range?.min === 0 && range?.max === 0)}
        isFeatured={item.is_featured}
        locationType={item.location_type}
        eventType={item.event_type}
        attendees={item.registration_count || item.registrations_count}
        variant={variant}
        onPress={() => navigateToEvent(item.id)}
      />
    );
  }, [navigation]);

  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={TOUCH_OPACITY}>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // === SEARCH MODE ===

  const renderSearchHeader = () => (
    <View style={styles.searchHeader}>
      <TouchableOpacity onPress={deactivateSearch} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
      </TouchableOpacity>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={18} color={Colors.gray400} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Rechercher des événements"
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
      <TouchableOpacity
        style={[styles.iconButton, activeFiltersCount > 0 && styles.iconButtonActive]}
        onPress={openFilters}
      >
        <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? Colors.white : Colors.gray700} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
      >
        <Ionicons name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={20} color={Colors.gray700} />
      </TouchableOpacity>
    </View>
  );

  const renderCategoryChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsList}
    >
      <TouchableOpacity
        style={[styles.chip, !selectedCategory && styles.chipActive]}
        onPress={() => setSelectedCategory(null)}
      >
        <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>Tous</Text>
      </TouchableOpacity>
      {categories.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
          onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
        >
          <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSearchContent = () => {
    if (viewMode === 'map') {
      return (
        <View style={styles.mapContainer}>
          <WebViewMap
            markers={filteredMarkers}
            userLocation={location}
            selectedMarkerId={selectedMarker?.id}
            onMarkerPress={(marker: MapMarker) => {
              setSelectedMarker(marker);
              setRegion({ latitude: marker.lat, longitude: marker.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            }}
            initialRegion={region}
            radiusKm={mapRadius}
            showRadius={!!location}
          />
          {/* Radius slider */}
          <View style={styles.radiusPanel}>
            <View style={styles.radiusHeader}>
              <Text style={styles.radiusLabel}>Rayon</Text>
              <Text style={styles.radiusValue}>{mapRadius} km</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 32 }}
              minimumValue={5}
              maximumValue={5000}
              step={10}
              value={mapRadius}
              onValueChange={v => setMapRadius(Math.round(v))}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.gray200}
              thumbTintColor={Colors.primary}
            />
          </View>
          {selectedMarker && (
            <TouchableOpacity
              style={styles.mapSelectedCard}
              onPress={() => navigateToEvent(selectedMarker.id)}
              activeOpacity={0.9}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.dateAccent}>{formatDate(selectedMarker.start_date).toUpperCase()}</Text>
                <Text style={styles.mapCardTitle} numberOfLines={1}>{selectedMarker.title}</Text>
                <Text style={styles.mapCardLocation}>{selectedMarker.location_city}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <FlatList
        ref={flatListRef}
        data={filteredResults}
        renderItem={({ item, index }) => (
          <StaggeredItem index={index} staggerDelay={50}>
            <View style={styles.searchResultItem}>{renderEventCard(item, 'grid')}</View>
          </StaggeredItem>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.searchResultsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !searchLoading ? (
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsCount}>
                {filteredResults.length} événement{filteredResults.length !== 1 ? 's' : ''}
              </Text>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={styles.clearFilters}>Effacer filtres</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !searchLoading ? (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyTitle}>Aucun événement trouvé</Text>
              <Text style={styles.emptySubtitle}>Essayez de modifier vos critères</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: Spacing.lg }} />
          ) : hasNextPage ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => fetchSearchResults(currentPage + 1, true)}
            >
              <Text style={styles.loadMoreText}>Voir plus</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    );
  };

  const renderSearchMode = () => (
    <View style={{ flex: 1 }}>
      {renderSearchHeader()}
      {viewMode === 'list' && renderCategoryChips()}
      <ContentTransition
        isLoading={searchLoading && viewMode === 'list'}
        skeleton={
          <View style={{ flex: 1, padding: 20 }}>
            <SkeletonList count={4} Component={EventCardSkeleton} />
          </View>
        }
        style={{ flex: 1 }}
      >
        {renderSearchContent()}
      </ContentTransition>
    </View>
  );

  // === FILTERS MODAL ===

  const renderFilterOption = (label: string, value: string, current: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.filterChip, current === value && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, current === value && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFiltersModal = () => (
    <Modal visible={showFilters} animationType="fade" transparent onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Sort */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Trier par</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Date', 'date', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'date' }))}
                {renderFilterOption('Popularité', 'popularity', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'popularity' }))}
                {renderFilterOption('Prix ↑', 'price_asc', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'price_asc' }))}
                {renderFilterOption('Prix ↓', 'price_desc', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'price_desc' }))}
              </View>
            </View>
            {/* Event Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Type</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.eventType, () => setTempFilters({ ...tempFilters, eventType: 'all' }))}
                {renderFilterOption('Billetterie', 'billetterie', tempFilters.eventType, () => setTempFilters({ ...tempFilters, eventType: 'billetterie' }))}
                {renderFilterOption('Inscription', 'inscription', tempFilters.eventType, () => setTempFilters({ ...tempFilters, eventType: 'inscription' }))}
              </View>
            </View>
            {/* Price */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Prix</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.price, () => setTempFilters({ ...tempFilters, price: 'all' }))}
                {renderFilterOption('Gratuit', 'free', tempFilters.price, () => setTempFilters({ ...tempFilters, price: 'free' }))}
                {renderFilterOption('Payant', 'paid', tempFilters.price, () => setTempFilters({ ...tempFilters, price: 'paid' }))}
              </View>
            </View>
            {/* Price Range */}
            {tempFilters.price === 'paid' && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Fourchette de prix</Text>
                <View style={styles.filterRow}>
                  {renderFilterOption('Tous', 'all',
                    tempFilters.priceMin === 0 && tempFilters.priceMax === 0 ? 'all' : '',
                    () => setTempFilters({ ...tempFilters, priceMin: 0, priceMax: 0 })
                  )}
                  {renderFilterOption('< 5 000', 'lt5k',
                    tempFilters.priceMax === 5000 && tempFilters.priceMin === 0 ? 'lt5k' : '',
                    () => setTempFilters({ ...tempFilters, priceMin: 0, priceMax: 5000 })
                  )}
                  {renderFilterOption('5k - 15k', '5k15k',
                    tempFilters.priceMin === 5000 && tempFilters.priceMax === 15000 ? '5k15k' : '',
                    () => setTempFilters({ ...tempFilters, priceMin: 5000, priceMax: 15000 })
                  )}
                  {renderFilterOption('15k - 50k', '15k50k',
                    tempFilters.priceMin === 15000 && tempFilters.priceMax === 50000 ? '15k50k' : '',
                    () => setTempFilters({ ...tempFilters, priceMin: 15000, priceMax: 50000 })
                  )}
                </View>
                <View style={styles.priceInputRow}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Min (FCFA)</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={tempFilters.priceMin > 0 ? String(tempFilters.priceMin) : ''}
                      onChangeText={(v) => setTempFilters({ ...tempFilters, priceMin: parseInt(v) || 0 })}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>
                  <Text style={styles.priceInputSeparator}>-</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Max (FCFA)</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={tempFilters.priceMax > 0 ? String(tempFilters.priceMax) : ''}
                      onChangeText={(v) => setTempFilters({ ...tempFilters, priceMax: parseInt(v) || 0 })}
                      keyboardType="numeric"
                      placeholder="Illimité"
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>
                </View>
              </View>
            )}
            {/* Date */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'all' }))}
                {renderFilterOption("Aujourd'hui", 'today', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'today' }))}
                {renderFilterOption('Ce weekend', 'weekend', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'weekend' }))}
                {renderFilterOption('Cette semaine', 'week', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'week' }))}
                {renderFilterOption('Ce mois', 'month', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'month' }))}
              </View>
            </View>
            {/* Distance */}
            {location && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Distance</Text>
                <View style={styles.filterRow}>
                  {renderFilterOption('Tous', 'all',
                    tempFilters.distance === 0 ? 'all' : '',
                    () => setTempFilters({ ...tempFilters, distance: 0 })
                  )}
                  {renderFilterOption('5 km', '5km',
                    tempFilters.distance === 5 ? '5km' : '',
                    () => setTempFilters({ ...tempFilters, distance: 5 })
                  )}
                  {renderFilterOption('10 km', '10km',
                    tempFilters.distance === 10 ? '10km' : '',
                    () => setTempFilters({ ...tempFilters, distance: 10 })
                  )}
                  {renderFilterOption('25 km', '25km',
                    tempFilters.distance === 25 ? '25km' : '',
                    () => setTempFilters({ ...tempFilters, distance: 25 })
                  )}
                  {renderFilterOption('50 km', '50km',
                    tempFilters.distance === 50 ? '50km' : '',
                    () => setTempFilters({ ...tempFilters, distance: 50 })
                  )}
                </View>
              </View>
            )}
            {/* Location Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Lieu</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'all' }))}
                {renderFilterOption('Présentiel', 'in_person', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'in_person' }))}
                {renderFilterOption('En ligne', 'online', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'online' }))}
                {renderFilterOption('Hybride', 'hybrid', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'hybrid' }))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilterChanges}>
              <Text style={styles.applyBtnText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // === DISCOVERY FEED (main view) ===

  const renderDiscoveryFeed = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header with actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={18} color={Colors.accent} />
          <Text style={styles.headerLocation}>
            {location ? 'Douala' : 'Douala, Cameroun'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.gray400} />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Messages')}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.gray800} />
            {unreadMessageCount > 0 && (
              <PulsingBadge active={unreadMessageCount > 0} style={styles.badgeWrapper}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</Text>
                </View>
              </PulsingBadge>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color={Colors.gray800} />
            {unreadNotificationCount > 0 && (
              <PulsingBadge active={unreadNotificationCount > 0} style={styles.badgeWrapper}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text>
                </View>
              </PulsingBadge>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero greeting */}
      <FadeInView delay={100} translateY={20}>
        <View style={styles.heroSection}>
          <Text style={styles.heroEyebrow}>
            {user?.first_name ? `Bonjour ${user.first_name}` : 'Bienvenue'}
          </Text>
          <Text style={styles.heroTitle}>Discover{'\n'}Events</Text>
        </View>
      </FadeInView>

      {/* Search Bar (tap to activate) — pill shape */}
      <FadeInView delay={200} translateY={12}>
        <TouchableOpacity style={styles.searchBarTrigger} onPress={activateSearch} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color={Colors.gray400} />
          <Text style={styles.searchPlaceholder}>Rechercher un événement</Text>
        </TouchableOpacity>
      </FadeInView>

      {/* Category Chips */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discoverChips}
        >
          {categories.slice(0, 8).map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.discoverChip}
              onPress={() => {
                setSelectedCategory(cat.id);
                activateSearch();
              }}
            >
              <Ionicons name={getCategoryIcon(cat.name)} size={16} color={Colors.primary} />
              <Text style={styles.discoverChipText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Featured Events — Hero Carousel */}
      {featuredEvents.length > 0 && (
        <SectionEntrance delay={300}>
          <View style={styles.section}>
            <SectionHeader title="À la une" onSeeAll={activateSearch} />
            <FlatList
              horizontal
              data={featuredEvents}
              renderItem={({ item, index }) => (
                <View style={[styles.featuredCardWrap, index === 0 && { marginLeft: Spacing.lg }]}>
                  {renderEventCard(item, 'featured')}
                </View>
              )}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: Spacing.lg }}
              snapToInterval={SCREEN_WIDTH * 0.88 + Spacing.md}
              decelerationRate="fast"
            />
          </View>
        </SectionEntrance>
      )}

      {/* Nearby Events */}
      {nearbyEvents.length > 0 && (
        <SectionEntrance delay={400}>
          <View style={styles.section}>
            <SectionHeader title="Populaire près de toi" onSeeAll={activateSearch} />
            <FlatList
              horizontal
              data={nearbyEvents}
              renderItem={({ item, index }) => (
                <View style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}>
                  {renderEventCard(item, 'default')}
                </View>
              )}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: Spacing.lg }}
            />
          </View>
        </SectionEntrance>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <SectionEntrance delay={500}>
          <View style={styles.section}>
            <SectionHeader title="Recommandé pour toi" onSeeAll={activateSearch} />
            <FlatList
              horizontal
              data={recommendations}
              renderItem={({ item, index }) => (
                <View style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}>
                  {renderEventCard(item, 'default')}
                </View>
              )}
              keyExtractor={item => `rec-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: Spacing.lg }}
            />
          </View>
        </SectionEntrance>
      )}

      {/* This Weekend */}
      {upcomingEvents.length > 0 && (
        <SectionEntrance delay={600}>
          <View style={styles.section}>
            <SectionHeader title="Ce week-end" onSeeAll={activateSearch} />
            <FlatList
              horizontal
              data={upcomingEvents.slice(0, 6)}
              renderItem={({ item, index }) => (
                <View style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}>
                  {renderEventCard(item, 'default')}
                </View>
              )}
              keyExtractor={item => `wk-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: Spacing.lg }}
            />
          </View>
        </SectionEntrance>
      )}

      {/* Free Events */}
      {freeEvents.length > 0 && (
        <SectionEntrance delay={700}>
          <View style={styles.section}>
            <SectionHeader title="Gratuit" onSeeAll={activateSearch} />
            <FlatList
              horizontal
              data={freeEvents.slice(0, 6)}
              renderItem={({ item, index }) => (
                <View style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}>
                  {renderEventCard(item, 'default')}
                </View>
              )}
              keyExtractor={item => `free-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: Spacing.lg }}
            />
          </View>
        </SectionEntrance>
      )}

      {/* Categories grid */}
      {categories.length > 0 && (
        <SectionEntrance delay={800}>
          <View style={styles.section}>
            <SectionHeader title="Explorer par catégorie" />
            <FlatList
              horizontal
              data={categories}
              renderItem={({ item, index }) => (
                <View style={[styles.categoryWrap, index === 0 && { marginLeft: Spacing.lg }]}>
                  <CategoryCard
                    id={item.id.toString()}
                    name={item.name}
                    icon={getCategoryIcon(item.name)}
                    image={item.image}
                    eventCount={item.event_count || item.events_count}
                    variant="large"
                    onPress={() => {
                      setSelectedCategory(item.id);
                      activateSearch();
                    }}
                  />
                </View>
              )}
              keyExtractor={item => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: Spacing.lg }}
            />
          </View>
        </SectionEntrance>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );

  // === MAIN RENDER ===

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      {isSearchActive ? renderSearchMode() : renderDiscoveryFeed()}
      {renderFiltersModal()}
    </SafeAreaView>
  );
}

// === STYLES ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  // === HEADER ===
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLocation: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },

  // === HERO SECTION ===
  heroSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  heroEyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 40,
    color: Colors.gray900,
    lineHeight: 44,
    letterSpacing: -1.5,
  },

  // === SEARCH BAR (discovery) — pill shape ===
  searchBarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray400,
  },

  // === DISCOVER CHIPS ===
  discoverChips: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  discoverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    height: 30,
    borderRadius: BorderRadius.full,
    gap: 4,
    marginRight: Spacing.xs,
    ...Shadows.xs,
  },
  discoverChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },

  // === SECTIONS ===
  section: {
    marginTop: Spacing['3xl'],   
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: FontSizes['2xl'],
    color: Colors.gray900,
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },

  // === CARD WRAPPERS ===
  featuredCardWrap: {
    marginRight: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardWrap: {
    marginRight: Spacing.md,
    marginBottom: Spacing.lg,
  },
  categoryWrap: {
    marginRight: Spacing.md,
  },

  // === SEARCH MODE ===
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    paddingVertical: 0,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: Colors.primary,
  },

  // === CHIPS (search) ===
  chipsList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  chipTextActive: {
    color: Colors.white,
  },

  // === SEARCH RESULTS ===
  searchResultsList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 130,
  },
  searchResultItem: {
    marginBottom: Spacing.sm,
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resultsCount: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  clearFilters: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySearch: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
  },
  emptyTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray700,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  loadMoreText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },

  // === MAP ===
  mapContainer: {
    flex: 1,
  },
  radiusPanel: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  radiusLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  radiusValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  dateAccent: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mapSelectedCard: {
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
  mapCardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    marginBottom: 2,
  },
  mapCardLocation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  // === FILTERS MODAL ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '75%',
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: Colors.gray900,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterSectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceInputLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  priceInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
  },
  priceInputSeparator: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.lg,
    color: Colors.gray400,
    marginTop: Spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    gap: Spacing.md,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  resetBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
});
