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

import { eventsAPI, categoriesAPI, tagsAPI, recommendationsAPI, getMediaUrl } from '../../api/client';
import { Event, Category, MapMarker, RootStackParamList, MainTabParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import CacheService from '../../services/CacheService';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { Searching as SearchingIllustration } from '../../components/illustrations';
import { SkeletonList, EventCardSkeleton, DiscoverScreenSkeleton } from '../../components/ui/Skeleton';
import { FadeInView, SectionEntrance, PulsingBadge, StaggeredItem } from '../../components/ui/Animations';
import { useNotifications } from '../../contexts/NotificationContext';
import GradientText from '../../components/ui/GradientText';
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
import { useTabletLayout } from '../../hooks/useTabletLayout';
import { EmptyState } from '../../components/ui';
import EventCard from '../../components/events/EventCard';
import CategoryCard from '../../components/events/CategoryCard';
import CategoryIcon from '../../components/icons/CategoryIcons';
import WebViewMap from '../../components/maps/WebViewMap';
import MapEventCard from '../../components/maps/MapEventCard';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');


// Filter types
type EventTypeFilter = 'all' | 'billetterie' | 'inscription';
type PriceFilter = 'all' | 'free' | 'paid';
type DateFilter = 'all' | 'today' | 'weekend' | 'week' | 'month' | 'next_3_months';
type LocationTypeFilter = 'all' | 'in_person' | 'online' | 'hybrid';
type SortOption = 'date' | 'price_asc' | 'price_desc' | 'popularity' | 'distance';
type AttendanceFilter = 'all' | 'small' | 'medium' | 'large' | 'xlarge';
type EventStatusFilter = 'all' | 'upcoming' | 'ongoing' | 'full';

interface Filters {
  eventType: EventTypeFilter;
  price: PriceFilter;
  date: DateFilter;
  locationType: LocationTypeFilter;
  distance: number;
  priceMin: number;
  priceMax: number;
  sortBy: SortOption;
  category: number | null;
  tags: number[];
  attendance: AttendanceFilter;
  eventStatus: EventStatusFilter;
  city: string;
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
  category: null,
  tags: [],
  attendance: 'all',
  eventStatus: 'all',
  city: '',
};

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Discover'>>();
  const { user } = useAuth();
  const { colors, isDark, gradients } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const { isTablet, columns, padding: containerPadding, cardGap } = useTabletLayout();
  const { unreadNotificationCount, unreadMessageCount } = useNotifications();

  // === State: Discovery Feed ===
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { filters, setFilters, resetFilters: resetPersistedFilters, isLoaded: filtersLoaded } = usePersistedFilters<Filters>('@eventez_discover_filters', defaultFilters);
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

  const [allTags, setAllTags] = useState<any[]>([]);
  const [tagSearch, setTagSearch] = useState('');

  // Search transition animations
  const searchProgress = useSharedValue(0); // 0 = discovery, 1 = search active
  const contentOpacity = useSharedValue(1);

  const headerCollapseStyle = useAnimatedStyle(() => ({
    maxHeight: (1 - searchProgress.value) * 200,
    opacity: 1 - searchProgress.value,
    overflow: 'hidden' as const,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Rotating placeholder suggestions
  const placeholderSuggestions = useMemo(() => [
    'Concert à Douala...',
    'Festival ce weekend...',
    'Conférence tech...',
    'Atelier cuisine...',
    'Soirée networking...',
  ], []);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (isSearchActive) return;
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholderSuggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isSearchActive, placeholderSuggestions]);

  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const { history: searchHistory, addQuery: addSearchQuery, removeQuery: removeSearchQuery, clearAll: clearSearchHistory } = useSearchHistory();

  const activeFiltersCount = [
    filters.eventType !== 'all',
    filters.price !== 'all',
    filters.date !== 'all',
    filters.locationType !== 'all',
    filters.distance > 0,
    filters.priceMin > 0,
    filters.priceMax > 0,
    filters.sortBy !== 'date',
    filters.category !== null,
    filters.tags.length > 0,
    filters.attendance !== 'all',
    filters.eventStatus !== 'all',
    filters.city.trim().length > 0,
  ].filter(Boolean).length;

  // === Initial load ===
  useEffect(() => {
    fetchDiscoveryData();
    fetchRecommendations();
    requestLocation();
    fetchTags();
  }, []);

  // Category from navigation params
  useEffect(() => {
    if (route.params?.category) {
      setSelectedCategory(route.params.category);
      setIsSearchActive(true);
    }
  }, [route.params?.category]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search when debounced query or category changes
  useEffect(() => {
    if (isSearchActive && filtersLoaded) {
      setCurrentPage(1);
      fetchSearchResults(1, false);
      if (debouncedQuery.trim().length >= 2) {
        addSearchQuery(debouncedQuery);
      }
    }
  }, [debouncedQuery, selectedCategory, filters.sortBy, filtersLoaded]);


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
      if (__DEV__) console.error('Erreur localisation:', error);
    }
  };

  const DISCOVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const fetchDiscoveryData = async (bypassCache: boolean = false) => {
    try {
      // Serve cached data immediately if available
      if (!bypassCache) {
        const [cachedFeatured, cachedCategories, cachedUpcoming, cachedFree] = await Promise.all([
          CacheService.get<Event[]>('discover:featured'),
          CacheService.get<Category[]>('discover:categories'),
          CacheService.get<Event[]>('discover:upcoming'),
          CacheService.get<Event[]>('discover:free'),
        ]);
        if (cachedFeatured) setFeaturedEvents(cachedFeatured.data);
        if (cachedCategories) setCategories(cachedCategories.data);
        if (cachedUpcoming) setUpcomingEvents(cachedUpcoming.data);
        if (cachedFree) setFreeEvents(cachedFree.data);
      }

      // Fetch fresh data from network
      const [featuredRes, categoriesRes, upcomingRes, freeRes] = await Promise.all([
        eventsAPI.getFeaturedEvents(),
        categoriesAPI.getCategories(),
        eventsAPI.getEvents({ ordering: 'start_date', limit: 15, status: 'validated' }),
        eventsAPI.getEvents({ price: 'free', ordering: 'start_date', limit: 10, status: 'validated' }),
      ]);

      const featuredData = getApiResults<Event>(featuredRes).filter(e => isEventInFuture(e.start_date));
      const categoriesData = getApiResults<Category>(categoriesRes);
      const upcomingData = getApiResults<Event>(upcomingRes).filter(e => isEventInFuture(e.start_date));
      const freeData = getApiResults<Event>(freeRes).filter(e => isEventInFuture(e.start_date));

      setFeaturedEvents(featuredData);
      setCategories(categoriesData);
      setUpcomingEvents(upcomingData);
      setFreeEvents(freeData);

      // Update cache
      CacheService.set('discover:featured', featuredData, DISCOVER_CACHE_TTL);
      CacheService.set('discover:categories', categoriesData, DISCOVER_CACHE_TTL);
      CacheService.set('discover:upcoming', upcomingData, DISCOVER_CACHE_TTL);
      CacheService.set('discover:free', freeData, DISCOVER_CACHE_TTL);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchRecommendations = async (bypassCache: boolean = false) => {
    if (!user) return;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<Event[]>('discover:recommendations');
        if (cached) setRecommendations(cached.data);
      }
      const response = await recommendationsAPI.getRecommendations({ limit: 10 });
      const data = getApiResults<Event>(response).filter(e => isEventInFuture(e.start_date));
      setRecommendations(data);
      CacheService.set('discover:recommendations', data, DISCOVER_CACHE_TTL);
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
      if (__DEV__) console.error('Erreur événements proches:', error);
    }
  };

  const fetchTags = async (bypassCache: boolean = false) => {
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<any[]>('discover:tags');
        if (cached) setAllTags(cached.data);
      }
      const response = await tagsAPI.getTags();
      const data = response.data?.results || response.data || [];
      setAllTags(data);
      CacheService.set('discover:tags', data, DISCOVER_CACHE_TTL);
    } catch (error) {
      if (__DEV__) console.error('Error fetching tags:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDiscoveryData(true), fetchRecommendations(true), location && fetchNearbyEvents()]);
    setRefreshing(false);
  };

  // === Data fetching: Search ===

  const fetchSearchResults = async (page: number = 1, append: boolean = false) => {
    if (page === 1 && searchResults.length === 0) setSearchLoading(true);
    else if (page > 1) setLoadingMore(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE, status: 'validated' };
      if (debouncedQuery) params.search = debouncedQuery;
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
      if (__DEV__) console.error('Erreur recherche:', error);
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
      if (__DEV__) console.error('Erreur événements carte:', error);
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

  // === Filter logic (computed synchronously) ===

  const filteredResults = useMemo(() => {
    if (!isSearchActive) return [];
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
          case 'next_3_months': {
            const end = new Date(todayDate);
            end.setMonth(todayDate.getMonth() + 3);
            return eventDay >= todayDate && eventDay <= end;
          }
          default: return true;
        }
      });
    }

    // Category filter
    if (filters.category !== null) {
      result = result.filter(e => {
        const catId = typeof e.category === 'object' ? (e.category as any)?.id : e.category;
        return catId === filters.category;
      });
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter(e => {
        const eventTags = (e.tags || []).map((t: any) => typeof t === 'number' ? t : t.id);
        return filters.tags.some(tagId => eventTags.includes(tagId));
      });
    }

    // Attendance filter
    if (filters.attendance !== 'all') {
      result = result.filter(e => {
        const capacity = (e as any).max_attendees || (e as any).capacity || 0;
        switch (filters.attendance) {
          case 'small': return capacity > 0 && capacity < 50;
          case 'medium': return capacity >= 50 && capacity <= 200;
          case 'large': return capacity > 200 && capacity <= 1000;
          case 'xlarge': return capacity > 1000;
          default: return true;
        }
      });
    }

    // Event status filter
    if (filters.eventStatus !== 'all') {
      const now = new Date();
      result = result.filter(e => {
        switch (filters.eventStatus) {
          case 'upcoming': return new Date(e.start_date) > now;
          case 'ongoing': return new Date(e.start_date) <= now && new Date(e.end_date) >= now;
          case 'full': return (e as any).is_full || ((e as any).max_attendees && (e.registration_count || 0) >= (e as any).max_attendees);
          default: return true;
        }
      });
    }

    // City filter
    if (filters.city.trim()) {
      const cityQuery = filters.city.toLowerCase().trim();
      result = result.filter(e => (e as any).location_city?.toLowerCase().includes(cityQuery));
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

    return result;
  }, [searchResults, filters, location, isSearchActive, calculateDistance]);

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
    // Animate: collapse header, fade in search content
    searchProgress.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    contentOpacity.value = 0;
    contentOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    setTimeout(() => searchInputRef.current?.focus(), 200);
  };

  const deactivateSearch = () => {
    // Animate: expand header back, fade in discovery content
    searchProgress.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    contentOpacity.value = 0;
    contentOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    setIsSearchActive(false);
    setSearchQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
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
    resetPersistedFilters();
    setShowFilters(false);
  };

  const navigateToEvent = (eventId: string, imageUrl?: string) => {
    navigation.navigate('EventDetails', { eventId, imageUrl });
  };

  // === Render helpers ===

  const renderEventCard = useCallback((item: Event, variant: 'default' | 'featured' | 'horizontal' | 'grid' = 'default') => {
    const range = getEventPriceRange(item);
    const eventImageUrl = getMediaUrl(item.banner_image || item.category?.default_event_image || item.display_image) || undefined;
    return (
      <EventCard
        id={item.id}
        title={item.title}
        date={item.start_date}
        time={item.start_time}
        location={item.location_city || item.location_address || 'Lieu à confirmer'}
        imageUrl={eventImageUrl}
        category={item.category?.name}
        price={range?.min}
        priceMax={range?.max}
        isFree={item.is_free || (range?.min === 0 && range?.max === 0)}
        isFeatured={item.is_featured}
        locationType={item.location_type}
        eventType={item.event_type}
        currency={item.currency || platformCurrency || undefined}
        attendees={item.registration_count || item.registrations_count}
        variant={variant}
        onPress={() => navigateToEvent(item.id, eventImageUrl)}
      />
    );
  }, [navigation]);

  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccentLine, { backgroundColor: colors.accent }]} />
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={TOUCH_OPACITY}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // === SEARCH MODE ===

  const renderSearchHeader = () => (
    <View style={[styles.searchHeader, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={deactivateSearch} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.gray800} />
      </TouchableOpacity>
      <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={18} color={colors.gray400} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: colors.gray900 }]}
          placeholder="Rechercher des événements"
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
      <TouchableOpacity
        style={[styles.iconButton, { backgroundColor: colors.gray100 }, activeFiltersCount > 0 && { backgroundColor: colors.primary }]}
        onPress={openFilters}
      >
        <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? colors.white : colors.gray700} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.iconButton, { backgroundColor: colors.gray100 }]}
        onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
      >
        <Ionicons name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={20} color={colors.gray700} />
      </TouchableOpacity>
    </View>
  );

  const renderCategoryChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={styles.chipsList}
    >
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: colors.gray100 }, !selectedCategory && { backgroundColor: colors.primary }]}
        onPress={() => setSelectedCategory(null)}
        activeOpacity={0.7}
      >
        <CategoryIcon name="sparkles" size={14} color={!selectedCategory ? colors.white : colors.gray600} strokeWidth={2} />
        <Text style={[styles.chipText, { color: colors.gray600 }, !selectedCategory && { color: colors.white }]}>Tous</Text>
      </TouchableOpacity>
      {categories.map(cat => {
        const isActive = selectedCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, { backgroundColor: colors.gray100 }, isActive && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedCategory(isActive ? null : cat.id)}
            activeOpacity={0.7}
          >
            <CategoryIcon name={cat.name} size={14} color={isActive ? colors.white : colors.gray600} strokeWidth={2} />
            <Text style={[styles.chipText, { color: colors.gray600 }, isActive && { color: colors.white }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
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
            isDark={isDark}
          />
          {/* Radius slider */}
          <View style={[styles.radiusPanel, { backgroundColor: colors.card }]}>
            <View style={styles.radiusHeader}>
              <Text style={[styles.radiusLabel, { color: colors.gray700 }]}>Rayon</Text>
              <Text style={[styles.radiusValue, { color: colors.primary }]}>{mapRadius} km</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 32 }}
              minimumValue={5}
              maximumValue={5000}
              step={10}
              value={mapRadius}
              onValueChange={v => setMapRadius(Math.round(v))}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.gray200}
              thumbTintColor={colors.primary}
            />
          </View>
          {selectedMarker && (
            <MapEventCard
              marker={selectedMarker}
              userLocation={location}
              onPress={() => navigateToEvent(selectedMarker.id, selectedMarker.banner_image || undefined)}
              calculateDistance={calculateDistance}
              bottomOffset={120}
            />
          )}
        </View>
      );
    }

    return (
      <FlatList
        ref={flatListRef}
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: cardGap } : undefined}
        data={filteredResults}
        renderItem={({ item, index }) => (
          <StaggeredItem index={index} staggerDelay={50}>
            <View style={[styles.searchResultItem, columns > 1 && { flex: 1 }]}>{renderEventCard(item, 'grid')}</View>
          </StaggeredItem>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.searchResultsList, { paddingHorizontal: containerPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {renderSearchHistory()}
            {!searchLoading && (
              <View style={styles.resultsInfo}>
                <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                  {filteredResults.length} événement{filteredResults.length !== 1 ? 's' : ''}
                </Text>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity onPress={resetFilters}>
                    <Text style={[styles.clearFilters, { color: colors.primary }]}>Effacer filtres</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !searchLoading ? (
            <View style={styles.emptySearch}>
              <SearchingIllustration color={colors.primary} size={150} />
              <Text style={[styles.emptyTitle, { color: colors.gray700 }]}>Aucun événement trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Essayez de modifier vos critères</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: Spacing.lg }} />
          ) : hasNextPage ? (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: colors.primary }]}
              onPress={() => fetchSearchResults(currentPage + 1, true)}
            >
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>Voir plus</Text>
            </TouchableOpacity>
          ) : null
        }
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        initialNumToRender={8}
      />
    );
  };

  const HISTORY_DISPLAY_LIMIT = 5;

  const renderSearchHistory = () => {
    if (searchQuery !== '' || searchHistory.length === 0 || viewMode !== 'list') return null;
    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: colors.gray700 }]}>Recherches récentes</Text>
          <TouchableOpacity onPress={clearSearchHistory}>
            <Text style={[styles.historyClear, { color: colors.primary }]}>Tout effacer</Text>
          </TouchableOpacity>
        </View>
        {searchHistory.slice(0, HISTORY_DISPLAY_LIMIT).map((query, index) => (
          <TouchableOpacity
            key={`${query}-${index}`}
            style={styles.historyItem}
            onPress={() => setSearchQuery(query)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={colors.gray400} />
            <Text style={[styles.historyText, { color: colors.gray800 }]} numberOfLines={1}>{query}</Text>
            <TouchableOpacity
              onPress={() => removeSearchQuery(query)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color={colors.gray400} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // === FILTERS MODAL ===

  const renderFilterOption = (label: string, value: string, current: string, onPress: () => void) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { borderColor: colors.gray200, backgroundColor: colors.card },
        current === value && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterChipText,
        { color: colors.gray700 },
        current === value && { color: colors.white },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFiltersModal = () => (
    <Modal visible={showFilters} animationType="fade" transparent onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Primary Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowFilters(false)}
              >
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="options" size={24} color={Colors.white} />
              </View>
              <View style={styles.modalHeaderTextContainer}>
                <Text style={styles.modalHeaderTitle}>Filtres avances</Text>
                <Text style={styles.modalHeaderSubtitle}>Affinez votre recherche</Text>
              </View>
            </View>
            {activeFiltersCount > 0 && (
              <View style={styles.modalHeaderBadge}>
                <Text style={styles.modalHeaderBadgeText}>
                  {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Sort */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Trier par</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Date', 'date', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'date' }))}
                {renderFilterOption('Popularité', 'popularity', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'popularity' }))}
                {renderFilterOption('Prix ↑', 'price_asc', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'price_asc' }))}
                {renderFilterOption('Prix ↓', 'price_desc', tempFilters.sortBy, () => setTempFilters({ ...tempFilters, sortBy: 'price_desc' }))}
              </View>
            </View>
            {/* Event Type */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Type</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.eventType, () => setTempFilters({ ...tempFilters, eventType: 'all' }))}
                {renderFilterOption('Billetterie', 'billetterie', tempFilters.eventType, () => setTempFilters({ ...tempFilters, eventType: 'billetterie' }))}
                {renderFilterOption('Inscription', 'inscription', tempFilters.eventType, () => setTempFilters({ ...tempFilters, eventType: 'inscription' }))}
              </View>
            </View>
            {/* Price */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Prix</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.price, () => setTempFilters({ ...tempFilters, price: 'all' }))}
                {renderFilterOption('Gratuit', 'free', tempFilters.price, () => setTempFilters({ ...tempFilters, price: 'free' }))}
                {renderFilterOption('Payant', 'paid', tempFilters.price, () => setTempFilters({ ...tempFilters, price: 'paid' }))}
              </View>
            </View>
            {/* Price Range */}
            {tempFilters.price === 'paid' && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Fourchette de prix</Text>
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
                    <Text style={[styles.priceInputLabel, { color: colors.gray500 }]}>Min ({platformCurrency})</Text>
                    <TextInput
                      style={[styles.priceInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                      value={tempFilters.priceMin > 0 ? String(tempFilters.priceMin) : ''}
                      onChangeText={(v) => setTempFilters({ ...tempFilters, priceMin: parseInt(v) || 0 })}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                  <Text style={[styles.priceInputSeparator, { color: colors.gray400 }]}>-</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={[styles.priceInputLabel, { color: colors.gray500 }]}>Max ({platformCurrency})</Text>
                    <TextInput
                      style={[styles.priceInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                      value={tempFilters.priceMax > 0 ? String(tempFilters.priceMax) : ''}
                      onChangeText={(v) => setTempFilters({ ...tempFilters, priceMax: parseInt(v) || 0 })}
                      keyboardType="numeric"
                      placeholder="Illimité"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>
              </View>
            )}
            {/* Date */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Date</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'all' }))}
                {renderFilterOption("Aujourd'hui", 'today', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'today' }))}
                {renderFilterOption('Ce weekend', 'weekend', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'weekend' }))}
                {renderFilterOption('Cette semaine', 'week', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'week' }))}
                {renderFilterOption('Ce mois', 'month', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'month' }))}
                {renderFilterOption('3 prochains mois', 'next_3_months', tempFilters.date, () => setTempFilters({ ...tempFilters, date: 'next_3_months' }))}
              </View>
            </View>
            {/* Distance */}
            {location && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Distance</Text>
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
            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Categorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterRow}>
                  {renderFilterOption('Toutes', 'all' as any, tempFilters.category === null ? 'all' as any : '' as any, () => setTempFilters({ ...tempFilters, category: null }))}
                  {categories.map((cat: any) => (
                    renderFilterOption(cat.name, String(cat.id), tempFilters.category === cat.id ? String(cat.id) : '', () => setTempFilters({ ...tempFilters, category: tempFilters.category === cat.id ? null : cat.id }))
                  ))}
                </View>
              </ScrollView>
            </View>
            {/* Tags */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Tags</Text>
              <TextInput
                style={[styles.cityInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                placeholder="Rechercher un tag..."
                placeholderTextColor={colors.gray400}
                value={tagSearch}
                onChangeText={setTagSearch}
              />
              <View style={[styles.filterRow, { marginTop: Spacing.sm }]}>
                {allTags
                  .filter(t => !tagSearch || t.name?.toLowerCase().includes(tagSearch.toLowerCase()))
                  .slice(0, 15)
                  .map((tag: any) => {
                    const isSelected = tempFilters.tags.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.filterChip,
                          { borderColor: colors.gray200, backgroundColor: colors.card },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          const newTags = isSelected
                            ? tempFilters.tags.filter(id => id !== tag.id)
                            : [...tempFilters.tags, tag.id];
                          setTempFilters({ ...tempFilters, tags: newTags });
                        }}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: colors.gray700 },
                          isSelected && { color: colors.white },
                        ]}>
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
            {/* Taille */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Taille de l'evenement</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.attendance, () => setTempFilters({ ...tempFilters, attendance: 'all' }))}
                {renderFilterOption('Petit (<50)', 'small', tempFilters.attendance, () => setTempFilters({ ...tempFilters, attendance: 'small' }))}
                {renderFilterOption('Moyen (50-200)', 'medium', tempFilters.attendance, () => setTempFilters({ ...tempFilters, attendance: 'medium' }))}
                {renderFilterOption('Grand (200-1k)', 'large', tempFilters.attendance, () => setTempFilters({ ...tempFilters, attendance: 'large' }))}
                {renderFilterOption('Tres grand (1k+)', 'xlarge', tempFilters.attendance, () => setTempFilters({ ...tempFilters, attendance: 'xlarge' }))}
              </View>
            </View>
            {/* Statut */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Statut</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.eventStatus, () => setTempFilters({ ...tempFilters, eventStatus: 'all' }))}
                {renderFilterOption('A venir', 'upcoming', tempFilters.eventStatus, () => setTempFilters({ ...tempFilters, eventStatus: 'upcoming' }))}
                {renderFilterOption('En cours', 'ongoing', tempFilters.eventStatus, () => setTempFilters({ ...tempFilters, eventStatus: 'ongoing' }))}
                {renderFilterOption('Complet', 'full', tempFilters.eventStatus, () => setTempFilters({ ...tempFilters, eventStatus: 'full' }))}
              </View>
            </View>
            {/* Ville */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Ville</Text>
              <TextInput
                style={[styles.cityInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                placeholder="Ex: Douala, Yaounde..."
                placeholderTextColor={colors.gray400}
                value={tempFilters.city}
                onChangeText={(v) => setTempFilters({ ...tempFilters, city: v })}
              />
            </View>
            {/* Location Type */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>Lieu</Text>
              <View style={styles.filterRow}>
                {renderFilterOption('Tous', 'all', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'all' }))}
                {renderFilterOption('Présentiel', 'in_person', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'in_person' }))}
                {renderFilterOption('En ligne', 'online', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'online' }))}
                {renderFilterOption('Hybride', 'hybrid', tempFilters.locationType, () => setTempFilters({ ...tempFilters, locationType: 'hybrid' }))}
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.gray100 }]}>
            <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]} onPress={resetFilters}>
              <Ionicons name="refresh" size={16} color={colors.gray600} />
              <Text style={[styles.resetBtnText, { color: colors.gray700 }]}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={applyFilterChanges}>
              <Ionicons name="checkmark" size={18} color={Colors.white} />
              <Text style={styles.applyBtnText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // === DISCOVERY FEED CONTENT (without header/search bar, those are in main render) ===

  const renderDiscoveryFeedContent = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      contentContainerStyle={styles.scrollContent}
    >
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
              style={[styles.discoverChip, { backgroundColor: colors.surface }]}
              onPress={() => {
                setSelectedCategory(cat.id);
                activateSearch();
              }}
            >
              <CategoryIcon name={cat.name} size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.discoverChipText, { color: colors.gray700 }]}>{cat.name}</Text>
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
      {user && recommendations.length > 0 && (
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
      {!user && (
        <SectionEntrance delay={500}>
          <View style={[styles.section, { paddingHorizontal: Spacing.lg }]}>
            <TouchableOpacity
              style={[styles.loginCta, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={TOUCH_OPACITY}
            >
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={[styles.loginCtaTitle, { color: colors.gray900 }]}>Recommandations personnalisées</Text>
                <Text style={[styles.loginCtaSubtitle, { color: colors.gray500 }]}>Connectez-vous pour découvrir des événements adaptés à vos goûts</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </SectionEntrance>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <SectionEntrance delay={600}>
          <View style={styles.section}>
            <SectionHeader title="À venir" onSeeAll={activateSearch} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {initialLoading && !isSearchActive ? (
        <DiscoverScreenSkeleton />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Collapsible header (location + greeting) — animates up when search activates */}
          <Animated.View style={headerCollapseStyle}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="location" size={18} color={colors.accent} />
                <Text style={[styles.headerLocation, { color: colors.gray900 }]}>
                  {location ? 'Douala' : 'Douala, Cameroun'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.gray400} />
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.navigate('Messages')}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.gray800} />
                  {unreadMessageCount > 0 && (
                    <PulsingBadge active={unreadMessageCount > 0} style={styles.badgeWrapper}>
                      <View style={[styles.badge, { backgroundColor: colors.error }]}>
                        <Text style={styles.badgeText}>{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</Text>
                      </View>
                    </PulsingBadge>
                  )}
                </TouchableOpacity>
                {user?.role === 'organizer' && (
                  <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.navigate('EventCreate' as any)}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={22} color={colors.gray800} />
                  {unreadNotificationCount > 0 && (
                    <PulsingBadge active={unreadNotificationCount > 0} style={styles.badgeWrapper}>
                      <View style={[styles.badge, { backgroundColor: colors.error }]}>
                        <Text style={styles.badgeText}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text>
                      </View>
                    </PulsingBadge>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroSection}>
              <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
                {user?.first_name ? `Bonjour ${user.first_name}` : 'Bienvenue'}
              </Text>
              <GradientText style={styles.heroTitle}>Discover Events</GradientText>
            </View>
          </Animated.View>

          {/* Search bar — transforms in-place */}
          {isSearchActive ? (
            renderSearchHeader()
          ) : (
            <TouchableOpacity
              style={[
                styles.searchBarTrigger,
                { backgroundColor: colors.surface, borderColor: colors.gray200 },
              ]}
              onPress={activateSearch}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={20} color={colors.primary} />
              <Text style={[styles.searchPlaceholder, { color: colors.gray400 }]}>
                {placeholderSuggestions[placeholderIndex]}
              </Text>
            </TouchableOpacity>
          )}

          {/* Content — fades between discovery feed and search results */}
          <Animated.View style={[{ flex: 1 }, contentAnimStyle]}>
            {isSearchActive ? (
              <View style={{ flex: 1 }}>
                {viewMode === 'list' && renderCategoryChips()}
                {searchLoading && searchResults.length === 0 && viewMode === 'list' ? (
                  <View style={{ flex: 1, paddingHorizontal: containerPadding, paddingTop: Spacing.sm }}>
                    <SkeletonList count={4} Component={EventCardSkeleton} />
                  </View>
                ) : (
                  renderSearchContent()
                )}
              </View>
            ) : (
              renderDiscoveryFeedContent()
            )}
          </Animated.View>
        </View>
      )}

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
    ...TextStyles.bodyBold,
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
    ...TextStyles.eyebrow,
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    ...TextStyles.heroSm,
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
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  searchPlaceholder: {
    ...TextStyles.body,
    flex: 1,
    color: Colors.gray400,
  },

  // === DISCOVER CHIPS ===
  discoverChips: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 0,
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
    ...TextStyles.label,
  },

  // === SECTIONS ===
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionAccentLine: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  sectionTitle: {
    ...TextStyles.h2,
    fontFamily: FontFamily.displayExtraBold,
  },
  seeAllText: {
    ...TextStyles.smallBold,
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

  // === LOGIN CTA ===
  loginCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  loginCtaTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    marginBottom: 2,
  },
  loginCtaSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
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
    ...TextStyles.body,
    flex: 1,
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
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
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
    paddingBottom: 80,
  },
  searchResultItem: {
    marginBottom: Spacing.sm,
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  resultsCount: {
    ...TextStyles.label,
    color: Colors.textSecondary,
  },
  clearFilters: {
    ...TextStyles.label,
    color: Colors.primary,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchPrompt: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  searchPromptText: {
    ...TextStyles.body,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  emptySearch: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  emptyTitle: {
    ...TextStyles.h4,
    color: Colors.gray700,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    ...TextStyles.small,
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
    ...TextStyles.button,
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
    ...TextStyles.label,
  },
  radiusValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
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
    maxHeight: '80%',
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTextContainer: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  modalHeaderSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  modalHeaderBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    marginLeft: 44 + Spacing.md + 36 + Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  modalHeaderBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterSectionTitle: {
    ...TextStyles.bodyBold,
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
    ...TextStyles.label,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  cityInput: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  resetBtnText: {
    ...TextStyles.button,
    color: Colors.gray700,
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  applyBtnText: {
    ...TextStyles.button,
  },

  // === SEARCH HISTORY ===
  historyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  historyClear: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  historyText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
  },
});
