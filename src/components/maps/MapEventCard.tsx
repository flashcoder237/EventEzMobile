import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getMediaUrl } from '../../api/client';
import { formatDate } from '../../lib/utils/dateFormatters';
import CategoryIcon from '../icons/CategoryIcons';
import { MapMarker } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface MapEventCardProps {
  marker: MapMarker;
  userLocation?: { lat: number; lng: number } | null;
  onPress: () => void;
  calculateDistance?: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  bottomOffset?: number;
}

function formatPrice(marker: MapMarker): string {
  if (marker.is_free) return 'Gratuit';
  const p = marker.min_price || marker.price;
  if (p && p > 0) {
    return p.toLocaleString('fr-FR') + ' FCFA';
  }
  return 'Gratuit';
}

export default function MapEventCard({
  marker,
  userLocation,
  onPress,
  calculateDistance,
  bottomOffset,
}: MapEventCardProps) {
  const { colors, isDark } = useTheme();
  const imageUrl = getMediaUrl(marker.banner_image);

  const distance = userLocation && marker.lat && marker.lng && calculateDistance
    ? Math.round(calculateDistance(userLocation.lat, userLocation.lng, marker.lat, marker.lng))
    : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }, bottomOffset !== undefined && { bottom: bottomOffset }, isDark && styles.cardDark]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.gray200 }]}>
            <Ionicons name="calendar-outline" size={28} color={colors.gray400} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category badge */}
        {marker.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '18' }]}>
            <CategoryIcon name={marker.category} size={10} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.categoryText, { color: colors.primary }]} numberOfLines={1}>
              {marker.category}
            </Text>
          </View>
        )}

        {/* Date */}
        <Text style={[styles.dateText, { color: colors.accent }]}>
          {formatDate(marker.start_date).toUpperCase()}
        </Text>

        {/* Title */}
        <Text style={[styles.title, { color: colors.gray900 }]} numberOfLines={2}>
          {marker.title}
        </Text>

        {/* Location + Distance */}
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {marker.location_city}
          </Text>
          {distance !== null && (
            <Text style={[styles.distanceText, { color: colors.primary }]}>
              {distance} km
            </Text>
          )}
        </View>

        {/* Price */}
        <Text style={[styles.price, { color: marker.is_free ? colors.success : colors.gray900 }]}>
          {formatPrice(marker)}
        </Text>
      </View>

      {/* Arrow */}
      <View style={[styles.arrowContainer, { backgroundColor: colors.gray50 }]}>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.lg,
  },
  cardDark: {
    shadowColor: '#000',
  },
  imageContainer: {
    width: 100,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.displayBold,
    marginBottom: 2,
  },
  title: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    marginBottom: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    flex: 1,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
  },
  price: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
