import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { eventsAPI } from '../../api/client';
import { MapMarker, RootStackParamList } from '../../types';
import WebViewMap from '../../components/maps/WebViewMap';
import { Colors, FontSizes, FontFamily, TextStyles, BorderRadius, Spacing, Shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Map'>;

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
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
    <View style={styles.container}>
      {/* Map */}
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
          <Ionicons name="locate" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapButton} onPress={fetchMapEvents}>
          <Ionicons name="refresh" size={24} color={Colors.gray700} />
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.xl,
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
    top: Spacing.xl,
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
    bottom: Spacing.xl,
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
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
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
