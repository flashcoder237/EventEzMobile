import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FontSizes,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Image par défaut pour les événements (comme sur le web)
const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  imageUrl?: string;
  category?: string;
  price?: string | number;
  attendees?: number;
  isFree?: boolean;
  isLiked?: boolean;
  isFeatured?: boolean;
  locationType?: 'in_person' | 'online' | 'hybrid';
  eventType?: 'billetterie' | 'inscription';
  variant?: 'default' | 'featured' | 'horizontal' | 'compact' | 'grid';
  onPress?: () => void;
  onLikePress?: () => void;
}

function EventCard({
  id,
  title,
  date,
  time,
  location,
  imageUrl,
  category,
  price,
  attendees,
  isFree = false,
  isLiked = false,
  isFeatured = false,
  locationType = 'in_person',
  eventType,
  variant = 'default',
  onPress,
  onLikePress,
}: EventCardProps) {
  const formatPrice = () => {
    // Événement explicitement gratuit
    if (isFree) return 'Gratuit';
    // Prix numérique défini (y compris 0 pour les billets gratuits dans un événement payant)
    if (typeof price === 'number' && price > 0) return `${price.toLocaleString()} FCFA`;
    // Prix chaîne définie
    if (typeof price === 'string' && price.trim()) return price;
    // Prix non défini mais pas marqué gratuit - ne pas afficher "Gratuit"
    return 'Voir prix';
  };

  const getEventTypeLabel = () => {
    if (eventType === 'billetterie') return 'Billetterie';
    if (eventType === 'inscription') return 'Inscription';
    return null;
  };

  const getLocationTypeConfig = () => {
    switch (locationType) {
      case 'online':
        return { icon: 'videocam' as const, label: 'En ligne', color: '#3B82F6' };
      case 'hybrid':
        return { icon: 'globe' as const, label: 'Hybride', color: '#8B5CF6' };
      default:
        return { icon: 'location' as const, label: 'Présentiel', color: '#F97316' };
    }
  };

  const formatDateShort = () => {
    try {
      const eventDate = new Date(date);
      const day = eventDate.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3).toUpperCase();
      const dayNum = eventDate.getDate();
      const month = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
      return `${day} ${dayNum} ${month}`;
    } catch {
      return 'Date TBA';
    }
  };

  const formatDateFull = () => {
    try {
      const eventDate = new Date(date);
      return eventDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return 'Date TBA';
    }
  };

  const formatTime = () => {
    try {
      const eventDate = new Date(date);
      return eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ===== HORIZONTAL VARIANT (List item style - Eventbrite) =====
  if (variant === 'horizontal') {
    const typeLabel = getEventTypeLabel();
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.horizontalCard}
        activeOpacity={0.7}
      >
        <View>
          <Image
            source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
            style={styles.horizontalImage}
            resizeMode="cover"
          />
          {typeLabel && (
            <View style={[styles.eventTypeBadge, eventType === 'inscription' && styles.inscriptionBadge]}>
              <Text style={styles.eventTypeBadgeText}>{typeLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.horizontalDate}>
            {formatDateShort()} {time && `· ${formatTime()}`}
          </Text>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.horizontalLocation} numberOfLines={1}>
            {location}
          </Text>
          <View style={styles.horizontalFooter}>
            {isFree ? (
              <Text style={styles.freeText}>Gratuit</Text>
            ) : (
              <Text style={styles.priceText}>{formatPrice()}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={onLikePress}
          style={styles.bookmarkButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isLiked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isLiked ? Colors.primary : Colors.gray400}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // ===== COMPACT VARIANT (Small grid card) =====
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.compactCard}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
          style={styles.compactImage}
          resizeMode="cover"
        />
        <View style={styles.compactContent}>
          <Text style={styles.compactDate}>{formatDateShort()}</Text>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.compactPrice}>
            {isFree ? 'Gratuit' : formatPrice()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ===== FEATURED VARIANT (Large hero card) =====
  if (variant === 'featured') {
    const typeLabel = getEventTypeLabel();
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.featuredCard}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        {typeLabel && (
          <View style={[styles.eventTypeBadge, eventType === 'inscription' && styles.inscriptionBadge]}>
            <Text style={styles.eventTypeBadgeText}>{typeLabel}</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={onLikePress}
          style={styles.featuredBookmark}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isLiked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={Colors.white}
          />
        </TouchableOpacity>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredDate}>
            {formatDateShort()} {time && `· ${formatTime()}`}
          </Text>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.featuredMeta}>
            <Ionicons name="location-outline" size={14} color={Colors.gray500} />
            <Text style={styles.featuredLocation} numberOfLines={1}>
              {location}
            </Text>
          </View>
          {isFree ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Gratuit</Text>
            </View>
          ) : (
            <Text style={styles.featuredPrice}>À partir de {formatPrice()}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // ===== GRID VARIANT (Web-like card design for search/events page) =====
  if (variant === 'grid') {
    const typeLabel = getEventTypeLabel();
    const locationConfig = getLocationTypeConfig();

    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.gridCard}
        activeOpacity={0.8}
      >
        {/* Image */}
        <View style={styles.gridImageContainer}>
          <Image
            source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
            style={styles.gridImage}
            resizeMode="cover"
          />

          {/* Badges Container */}
          <View style={styles.gridBadgesContainer}>
            {/* Left Badges */}
            <View style={styles.gridLeftBadges}>
              {/* Type Badge */}
              {typeLabel && (
                <View style={[styles.gridTypeBadge, eventType === 'inscription' && styles.gridInscriptionBadge]}>
                  <Text style={styles.gridTypeBadgeText}>{typeLabel}</Text>
                </View>
              )}
              {/* Location Type Badge */}
              <View style={[styles.gridLocationBadge, { backgroundColor: `${locationConfig.color}20` }]}>
                <Ionicons name={locationConfig.icon} size={12} color={locationConfig.color} />
                <Text style={[styles.gridLocationBadgeText, { color: locationConfig.color }]}>
                  {locationConfig.label}
                </Text>
              </View>
            </View>

            {/* Featured Badge */}
            {isFeatured && (
              <View style={styles.gridFeaturedBadge}>
                <Ionicons name="star" size={10} color="#92400E" />
                <Text style={styles.gridFeaturedBadgeText}>Vedette</Text>
              </View>
            )}
          </View>

          {/* Bookmark Button */}
          <TouchableOpacity
            onPress={onLikePress}
            style={styles.gridBookmark}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isLiked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={Colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.gridContent}>
          {/* Category */}
          {category && (
            <Text style={styles.gridCategory}>{category.toUpperCase()}</Text>
          )}

          {/* Title */}
          <Text style={styles.gridTitle} numberOfLines={2}>{title}</Text>

          {/* Info */}
          <View style={styles.gridInfoRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gray400} />
            <Text style={styles.gridInfoText}>{formatDateFull()}</Text>
          </View>

          <View style={styles.gridInfoRow}>
            <Ionicons name={locationConfig.icon} size={14} color={locationConfig.color} />
            <Text style={styles.gridInfoText} numberOfLines={1}>{location}</Text>
          </View>

          {/* Footer */}
          <View style={styles.gridFooter}>
            <View style={styles.gridAttendeesRow}>
              <Ionicons name="people-outline" size={14} color={Colors.gray500} />
              <Text style={styles.gridAttendeesText}>
                {attendees || 0} inscrit{(attendees || 0) > 1 ? 's' : ''}
              </Text>
            </View>

            {isFree || eventType === 'inscription' ? (
              <Text style={styles.gridFreeText}>Gratuit</Text>
            ) : (
              <Text style={styles.gridPriceText}>{formatPrice()}</Text>
            )}
          </View>

          {/* See details link */}
          <View style={styles.gridDetailsLink}>
            <Text style={styles.gridDetailsText}>Voir les détails</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ===== DEFAULT VARIANT (Standard scrollable card) =====
  const typeLabel = getEventTypeLabel();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.defaultCard}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
        style={styles.defaultImage}
        resizeMode="cover"
      />
      {typeLabel && (
        <View style={[styles.eventTypeBadge, eventType === 'inscription' && styles.inscriptionBadge]}>
          <Text style={styles.eventTypeBadgeText}>{typeLabel}</Text>
        </View>
      )}
      <TouchableOpacity
        onPress={onLikePress}
        style={styles.defaultBookmark}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isLiked ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={Colors.white}
        />
      </TouchableOpacity>
      <View style={styles.defaultContent}>
        <Text style={styles.defaultDate}>
          {formatDateShort()} {time && `· ${formatTime()}`}
        </Text>
        <Text style={styles.defaultTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.defaultLocation} numberOfLines={1}>
          {location}
        </Text>
        {isFree ? (
          <View style={styles.freeBadgeSmall}>
            <Text style={styles.freeBadgeTextSmall}>Gratuit</Text>
          </View>
        ) : (
          <Text style={styles.defaultPrice}>{formatPrice()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ===== DEFAULT CARD - Premium Elevated Style =====
  defaultCard: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  defaultImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.gray100,
  },
  defaultBookmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  defaultContent: {
    padding: Spacing.md,
    paddingTop: Spacing.base,
  },
  defaultDate: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 8,
    lineHeight: 22,
  },
  defaultLocation: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginBottom: 10,
  },
  defaultPrice: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.bold,
    color: Colors.gray800,
  },

  // ===== HORIZONTAL CARD =====
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  horizontalImage: {
    width: 110,
    height: 110,
    backgroundColor: Colors.gray100,
  },
  horizontalContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  horizontalDate: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  horizontalTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
    lineHeight: 20,
  },
  horizontalLocation: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: 6,
  },
  horizontalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkButton: {
    padding: Spacing.md,
    justifyContent: 'center',
  },
  priceText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  freeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
  },

  // ===== COMPACT CARD =====
  compactCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  compactImage: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.gray100,
  },
  compactContent: {
    padding: Spacing.sm,
  },
  compactDate: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  compactTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
    lineHeight: 16,
  },
  compactPrice: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },

  // ===== FEATURED CARD =====
  featuredCard: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  featuredImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.gray100,
  },
  featuredBookmark: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredContent: {
    padding: Spacing.md,
  },
  featuredDate: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  featuredTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: 8,
    lineHeight: 24,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredLocation: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginLeft: 4,
    flex: 1,
  },
  featuredPrice: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },

  // ===== SHARED STYLES =====
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  freeBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.bold,
    color: Colors.success,
  },
  freeBadgeSmall: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  freeBadgeTextSmall: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
  },
  // Event type badge
  eventTypeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  eventTypeBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  inscriptionBadge: {
    backgroundColor: Colors.secondary,
  },

  // ===== GRID CARD (Web-like design) =====
  gridCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
    marginBottom: Spacing.md,
  },
  gridImageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: Colors.gray100,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridBadgesContainer: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gridLeftBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  gridTypeBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  gridInscriptionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  gridTypeBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  gridLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  gridLocationBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
  },
  gridFeaturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FCD34D',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  gridFeaturedBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: '#92400E',
  },
  gridBookmark: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    padding: Spacing.md,
  },
  gridCategory: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  gridTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  gridInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  gridInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  gridAttendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridAttendeesText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  gridPriceText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  gridFreeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
  },
  gridDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  gridDetailsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
});

export default memo(EventCard);
