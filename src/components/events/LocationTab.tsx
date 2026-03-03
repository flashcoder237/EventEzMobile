import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import WebViewMap from '../maps/WebViewMap';
import { MapMarker } from '../../types';

interface LocationTabProps {
  event: {
    id: string;
    location_name?: string;
    location_address?: string;
    location_city?: string;
    location_country?: string;
    location_latitude?: number;
    location_longitude?: number;
    location_type?: string;
    online_platform?: string;
    online_url?: string;
    online_instructions?: string;
    online_meeting_id?: string;
    online_passcode?: string;
    start_date?: string;
    category?: { name?: string } | null;
    banner_image?: string | null;
    registration_count?: number;
  };
}

export default function LocationTab({ event }: LocationTabProps) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const hasPhysicalLocation = event.location_type === 'in_person' || event.location_type === 'hybrid';
  const hasOnlineLocation = event.location_type === 'online' || event.location_type === 'hybrid';
  const hasCoordinates = !!(event.location_latitude && event.location_longitude);

  const fullAddress = [
    event.location_address,
    event.location_city,
    event.location_country,
  ].filter(Boolean).join(', ');

  const copyAddress = () => {
    Clipboard.setString(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGoogleMaps = () => {
    const url = hasCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${event.location_latitude},${event.location_longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    Linking.openURL(url);
  };

  const openDirections = () => {
    const destination = hasCoordinates
      ? `${event.location_latitude},${event.location_longitude}`
      : encodeURIComponent(fullAddress);

    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://app?daddr=${destination}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    }
  };

  const openInWaze = () => {
    const url = hasCoordinates
      ? `https://waze.com/ul?ll=${event.location_latitude},${event.location_longitude}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes`;
    Linking.openURL(url);
  };

  const mapMarkers: MapMarker[] = hasCoordinates
    ? [{
        id: event.id,
        lat: event.location_latitude!,
        lng: event.location_longitude!,
        title: event.location_name || 'Lieu',
        location_name: event.location_name || 'Lieu',
        location_city: event.location_city || '',
        start_date: event.start_date || '',
        category: event.category?.name || null,
        banner_image: event.banner_image || null,
        registration_count: event.registration_count || 0,
      }]
    : [];

  return (
    <View style={styles.container}>
      {/* Physical Location */}
      {hasPhysicalLocation && (
        <>
          {/* Venue Info */}
          <View style={[styles.venueCard, { backgroundColor: colors.surface, borderColor: colors.gray200 }]}>
            <View style={styles.venueIconRow}>
              <View style={styles.venueIcon}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={styles.venueInfo}>
                <Text style={[styles.venueName, { color: colors.gray900 }]}>
                  {event.location_name || 'Lieu a definir'}
                </Text>
                <Text style={[styles.venueAddress, { color: colors.gray600 }]}>{fullAddress}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionButton, { borderColor: colors.gray200, backgroundColor: colors.surface }]} onPress={openInGoogleMaps}>
                <Ionicons name="map-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Google Maps</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={openDirections}>
                <Ionicons name="navigate-outline" size={18} color={Colors.white} />
                <Text style={[styles.actionButtonText, { color: Colors.white }]}>Itineraire</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, { borderColor: colors.gray200, backgroundColor: colors.surface }]} onPress={openInWaze}>
                <Ionicons name="car-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Waze</Text>
              </TouchableOpacity>
            </View>

            {/* Copy Address */}
            <TouchableOpacity style={styles.copyButton} onPress={copyAddress}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copied ? colors.success : colors.gray600}
              />
              <Text style={[styles.copyButtonText, { color: copied ? colors.success : colors.gray600 }]}>
                {copied ? 'Adresse copiee !' : 'Copier l\'adresse'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Map */}
          {hasCoordinates ? (
            <View style={styles.mapContainer}>
              <WebViewMap
                markers={mapMarkers}
                initialRegion={{
                  latitude: event.location_latitude!,
                  longitude: event.location_longitude!,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              />
            </View>
          ) : (
            <View style={[styles.noMapContainer, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="map-outline" size={48} color={colors.gray400} />
              <Text style={[styles.noMapText, { color: colors.gray600 }]}>Carte non disponible</Text>
              <Text style={[styles.noMapSubtext, { color: colors.gray500 }]}>
                Utilisez les boutons ci-dessus pour consulter la localisation
              </Text>
            </View>
          )}

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: colors.infoLight }]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={[styles.tipsTitle, { color: colors.infoDark }]}>Conseils</Text>
            </View>
            <Text style={[styles.tipsText, { color: colors.info }]}>
              {event.location_city === 'Douala'
                ? 'A Douala, il est recommande d\'arriver au moins 30 minutes avant le debut de l\'evenement en raison du trafic.'
                : event.location_city === 'Yaounde'
                ? 'A Yaounde, prevoir un delai supplementaire pour le trajet en raison des embouteillages frequents.'
                : 'Nous vous recommandons d\'arriver au moins 15 minutes avant le debut de l\'evenement.'}
            </Text>
          </View>
        </>
      )}

      {/* Online Location */}
      {hasOnlineLocation && (
        <View style={[styles.onlineCard, { backgroundColor: colors.surface, borderColor: colors.gray200 }]}>
          <View style={styles.venueIconRow}>
            <View style={[styles.venueIcon, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="videocam" size={22} color={colors.info} />
            </View>
            <View style={styles.venueInfo}>
              <Text style={[styles.venueName, { color: colors.gray900 }]}>Evenement en ligne</Text>
              {event.online_platform && (
                <Text style={[styles.venueAddress, { color: colors.gray600 }]}>
                  via {event.online_platform === 'eventez_visio' ? 'EventEz Visio' : event.online_platform}
                </Text>
              )}
            </View>
          </View>

          {event.online_url && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary, { marginTop: Spacing.md }]}
              onPress={() => Linking.openURL(event.online_url!)}
            >
              <Ionicons name="open-outline" size={18} color={Colors.white} />
              <Text style={[styles.actionButtonText, { color: Colors.white }]}>
                Rejoindre la reunion
              </Text>
            </TouchableOpacity>
          )}

          {event.online_instructions && (
            <View style={[styles.instructionsBox, { backgroundColor: colors.gray50 }]}>
              <Text style={[styles.instructionsLabel, { color: colors.gray700 }]}>Instructions :</Text>
              <Text style={[styles.instructionsText, { color: colors.gray600 }]}>{event.online_instructions}</Text>
            </View>
          )}
        </View>
      )}

      {/* No location */}
      {!hasPhysicalLocation && !hasOnlineLocation && (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color={colors.gray400} />
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>Aucune information de lieu disponible</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  venueCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  venueIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  venueIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    marginBottom: 2,
  },
  venueAddress: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  copyButtonText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  noMapContainer: {
    height: 200,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  noMapText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginTop: Spacing.sm,
  },
  noMapSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tipsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.infoDark,
  },
  tipsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.info,
    lineHeight: 20,
  },
  onlineCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  instructionsBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
  },
  instructionsLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginBottom: 4,
  },
  instructionsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.md,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
});
