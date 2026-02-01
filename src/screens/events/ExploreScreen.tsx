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
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
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

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
    >
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item.id && styles.categoryChipTextActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
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
            <Ionicons name="search-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>Aucun événement</Text>
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
            <Text style={styles.selectedCardTitle} numberOfLines={1}>
              {selectedMarker.title}
            </Text>
            <View style={styles.selectedCardMeta}>
              <View style={styles.selectedCardMetaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.gray500} />
                <Text style={styles.selectedCardMetaText}>
                  {selectedMarker.location_city}
                </Text>
              </View>
              <View style={styles.selectedCardMetaItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.gray500} />
                <Text style={styles.selectedCardMetaText}>
                  {formatDate(selectedMarker.start_date)}
                </Text>
              </View>
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorer</Text>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? Colors.primary : Colors.gray500}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons
              name="map-outline"
              size={18}
              color={viewMode === 'map' ? Colors.primary : Colors.gray500}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
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
      </View>

      {/* Categories Filter */}
      {viewMode === 'list' && categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={[{ id: 0, name: 'Tous' } as Category, ...categories]}
            renderItem={({ item }) =>
              item.id === 0 ? (
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
              ) : (
                renderCategory({ item })
              )
            }
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  viewToggleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  viewToggleButtonActive: {
    backgroundColor: Colors.white,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.gray900,
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
    backgroundColor: Colors.gray900,
  },
  categoryChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    fontWeight: FontWeights.medium,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
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
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
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
    width: 44,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: 22,
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
    fontWeight: FontWeights.medium,
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
  selectedCardTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  selectedCardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  selectedCardMetaItem: {
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
