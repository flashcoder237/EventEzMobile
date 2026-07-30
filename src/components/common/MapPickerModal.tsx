import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';


interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
  locationName?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationData) => void;
  initialLat?: number;
  initialLng?: number;
}

// Default center - Cameroon (Douala)
const DEFAULT_REGION: Region = {
  latitude: 4.0511,
  longitude: 9.7679,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function MapPickerModal({
  visible,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
}: MapPickerModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Initialize with initial coordinates if provided
  useEffect(() => {
    if (visible && initialLat && initialLng) {
      const position = { latitude: initialLat, longitude: initialLng };
      setMarkerPosition(position);
      setSelectedLocation({ lat: initialLat, lng: initialLng });

      // Animate to initial position
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          ...position,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }, 100);
    }
  }, [visible, initialLat, initialLng]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      if (!initialLat || !initialLng) {
        setSelectedLocation(null);
        setMarkerPosition(null);
      }
    }
  }, [visible]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    // Limiter à 6 décimales
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EventEz Mobile App',
          },
        }
      );
      const data = await response.json();

      const location: LocationData = {
        lat: roundedLat,
        lng: roundedLng,
        address: data.display_name || '',
        city: data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '',
        country: data.address?.country || t('componentsCommon.mapDefaultCountry'),
        locationName: data.name || data.address?.road || '',
      };

      setSelectedLocation(location);
    } catch (error) {
      if (__DEV__) console.error('Reverse geocoding error:', error);
      setSelectedLocation({ lat: roundedLat, lng: roundedLng });
    }
  };

  // Handle map press
  const handleMapPress = async (event: any) => {
    // Limiter à 6 décimales
    const latitude = parseFloat(event.nativeEvent.coordinate.latitude.toFixed(6));
    const longitude = parseFloat(event.nativeEvent.coordinate.longitude.toFixed(6));
    setMarkerPosition({ latitude, longitude });
    await reverseGeocode(latitude, longitude);
  };

  // Handle marker drag
  const handleMarkerDragEnd = async (event: any) => {
    // Limiter à 6 décimales
    const latitude = parseFloat(event.nativeEvent.coordinate.latitude.toFixed(6));
    const longitude = parseFloat(event.nativeEvent.coordinate.longitude.toFixed(6));
    setMarkerPosition({ latitude, longitude });
    await reverseGeocode(latitude, longitude);
  };

  // Search for a location
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      // Recherche mondiale : pas de countrycodes=cm sinon les events hors
      // Cameroun ne trouvent jamais leur lieu.
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=8`,
        {
          headers: {
            'User-Agent': 'EventEz Mobile App',
          },
        }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      if (__DEV__) console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Select a search result
  const selectSearchResult = async (result: SearchResult) => {
    // Limiter à 6 décimales
    const lat = parseFloat(parseFloat(result.lat).toFixed(6));
    const lng = parseFloat(parseFloat(result.lon).toFixed(6));

    setMarkerPosition({ latitude: lat, longitude: lng });
    setSearchResults([]);
    setSearchQuery('');

    // Animate to selected location
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);

    // Parse address details
    const addressParts = result.display_name.split(',');
    const location: LocationData = {
      lat,
      lng,
      address: result.display_name,
      city: addressParts.length > 2 ? addressParts[addressParts.length - 3]?.trim() : '',
      country: addressParts[addressParts.length - 1]?.trim() || t('componentsCommon.mapDefaultCountry'),
      locationName: result.name || addressParts[0]?.trim() || '',
    };

    setSelectedLocation(location);
  };

  // Get user's current location
  const getUserLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert(t('componentsCommon.mapPermissionRequired'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Limiter à 6 décimales
      const latitude = parseFloat(location.coords.latitude.toFixed(6));
      const longitude = parseFloat(location.coords.longitude.toFixed(6));
      setMarkerPosition({ latitude, longitude });

      // Animate to user location
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);

      await reverseGeocode(latitude, longitude);
    } catch (error) {
      if (__DEV__) console.error('Geolocation error:', error);
      alert(t('componentsCommon.mapLocationError'));
    } finally {
      setLoadingLocation(false);
    }
  };

  // Confirm selection
  const confirmSelection = () => {
    if (selectedLocation) {
      // S'assurer que les coordonnées ont au maximum 6 décimales
      onLocationSelect({
        ...selectedLocation,
        lat: parseFloat(selectedLocation.lat.toFixed(6)),
        lng: parseFloat(selectedLocation.lng.toFixed(6)),
      });
      onClose();
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { borderBottomColor: colors.gray100 }]}
      onPress={() => selectSearchResult(item)}
      activeOpacity={TOUCH_OPACITY}
    >
      <Ionicons name="location-outline" size={18} color={colors.primary} />
      <View style={styles.searchResultText}>
        <Text style={[styles.searchResultName, { color: colors.gray900 }]} numberOfLines={1}>
          {item.name || item.display_name.split(',')[0]}
        </Text>
        <Text style={[styles.searchResultAddress, { color: colors.gray500 }]} numberOfLines={1}>
          {item.display_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: colors.card }]}
      >
        {/* Header — paddingTop dynamique via safe-area inset (notch/Dynamic Island) */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.primary, paddingTop: insets.top + Spacing.md },
          ]}
        >
          <TouchableOpacity onPress={onClose} activeOpacity={TOUCH_OPACITY} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="location" size={20} color={Colors.white} />
            <Text style={styles.headerTitle}>{t('componentsCommon.mapHeaderTitle')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="search" size={18} color={colors.gray400} />
            <TextInput
              style={[styles.searchInput, { color: colors.gray900 }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('componentsCommon.mapSearchPlaceholder')}
              placeholderTextColor={colors.gray400}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
            disabled={searching || !searchQuery.trim()}
            activeOpacity={TOUCH_OPACITY}
          >
            {searching ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.searchButtonText}>{t('componentsCommon.mapSearchButton')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: colors.info }]}
            onPress={getUserLocation}
            disabled={loadingLocation}
            activeOpacity={TOUCH_OPACITY}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="locate" size={20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={[styles.searchResultsContainer, { backgroundColor: colors.card }]}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id.toString()}
              renderItem={renderSearchResult}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={
              initialLat && initialLng
                ? {
                    latitude: initialLat,
                    longitude: initialLng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : DEFAULT_REGION
            }
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {markerPosition && (
              <Marker
                coordinate={markerPosition}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            )}
          </MapView>
        </View>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={[styles.selectedLocationContainer, { backgroundColor: colors.gray50, borderTopColor: colors.gray200 }]}>
            <View style={styles.selectedLocationInfo}>
              <Text style={[styles.selectedLocationLabel, { color: colors.gray500 }]}>{t('componentsCommon.mapSelectedLabel')}</Text>
              <Text style={[styles.selectedLocationName, { color: colors.gray900 }]} numberOfLines={1}>
                {selectedLocation.locationName || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
              </Text>
              {selectedLocation.address && (
                <Text style={[styles.selectedLocationAddress, { color: colors.gray600 }]} numberOfLines={2}>
                  {selectedLocation.address}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.success }]}
              onPress={confirmSelection}
              activeOpacity={TOUCH_OPACITY}
            >
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.confirmButtonText}>{t('componentsCommon.mapConfirm')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Help Text — paddingBottom dynamique pour respecter le home indicator iOS */}
        <View
          style={[
            styles.helpContainer,
            {
              backgroundColor: colors.infoLight,
              paddingBottom: Spacing.md + insets.bottom,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={[styles.helpText, { color: colors.info }]}>
            {t('componentsCommon.mapHelpText')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    // paddingTop est défini inline via insets.top + Spacing.md
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    color: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  searchButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  locationButton: {
    backgroundColor: Colors.info,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 160 : 120,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    maxHeight: 200,
    zIndex: 1000,
    ...Shadows.xl,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  searchResultAddress: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    gap: Spacing.md,
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.gray500,
    marginBottom: 4,
  },
  selectedLocationName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  selectedLocationAddress: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  confirmButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.infoLight,
    gap: Spacing.sm,
  },
  helpText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.info,
  },
});
