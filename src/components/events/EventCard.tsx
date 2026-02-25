import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../ui/AnimatedPressable';
import {
  Colors,
  FontFamily,
  FontSizes,
  Spacing,
  BorderRadius,
  Shadows,
  Gradients,
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  // === Helpers ===

  const formatPrice = () => {
    if (isFree) return 'Gratuit';
    if (typeof price === 'number' && price > 0) return `${price.toLocaleString()} FCFA`;
    if (typeof price === 'number' && price === 0) return 'Gratuit';
    if (typeof price === 'string' && price.trim()) return price;
    if (eventType === 'inscription') return 'Gratuit';
    return 'Voir prix';
  };

  const formatPriceShort = () => {
    const p = formatPrice();
    if (p === 'Gratuit') return p;
    if (p === 'Voir prix') return p;
    return `Dès ${p}`;
  };

  const formatDateAccent = () => {
    try {
      const eventDate = new Date(date);
      const day = eventDate.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3).toUpperCase();
      const dayNum = eventDate.getDate();
      const month = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
      const timeStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `${day}. ${dayNum} ${month} · ${timeStr}`;
    } catch {
      return 'Date TBA';
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

  const isGratuit = isFree || formatPrice() === 'Gratuit';

  // ===== HORIZONTAL VARIANT (list item — search results) =====
  if (variant === 'horizontal') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.horizontalCard}
        animationType="both"
        scaleValue={0.98}
        haptic="light"
      >
        <Image
          source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
          style={styles.horizontalImage}
          resizeMode="cover"
        />
        <View style={styles.horizontalContent}>
          <Text style={styles.dateAccent}>{formatDateAccent()}</Text>
          <Text style={styles.horizontalTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>
          <Text style={isGratuit ? styles.priceGratuit : styles.priceText}>
            {formatPrice()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onLikePress}
          style={styles.bookmarkSide}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isLiked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isLiked ? Colors.primary : Colors.gray400}
          />
        </TouchableOpacity>
      </AnimatedPressable>
    );
  }

  // ===== COMPACT VARIANT (small card — horizontal scroll) =====
  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} style={styles.compactCard} activeOpacity={0.7}>
        <Image
          source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
          style={styles.compactImage}
          resizeMode="cover"
        />
        <View style={styles.compactContent}>
          <Text style={styles.dateAccentSmall}>{formatDateShort()}</Text>
          <Text style={styles.compactTitle} numberOfLines={2}>{title}</Text>
          <Text style={isGratuit ? styles.compactPriceGratuit : styles.compactPrice}>
            {formatPrice()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ===== FEATURED VARIANT (hero card — carousel) =====
  if (variant === 'featured') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.featuredCard}
        animationType="editorial"
        haptic="light"
      >
        <View style={styles.featuredImageContainer}>
          <Image
            source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
          {/* Gradient overlay for text legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
            style={styles.featuredGradient}
          />
          {/* Date badge on image */}
          <View style={styles.featuredDateBadge}>
            <Text style={styles.featuredDateBadgeText}>{formatDateShort()}</Text>
          </View>
          {/* Bookmark */}
          <TouchableOpacity
            onPress={onLikePress}
            style={styles.featuredBookmark}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isLiked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={Colors.white}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.featuredContent}>
          <Text style={styles.dateAccent}>{formatDateAccent()}</Text>
          <Text style={styles.featuredTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.featuredLocation} numberOfLines={1}>{location}</Text>
          </View>
          <View style={styles.featuredFooter}>
            {isGratuit ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gratuit</Text>
              </View>
            ) : (
              <Text style={styles.featuredPrice}>{formatPriceShort()}</Text>
            )}
            {attendees != null && attendees > 0 && (
              <View style={styles.attendeesRow}>
                <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.attendeesText}>{attendees}</Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ===== GRID VARIANT (full-width card — Explore/search results) =====
  if (variant === 'grid') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.gridCard}
        animationType="both"
        scaleValue={0.98}
        haptic="light"
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
            style={styles.gridImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.gridContent}>
          <Text style={styles.dateAccent}>{formatDateAccent()}</Text>
          <Text style={styles.gridTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.gridLocation} numberOfLines={1}>{location}</Text>
          </View>
          <View style={styles.gridFooter}>
            <Text style={isGratuit ? styles.priceGratuit : styles.gridPrice}>
              {isGratuit ? 'Gratuit' : formatPriceShort()}
            </Text>
            <TouchableOpacity
              onPress={onLikePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isLiked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isLiked ? Colors.primary : Colors.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ===== DEFAULT VARIANT (standard card — horizontal scroll feeds) =====
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.defaultCard}
      animationType="both"
      scaleValue={0.97}
      haptic="light"
    >
      <Image
        source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
        style={styles.defaultImage}
        resizeMode="cover"
      />
      <View style={styles.defaultContent}>
        <Text style={styles.dateAccent}>{formatDateAccent()}</Text>
        <Text style={styles.defaultTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
        </View>
        <Text style={isGratuit ? styles.priceGratuit : styles.priceText}>
          {isGratuit ? 'Gratuit' : formatPriceShort()}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // ===== SHARED STYLES =====
  dateAccent: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dateAccentSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  priceText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  priceGratuit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.success,
  },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  freeBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  // ===== DEFAULT CARD =====
  defaultCard: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  defaultImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray100,
  },
  defaultContent: {
    padding: Spacing.md,
    paddingTop: Spacing.md,
  },
  defaultTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    lineHeight: 22,
    marginBottom: 6,
  },

  // ===== HORIZONTAL CARD =====
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  horizontalImage: {
    width: 120,
    height: 130,
    backgroundColor: Colors.gray100,
  },
  horizontalContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  horizontalTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    lineHeight: 22,
    marginBottom: 4,
  },
  bookmarkSide: {
    padding: Spacing.md,
    justifyContent: 'center',
  },

  // ===== COMPACT CARD =====
  compactCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  compactImage: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.gray100,
  },
  compactContent: {
    padding: Spacing.md,
  },
  compactTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    lineHeight: 18,
    marginBottom: 6,
  },
  compactPrice: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.gray800,
  },
  compactPriceGratuit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.success,
  },

  // ===== FEATURED CARD =====
  featuredCard: {
    width: SCREEN_WIDTH * 0.88,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.glass,
  },
  featuredImageContainer: {
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.gray100,
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  featuredDateBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  featuredDateBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredBookmark: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredContent: {
    padding: Spacing.lg,
  },
  featuredTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: FontSizes['2xl'],
    color: Colors.gray900,
    lineHeight: 30,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  featuredLocation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  featuredPrice: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },

  // ===== GRID CARD =====
  gridCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius['4xl'],
    overflow: 'hidden',
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  gridImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray100,
  },
  gridContent: {
    padding: Spacing.lg,
  },
  gridTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    lineHeight: 24,
    marginBottom: 6,
  },
  gridLocation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gridPrice: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },
});

export default memo(EventCard);
