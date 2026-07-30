import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { eventsAPI, categoriesAPI } from '../../api';
import { MapMarker, RootStackParamList, Category } from '../../types';
import WebViewMap from '../../components/maps/WebViewMap';
import MapEventCard from '../../components/maps/MapEventCard';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Map'>;

type EventTypeFilter = 'all' | 'billetterie' | 'inscription';
type PriceFilter = 'all' | 'free' | 'paid';
type DateFilter = 'all' | 'today' | 'weekend' | 'week' | 'month';

interface Filters {
  eventType: EventTypeFilter;
  price: PriceFilter;
  date: DateFilter;
  category: number | null;
}

const RADIUS_OPTIONS = [10, 25, 50, 100, 200, 500];
const DEFAULT_RADIUS = 100;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [allMarkers, setAllMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const mapDefaultFilters: Filters = {
    eventType: 'all',
    price: 'all',
    date: 'all',
    category: null,
  };
  const { filters, setFilters, resetFilters: resetPersistedFilters, isLoaded: filtersLoaded } = usePersistedFilters<Filters>('@eventez_map_filters', mapDefaultFilters);
  const [tempFilters, setTempFilters] = useState<Filters>(filters);

  const [region, setRegion] = useState({
    latitude: 3.848,
    longitude: 11.502,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  useEffect(() => {
    requestLocationAndFetch();
    fetchCategories();
  }, []);

  // Calcul de distance Haversine
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filtrer les marqueurs
  const filteredMarkers = useMemo(() => {
    let result = [...allMarkers];

    // Filtrer par rayon
    if (userLocation && radius > 0) {
      result = result.filter(marker => {
        if (!marker.lat || !marker.lng) return false;
        const dist = calculateDistance(userLocation.lat, userLocation.lng, marker.lat, marker.lng);
        return dist <= radius;
      });
    }

    // Filtrer par catégorie
    if (filters.category) {
      result = result.filter(marker => (marker as any).category === filters.category);
    }

    // Filtrer par date
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
  }, [allMarkers, userLocation, radius, filters]);

  const activeFiltersCount = useMemo(() => {
    return [
      filters.eventType !== 'all',
      filters.price !== 'all',
      filters.date !== 'all',
      filters.category !== null,
    ].filter(Boolean).length;
  }, [filters]);

  const requestLocationAndFetch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
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
    fetchMapEvents();
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data?.results || response.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement catégories:', error);
    }
  };

  const fetchMapEvents = async () => {
    setLoading(true);
    try {
      const response = await eventsAPI.getMapEvents();
      setAllMarkers(response.data.markers || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
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
      if (__DEV__) console.error('Erreur localisation:', error);
    }
  };

  const handleMarkerPress = (marker: MapMarker) => {
    setSelectedMarker(marker);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempFilters(mapDefaultFilters);
  };

  const FilterButton = ({
    label,
    isActive,
    onPress,
  }: {
    label: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { backgroundColor: colors.gray100, borderColor: colors.gray200 },
        isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        { color: colors.gray700 },
        isActive && styles.filterButtonTextActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map */}
      <WebViewMap
        markers={filteredMarkers}
        userLocation={userLocation}
        selectedMarkerId={selectedMarker?.id}
        onMarkerPress={handleMarkerPress}
        initialRegion={region}
        radiusKm={radius}
        showRadius={!!userLocation}
        isDark={isDark}
      />

      {/* Top Bar - Back + Filters */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          {/* Radius Selector */}
          <TouchableOpacity
            style={[styles.radiusButton, { backgroundColor: colors.card }]}
            onPress={() => setShowRadiusSelector(true)}
          >
            <Ionicons name="radio-button-on" size={18} color={colors.primary} />
            <Text style={[styles.radiusButtonText, { color: colors.gray700 }]}>{t('map.radiusUnit', { value: radius })}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.gray500} />
          </TouchableOpacity>

          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.filterIconButton, { backgroundColor: colors.card }]}
            onPress={() => {
              setTempFilters(filters);
              setShowFilters(true);
            }}
          >
            <Ionicons name="options-outline" size={22} color={colors.gray700} />
            {activeFiltersCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={[styles.mapButton, { backgroundColor: colors.card }]} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mapButton, { backgroundColor: colors.card }]} onPress={fetchMapEvents}>
          <Ionicons name="refresh" size={24} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <LoadingSpinner />
      )}

      {/* Events Count */}
      <View style={[styles.countBadge, { backgroundColor: colors.card }]}>
        <Ionicons name="location" size={14} color={colors.primary} />
        <Text style={[styles.countText, { color: colors.gray700 }]}>
          {t('map.eventsCount', { count: filteredMarkers.length })}
          {radius > 0 && t('map.eventsInRadius', { radius })}
        </Text>
      </View>

      {/* État vide : carte sans aucun marqueur (aucun événement à proximité, ou
          aucun événement du tout). Overlay non-bloquant, centré. */}
      {!loading && filteredMarkers.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="box-none">
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="map-outline" size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeFiltersCount > 0
                ? t('map.emptyFilteredTitle', { defaultValue: 'Aucun événement ici' })
                : t('map.emptyTitle', { defaultValue: 'Aucun événement à proximité' })}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.gray500 }]}>
              {activeFiltersCount > 0
                ? t('map.emptyFilteredDesc', { defaultValue: 'Essayez d\'élargir le rayon ou de modifier vos filtres.' })
                : t('map.emptyDesc', { defaultValue: 'Élargissez le rayon de recherche ou revenez bientôt.' })}
            </Text>
          </View>
        </View>
      )}

      {/* Selected Event Card */}
      {selectedMarker && (
        <MapEventCard
          marker={selectedMarker}
          userLocation={userLocation}
          onPress={() => navigation.navigate('EventDetails', { eventId: selectedMarker.slug || selectedMarker.id })}
          calculateDistance={calculateDistance}
        />
      )}

      {/* Radius Selector Modal */}
      <Modal
        visible={showRadiusSelector}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRadiusSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRadiusSelector(false)}
        >
          <View style={[styles.radiusSelectorModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.radiusSelectorTitle, { color: colors.gray900 }]}>{t('map.radiusTitle')}</Text>
            <View style={styles.radiusOptions}>
              {RADIUS_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusOption,
                    { backgroundColor: colors.gray100 },
                    radius === r && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    setRadius(r);
                    setShowRadiusSelector(false);
                  }}
                >
                  <Text
                    style={[
                      styles.radiusOptionText,
                      { color: colors.gray700 },
                      radius === r && styles.radiusOptionTextActive,
                    ]}
                  >
                    {t('map.radiusUnit', { value: r })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={[styles.filtersModal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.filtersHeader, { borderBottomColor: colors.gray100 }]}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.gray700} />
            </TouchableOpacity>
            <Text style={[styles.filtersTitle, { color: colors.gray900 }]}>{t('map.filtersTitle')}</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={[styles.resetText, { color: colors.primary }]}>{t('map.reset')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Type d'événement */}
            <View style={[styles.filterSection, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>{t('map.eventTypeLabel')}</Text>
              <View style={styles.filterOptions}>
                <FilterButton
                  label={t('map.eventTypeAll')}
                  isActive={tempFilters.eventType === 'all'}
                  onPress={() => setTempFilters({ ...tempFilters, eventType: 'all' })}
                />
                <FilterButton
                  label={t('map.eventTypeBilletterie')}
                  isActive={tempFilters.eventType === 'billetterie'}
                  onPress={() => setTempFilters({ ...tempFilters, eventType: 'billetterie' })}
                />
                <FilterButton
                  label={t('map.eventTypeInscription')}
                  isActive={tempFilters.eventType === 'inscription'}
                  onPress={() => setTempFilters({ ...tempFilters, eventType: 'inscription' })}
                />
              </View>
            </View>

            {/* Prix */}
            <View style={[styles.filterSection, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>{t('map.priceLabel')}</Text>
              <View style={styles.filterOptions}>
                <FilterButton
                  label={t('map.priceAll')}
                  isActive={tempFilters.price === 'all'}
                  onPress={() => setTempFilters({ ...tempFilters, price: 'all' })}
                />
                <FilterButton
                  label={t('map.priceFree')}
                  isActive={tempFilters.price === 'free'}
                  onPress={() => setTempFilters({ ...tempFilters, price: 'free' })}
                />
                <FilterButton
                  label={t('map.pricePaid')}
                  isActive={tempFilters.price === 'paid'}
                  onPress={() => setTempFilters({ ...tempFilters, price: 'paid' })}
                />
              </View>
            </View>

            {/* Date */}
            <View style={[styles.filterSection, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>{t('map.dateLabel')}</Text>
              <View style={styles.filterOptions}>
                <FilterButton
                  label={t('map.dateAll')}
                  isActive={tempFilters.date === 'all'}
                  onPress={() => setTempFilters({ ...tempFilters, date: 'all' })}
                />
                <FilterButton
                  label={t('map.dateToday')}
                  isActive={tempFilters.date === 'today'}
                  onPress={() => setTempFilters({ ...tempFilters, date: 'today' })}
                />
                <FilterButton
                  label={t('map.dateWeekend')}
                  isActive={tempFilters.date === 'weekend'}
                  onPress={() => setTempFilters({ ...tempFilters, date: 'weekend' })}
                />
                <FilterButton
                  label={t('map.dateWeek')}
                  isActive={tempFilters.date === 'week'}
                  onPress={() => setTempFilters({ ...tempFilters, date: 'week' })}
                />
                <FilterButton
                  label={t('map.dateMonth')}
                  isActive={tempFilters.date === 'month'}
                  onPress={() => setTempFilters({ ...tempFilters, date: 'month' })}
                />
              </View>
            </View>

            {/* Catégories */}
            {categories.length > 0 && (
              <View style={[styles.filterSection, { borderBottomColor: colors.gray100 }]}>
                <Text style={[styles.filterSectionTitle, { color: colors.gray900 }]}>{t('map.categoryLabel')}</Text>
                <View style={styles.filterOptions}>
                  <FilterButton
                    label={t('map.categoryAll')}
                    isActive={tempFilters.category === null}
                    onPress={() => setTempFilters({ ...tempFilters, category: null })}
                  />
                  {categories.map((cat) => (
                    <FilterButton
                      key={cat.id}
                      label={cat.name}
                      isActive={tempFilters.category === cat.id}
                      onPress={() => setTempFilters({ ...tempFilters, category: cat.id })}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Apply Button */}
          <View style={[styles.filtersFooter, { borderTopColor: colors.gray100 }]}>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>
                {t('map.applyFilters')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    maxWidth: 320,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  emptyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    ...Shadows.md,
  },
  radiusButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  filterIconButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.md,
    top: 120,
    gap: Spacing.sm,
  },
  mapButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    position: 'absolute',
    bottom: 100,
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
  // Radius Selector Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusSelectorModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    // Plafonnée : la modale (centrée par l'overlay) ne s'étire pas sur iPad.
    width: Math.min(SCREEN_WIDTH, 480) - Spacing.xl * 2,
  },
  radiusSelectorTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  radiusOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    minWidth: 80,
    alignItems: 'center',
  },
  radiusOptionActive: {
    backgroundColor: Colors.primary,
  },
  radiusOptionText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  radiusOptionTextActive: {
    color: Colors.white,
  },

  // Filters Modal
  filtersModal: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  filtersTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  resetText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  filtersContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  filterSection: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  filterSectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  filtersFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
