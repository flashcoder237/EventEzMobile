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

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, selectedCategory]);

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

  const renderEvent = useCallback(
    ({ item }: { item: Event }) => (
      <View style={styles.eventCardContainer}>
        <EventCard
          id={item.id}
          title={item.title}
          date={item.start_date}
          time={item.start_time}
          location={item.location_city || item.location_address || 'Lieu à confirmer'}
          imageUrl={item.banner_image || item.display_image}
          category={item.category?.name}
          price={item.is_free ? 0 : (item.base_price || item.min_price)}
          isFree={item.is_free}
          attendees={item.registration_count || item.registrations_count}
          variant="horizontal"
          onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
        />
      </View>
    ),
    [navigation]
  );

  const renderListView = () => (
    <FlatList
      data={events}
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
          style={styles.filterButton}
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
            {events.length} événement{events.length !== 1 ? 's' : ''}
          </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    paddingVertical: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  resultsCount: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontFamily: FontFamily.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  eventCardContainer: {
    marginBottom: Spacing.md,
  },
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
    ...Shadows.md,
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
    ...Shadows.sm,
  },
  countText: {
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    fontSize: FontSizes.sm,
  },
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
    ...Shadows.lg,
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
});
