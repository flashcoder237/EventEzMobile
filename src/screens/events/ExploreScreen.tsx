import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { eventsAPI } from '../../api/client';
import { MapMarker, RootStackParamList } from '../../types';
import WebViewMap from '../../components/maps/WebViewMap';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
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
  }, []);

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

  const fetchMapEvents = async () => {
    setLoading(true);
    try {
      const response = await eventsAPI.getMapEvents();
      setMarkers(response.data.markers || []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lieu ou événement..."
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

      {/* Map */}
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
            <Ionicons name="locate" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {/* Events Count */}
        <View style={styles.countBadge}>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            style={styles.countBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="location" size={16} color={Colors.white} />
            <Text style={styles.countText}>{markers.length} événements</Text>
          </LinearGradient>
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
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.selectedCardButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chevron-forward" size={20} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  searchContainer: {
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  mapContainer: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.base,
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
    top: Spacing.base,
    left: Spacing.base,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.md,
  },
  countBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  countText: {
    fontWeight: '600',
    color: Colors.white,
    fontSize: FontSizes.sm,
  },
  selectedCard: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.lg,
  },
  selectedCardContent: {
    flex: 1,
  },
  selectedCardTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
