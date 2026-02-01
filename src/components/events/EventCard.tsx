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
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  eventType?: 'billetterie' | 'inscription';
  variant?: 'default' | 'featured' | 'horizontal' | 'compact';
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

  const formatTime = () => {
    try {
      const eventDate = new Date(date);
      return eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const defaultImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';

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
            source={{ uri: imageUrl || defaultImage }}
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
          source={{ uri: imageUrl || defaultImage }}
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
          source={{ uri: imageUrl || defaultImage }}
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

  // ===== DEFAULT VARIANT (Standard scrollable card) =====
  const typeLabel = getEventTypeLabel();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.defaultCard}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: imageUrl || defaultImage }}
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
  // ===== DEFAULT CARD =====
  defaultCard: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultContent: {
    padding: Spacing.md,
  },
  defaultDate: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  defaultTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 6,
    lineHeight: 20,
  },
  defaultLocation: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: 8,
  },
  defaultPrice: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
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
});

export default memo(EventCard);
