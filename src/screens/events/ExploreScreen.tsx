import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';

import { eventsAPI, categoriesAPI } from '../../api/client';
import { Event, MapMarker, Category, RootStackParamList, MainTabParamList } from '../../types';
import WebViewMap from '../../components/maps/WebViewMap';
import EventCard from '../../components/events/EventCard';
import { getEventPrice, getEventPriceRange } from '../../lib/utils/priceFormatters';
import { formatDate } from '../../lib/utils/dateFormatters';
import { SkeletonList, EventCardSkeleton } from '../../components/ui/Skeleton';
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
type LocationTypeFilter = 'all' | 'in_person' | 'online' | 'hybrid';
type SortOption = 'date' | 'price_asc' | 'price_desc' | 'popularity' | 'distance';

interface Filters {
  eventType: EventTypeFilter;
  price: PriceFilter;
  date: DateFilter;
  locationType: LocationTypeFilter;
  distance: number; // en km, 0 = pas de limite
  priceMin: number;
  priceMax: number; // 0 = pas de limite
  sortBy: SortOption;
}

const PAGE_SIZE = 20;
const MIN_RADIUS = 5;
const MAX_RADIUS = 5000;
const DEFAULT_RADIUS = 100;

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

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Explore'>>();
  const flatListRef = useRef<FlatList>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tempFilters, setTempFilters] = useState<Filters>(defaultFilters);
  const [region, setRegion] = useState({
    latitude: 3.848,
    longitude: 11.502,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  // Map radius state
  const [mapRadius, setMapRadius] = useState(DEFAULT_RADIUS);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Scroll to top button
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Calcul de la distance entre deux points (formule Haversine)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Filtered markers for map view
  const filteredMarkers = useMemo(() => {
    let result = [...markers];

    // Filter out past events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result = result.filter(marker => {
      if (!marker.start_date) return true;
      const eventDate = new Date(marker.start_date);
      return eventDate >= today;
    });

    // Filter by radius
    if (userLocation && mapRadius > 0) {
      result = result.filter(marker => {
        if (!marker.lat || !marker.lng) return false;
        const dist = calculateDistance(userLocation.lat, userLocation.lng, marker.lat, marker.lng);
        return dist <= mapRadius;
      });
    }

    // Filter by event type
    if (filters.eventType !== 'all') {
      result = result.filter(marker => (marker as any).event_type === filters.eventType);
    }

    // Filter by location type
    if (filters.locationType !== 'all') {
      result = result.filter(marker => (marker as any).location_type === filters.locationType);
    }

    // Filter by price (free/paid)
    if (filters.price === 'free') {
      result = result.filter(marker => {
        const markerData = marker as any;
        return markerData.is_free || markerData.price === 0 || markerData.min_price === 0;
      });
    } else if (filters.price === 'paid') {
      result = result.filter(marker => {
        const markerData = marker as any;
        return !markerData.is_free && (markerData.price > 0 || markerData.min_price > 0);
      });
    }

    // Filter by price range
    if (filters.priceMin > 0 || filters.priceMax > 0) {
      result = result.filter(marker => {
        const markerData = marker as any;
        const price = markerData.price || markerData.min_price || 0;
        if (filters.priceMin > 0 && price < filters.priceMin) return false;
        if (filters.priceMax > 0 && price > filters.priceMax) return false;
        return true;
      });
    }

    // Filter by date
    if (filters.date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter(marker => {
        if (!marker.start_date) return true;
        const eventDate = new Date(marker.start_date);
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

    return result;
  }, [markers, userLocation, mapRadius, filters, calculateDistance]);

  // Pre-select category from navigation params
  useEffect(() => {
    if (route.params?.category) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params?.category]);

  useEffect(() => {
    requestLocationAndFetch();
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchEvents(1, false);
  }, [searchQuery, selectedCategory, filters.sortBy]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const applyFilters = () => {
    let result = [...events];

    // Filter out past events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result = result.filter(event => {
      if (!event.start_date) return true;
      const eventDate = new Date(event.start_date);
      return eventDate >= today;
    });

    // Filter by event type
    if (filters.eventType !== 'all') {
      result = result.filter(event => event.event_type === filters.eventType);
    }

    // Filter by location type
    if (filters.locationType !== 'all') {
      result = result.filter(event => event.location_type === filters.locationType);
    }

    // Filter by price (free/paid)
    if (filters.price === 'free') {
      result = result.filter(event => event.is_free || getEventPrice(event) === 0);
    } else if (filters.price === 'paid') {
      result = result.filter(event => !event.is_free && getEventPrice(event) !== 0);
    }

    // Filter by price range
    if (filters.priceMin > 0 || filters.priceMax > 0) {
      result = result.filter(event => {
        const price = getEventPrice(event);
        if (price === undefined) return true;
        if (filters.priceMin > 0 && price < filters.priceMin) return false;
        if (filters.priceMax > 0 && price > filters.priceMax) return false;
        return true;
      });
    }

    // Filter by distance
    if (filters.distance > 0 && userLocation) {
      result = result.filter(event => {
        if (!event.location_latitude || !event.location_longitude) return true;
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          event.location_latitude,
          event.location_longitude
        );
        return dist <= filters.distance;
      });
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

    // Apply sorting (client-side for filters not supported by API)
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'price_asc': {
          const priceA = getEventPrice(a) ?? 0;
          const priceB = getEventPrice(b) ?? 0;
          return priceA - priceB;
        }
        case 'price_desc': {
          const priceA = getEventPrice(a) ?? 0;
          const priceB = getEventPrice(b) ?? 0;
          return priceB - priceA;
        }
        case 'popularity':
          return (b.registration_count || 0) - (a.registration_count || 0);
        case 'distance':
          if (!userLocation) return 0;
          const distA = a.location_latitude && a.location_longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, a.location_latitude, a.location_longitude)
            : Infinity;
          const distB = b.location_latitude && b.location_longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, b.location_latitude, b.location_longitude)
            : Infinity;
          return distA - distB;
        default:
          return 0;
      }
    });

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

  const fetchEvents = async (page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params: any = {
        page,
        page_size: PAGE_SIZE,
      };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;

      // Ajouter le tri au niveau de l'API si possible
      if (filters.sortBy === 'date') {
        params.ordering = 'start_date';
      } else if (filters.sortBy === 'popularity') {
        params.ordering = '-registration_count';
      }

      const response = await eventsAPI.getEvents(params);
      const newEvents = response.data?.results || response.data || [];
      const count = response.data?.count || newEvents.length;
      const nextPage = response.data?.next;

      if (append) {
        setEvents(prev => [...prev, ...newEvents]);
      } else {
        setEvents(newEvents);
      }

      setTotalCount(count);
      setHasNextPage(!!nextPage);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreEvents = () => {
    if (!loadingMore && hasNextPage) {
      fetchEvents(currentPage + 1, true);
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

  // Scroll handlers
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 500);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderEvent = useCallback(
    ({ item }: { item: Event }) => {
      const range = getEventPriceRange(item);
      return (
        <View style={styles.eventCardContainer}>
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Trier par</Text>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Date', 'date', tempFilters.sortBy, () =>
                  setTempFilters({ ...tempFilters, sortBy: 'date' })
                )}
                {renderFilterOption('Popularité', 'popularity', tempFilters.sortBy, () =>
                  setTempFilters({ ...tempFilters, sortBy: 'popularity' })
                )}
              </View>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Prix croissant', 'price_asc', tempFilters.sortBy, () =>
                  setTempFilters({ ...tempFilters, sortBy: 'price_asc' })
                )}
                {renderFilterOption('Prix décroissant', 'price_desc', tempFilters.sortBy, () =>
                  setTempFilters({ ...tempFilters, sortBy: 'price_desc' })
                )}
              </View>
              {userLocation && (
                <View style={styles.filterOptionsRow}>
                  {renderFilterOption('Distance', 'distance', tempFilters.sortBy, () =>
                    setTempFilters({ ...tempFilters, sortBy: 'distance' })
                  )}
                </View>
              )}
            </View>

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

            {/* Location Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Type de lieu</Text>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('Tous', 'all', tempFilters.locationType, () =>
                  setTempFilters({ ...tempFilters, locationType: 'all' })
                )}
                {renderFilterOption('Présentiel', 'in_person', tempFilters.locationType, () =>
                  setTempFilters({ ...tempFilters, locationType: 'in_person' })
                )}
              </View>
              <View style={styles.filterOptionsRow}>
                {renderFilterOption('En ligne', 'online', tempFilters.locationType, () =>
                  setTempFilters({ ...tempFilters, locationType: 'online' })
                )}
                {renderFilterOption('Hybride', 'hybrid', tempFilters.locationType, () =>
                  setTempFilters({ ...tempFilters, locationType: 'hybrid' })
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

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Fourchette de prix (FCFA)</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={tempFilters.priceMin > 0 ? tempFilters.priceMin.toString() : ''}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setTempFilters({ ...tempFilters, priceMin: value });
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.gray400}
                  />
                </View>
                <View style={styles.priceRangeSeparator}>
                  <Text style={styles.priceRangeSeparatorText}>-</Text>
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={tempFilters.priceMax > 0 ? tempFilters.priceMax.toString() : ''}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setTempFilters({ ...tempFilters, priceMax: value });
                    }}
                    keyboardType="numeric"
                    placeholder="Illimité"
                    placeholderTextColor={Colors.gray400}
                  />
                </View>
              </View>
            </View>

            {/* Distance Filter */}
            {userLocation && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Distance maximale</Text>
                <View style={styles.filterOptionsRow}>
                  {renderFilterOption('Illimitée', '0', tempFilters.distance.toString(), () =>
                    setTempFilters({ ...tempFilters, distance: 0 })
                  )}
                  {renderFilterOption('5 km', '5', tempFilters.distance.toString(), () =>
                    setTempFilters({ ...tempFilters, distance: 5 })
                  )}
                  {renderFilterOption('10 km', '10', tempFilters.distance.toString(), () =>
                    setTempFilters({ ...tempFilters, distance: 10 })
                  )}
                </View>
                <View style={styles.filterOptionsRow}>
                  {renderFilterOption('25 km', '25', tempFilters.distance.toString(), () =>
                    setTempFilters({ ...tempFilters, distance: 25 })
                  )}
                  {renderFilterOption('50 km', '50', tempFilters.distance.toString(), () =>
                    setTempFilters({ ...tempFilters, distance: 50 })
                  )}
                  {renderFilterOption('100 km', '100', tempFilters.distance.toString(), () =>
                    setTempFilters({ ...tempFilters, distance: 100 })
                  )}
                </View>
              </View>
            )}

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
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderListFooter = () => {
    if (loading) return null;

    return (
      <View style={styles.listFooter}>
        {loadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingMoreText}>Chargement...</Text>
          </View>
        ) : hasNextPage ? (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreEvents}>
            <Text style={styles.loadMoreButtonText}>Voir plus</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : filteredEvents.length > 0 ? (
          <View style={styles.endOfListContainer}>
            <View style={styles.endOfListLine} />
            <Text style={styles.endOfListText}>Fin des résultats</Text>
            <View style={styles.endOfListLine} />
          </View>
        ) : null}
      </View>
    );
  };

  const renderListView = () => (
    <View style={styles.listViewContainer}>
      <FlatList
        ref={flatListRef}
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListFooterComponent={renderListFooter}
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

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <TouchableOpacity
          style={styles.scrollToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <WebViewMap
        markers={filteredMarkers}
        userLocation={userLocation}
        selectedMarkerId={selectedMarker?.id}
        onMarkerPress={handleMarkerPress}
        initialRegion={region}
        radiusKm={mapRadius}
        showRadius={!!userLocation}
      />

      {/* Radius Slider Panel */}
      <View style={styles.radiusSliderContainer}>
        <View style={styles.radiusSliderHeader}>
          <Ionicons name="radio-button-on" size={18} color={Colors.primary} />
          <Text style={styles.radiusSliderTitle}>Rayon de recherche</Text>
          <Text style={styles.radiusSliderValue}>{mapRadius} km</Text>
        </View>
        <Slider
          style={styles.radiusSlider}
          minimumValue={MIN_RADIUS}
          maximumValue={MAX_RADIUS}
          step={10}
          value={mapRadius}
          onValueChange={(value) => setMapRadius(Math.round(value))}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.gray200}
          thumbTintColor={Colors.primary}
        />
        <View style={styles.radiusSliderLabels}>
          <Text style={styles.radiusSliderLabel}>{MIN_RADIUS} km</Text>
          <Text style={styles.radiusSliderLabel}>{MAX_RADIUS} km</Text>
        </View>
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color={Colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapButton} onPress={fetchMapEvents}>
          <Ionicons name="refresh" size={22} color={Colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Events Count */}
      <View style={styles.countBadge}>
        <Ionicons name="location" size={14} color={Colors.primary} />
        <Text style={styles.countText}>
          {filteredMarkers.length} événement{filteredMarkers.length > 1 ? 's' : ''}
          {mapRadius > 0 && ` dans ${mapRadius} km`}
        </Text>
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
              {userLocation && selectedMarker.lat && selectedMarker.lng && (
                <Text style={styles.selectedCardDistance}>
                  • {Math.round(calculateDistance(userLocation.lat, userLocation.lng, selectedMarker.lat, selectedMarker.lng))} km
                </Text>
              )}
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
            {totalCount > filteredEvents.length && ` sur ${totalCount}`}
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
        <View style={{ flex: 1, padding: 20 }}>
          <SkeletonList count={4} Component={EventCardSkeleton} />
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
  listViewContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 130,
  },
  eventCardContainer: {
    marginBottom: Spacing.md,
  },
  // ===== LIST FOOTER (Pagination) =====
  listFooter: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingMoreText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primaryLight || Colors.gray50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  loadMoreButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  endOfListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  endOfListLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  endOfListText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray400,
  },
  // ===== SCROLL TO TOP BUTTON =====
  scrollToTopButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
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
  radiusSliderContainer: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  radiusSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  radiusSliderTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  radiusSliderValue: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  radiusSlider: {
    width: '100%',
    height: 40,
  },
  radiusSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.xs,
  },
  radiusSliderLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 140,
    gap: Spacing.sm,
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
    bottom: 140,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    ...Shadows.md,
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
  selectedCardDistance: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontFamily: FontFamily.medium,
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
  // ===== PRICE RANGE =====
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  priceInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  priceRangeSeparator: {
    paddingTop: Spacing.lg,
  },
  priceRangeSeparatorText: {
    fontSize: FontSizes.lg,
    color: Colors.gray400,
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
