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
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
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

// City-specific advice — keeps the local flavor that the original component had
function getCityAdvice(city?: string): string {
  if (!city) return 'On te conseille d\'arriver au moins 15 minutes avant le début.';
  const c = city.toLowerCase();
  if (c.includes('douala'))
    return 'À Douala, prévois 30 min d\'avance — le trafic est dense surtout en fin de journée.';
  if (c.includes('yaound'))
    return 'À Yaoundé, ajoute un buffer pour les embouteillages, surtout sur l\'axe Bastos / Mvog-Ada.';
  if (c.includes('abidjan'))
    return 'À Abidjan, anticipe le trafic — surtout si tu traverses la lagune.';
  return 'On te conseille d\'arriver au moins 15 minutes avant le début.';
}

export default function LocationTab({ event }: LocationTabProps) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const hasPhysicalLocation = event.location_type === 'in_person' || event.location_type === 'hybrid';
  const hasOnlineLocation = event.location_type === 'online' || event.location_type === 'hybrid';
  const hasCoordinates = !!(event.location_latitude && event.location_longitude);

  const fullAddress = [event.location_address, event.location_city, event.location_country]
    .filter(Boolean)
    .join(', ');

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
    if (Platform.OS === 'ios') Linking.openURL(`maps://app?daddr=${destination}`);
    else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
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

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.section}>
      {/* === Section header === */}
      <Text style={[styles.eyebrow, { color: colors.accent }]}>Lieu</Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Où ça se passe</Text>

      {/* === Physical Location === */}
      {hasPhysicalLocation && (
        <>
          {/* Hero map card with floating venue overlay */}
          <View style={[styles.mapCard, { borderColor: hairline }]}>
            {hasCoordinates ? (
              <View style={styles.mapWrap}>
                <WebViewMap
                  markers={mapMarkers}
                  isDark={isDark}
                  initialRegion={{
                    latitude: event.location_latitude!,
                    longitude: event.location_longitude!,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                />
              </View>
            ) : (
              <View style={[styles.noMapWrap, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="map-outline" size={42} color={colors.gray400} />
                <Text style={[styles.noMapText, { color: colors.gray500 }]}>Carte non disponible</Text>
              </View>
            )}

            {/* Floating venue overlay */}
            <View
              style={[
                styles.venueOverlay,
                {
                  backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.96)',
                  borderColor: hairline,
                },
              ]}
            >
              <View style={[styles.venueIconDisc, { backgroundColor: colors.primary }]}>
                <Ionicons name="location" size={16} color="#fff" />
              </View>
              <View style={styles.venueTextWrap}>
                <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={1}>
                  {event.location_name || 'Lieu à définir'}
                </Text>
                <Text style={[styles.venueAddress, { color: colors.gray500 }]} numberOfLines={1}>
                  {fullAddress || event.location_city}
                </Text>
              </View>
              <TouchableOpacity
                onPress={copyAddress}
                style={styles.copyDisc}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Copier l'adresse"
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copied ? '#10B981' : colors.gray500}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action discs row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionDisc, { backgroundColor: colors.card, borderColor: hairline }]}
              onPress={openInGoogleMaps}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#4285F415' }]}>
                <Ionicons name="map" size={18} color="#4285F4" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionDiscPrimary, { backgroundColor: colors.primary }]}
              onPress={openDirections}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name="navigate" size={18} color="#fff" />
              </View>
              <Text style={styles.actionLabelPrimary}>Itinéraire</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionDisc, { backgroundColor: colors.card, borderColor: hairline }]}
              onPress={openInWaze}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#33CCFF15' }]}>
                <Ionicons name="car" size={18} color="#33CCFF" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Waze</Text>
            </TouchableOpacity>
          </View>

          {/* Tips card — editorial, warm tone */}
          <View
            style={[
              styles.tipsCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.accent + '33',
              },
            ]}
          >
            <View style={[styles.tipsIconDisc, { backgroundColor: `${colors.accent}1A` }]}>
              <Ionicons name="bulb" size={18} color={colors.accent} />
            </View>
            <View style={styles.tipsTextWrap}>
              <Text style={[styles.tipsEyebrow, { color: colors.accent }]}>CONSEIL LOCAL</Text>
              <Text style={[styles.tipsBody, { color: colors.gray700 }]}>
                {getCityAdvice(event.location_city)}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* === Online Location === */}
      {hasOnlineLocation && (
        <View style={[styles.onlineCard, { backgroundColor: colors.card, borderColor: hairline }]}>
          <View style={styles.onlineHeader}>
            <View style={[styles.onlineIconDisc, { backgroundColor: '#3B82F61A' }]}>
              <Ionicons name="videocam" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.onlineEyebrow, { color: '#3B82F6' }]}>EN LIGNE</Text>
              <Text style={[styles.onlineTitle, { color: colors.text }]}>
                {event.online_platform === 'eventez_visio'
                  ? 'EventEz Visio'
                  : event.online_platform || 'Visioconférence'}
              </Text>
            </View>
          </View>

          {event.online_url && (
            <TouchableOpacity
              style={[styles.joinOnlineBtn, { backgroundColor: '#3B82F6' }]}
              onPress={() => Linking.openURL(event.online_url!)}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.joinOnlineBtnText}>Rejoindre la réunion</Text>
            </TouchableOpacity>
          )}

          {event.online_instructions && (
            <View style={[styles.instructionsBox, { backgroundColor: colors.gray50, borderColor: hairline }]}>
              <Text style={[styles.instructionsLabel, { color: colors.gray500 }]}>INSTRUCTIONS</Text>
              <Text style={[styles.instructionsText, { color: colors.gray700 }]}>
                {event.online_instructions}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* === No location === */}
      {!hasPhysicalLocation && !hasOnlineLocation && (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="location-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Lieu à confirmer</Text>
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>
            L&apos;organisateur n&apos;a pas encore communiqué le lieu.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    ...TextStyles.eyebrow,
    marginBottom: 4,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.4,
    marginBottom: Spacing.md,
  },

  // === Map card with floating venue ===
  mapCard: {
    borderRadius: BorderRadius.xl + 4,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  mapWrap: {
    height: 220,
  },
  noMapWrap: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noMapText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  venueOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  venueIconDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueTextWrap: {
    flex: 1,
  },
  venueName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  venueAddress: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },
  copyDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === Action discs row ===
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  actionDisc: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionDiscPrimary: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.lg,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  actionLabelPrimary: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
    color: '#fff',
  },

  // === Tips card ===
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  tipsIconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTextWrap: {
    flex: 1,
  },
  tipsEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tipsBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // === Online card ===
  onlineCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  onlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineIconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  onlineTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  joinOnlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
  },
  joinOnlineBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.2,
  },
  instructionsBox: {
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  instructionsLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  instructionsText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },

  // === Empty ===
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
