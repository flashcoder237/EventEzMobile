import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../ui/AnimatedPressable';
import { AnimatedBookmark } from '../ui/Animations';
import { formatPriceRange } from '../../lib/utils/priceFormatters';
import {
  FontFamily,
  FontSizes,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

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
  priceMax?: number;
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
  priceMax,
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
  const { colors, shadows, cardFooterBg, isDark } = useTheme();

  // === Helpers ===

  const formatCardPrice = () => {
    if (isFree) return 'Gratuit';
    if (typeof price === 'number' && typeof priceMax === 'number' && price > 0 && priceMax > price) {
      return formatPriceRange(price, priceMax);
    }
    if (typeof price === 'number' && price > 0) return `Des ${price.toLocaleString()} FCFA`;
    if (typeof price === 'number' && price === 0) return 'Gratuit';
    if (typeof price === 'string' && price.trim()) return price;
    if (eventType === 'inscription') return 'Gratuit';
    return 'Prix variable';
  };

  const formatPriceShort = () => {
    const p = formatCardPrice();
    if (p === 'Gratuit' || p === 'Prix variable') return p;
    return p;
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

  const isGratuit = isFree || formatCardPrice() === 'Gratuit';
  const cardShadow = isDark ? Shadows.md : Shadows.cardViolet;

  // ===== HORIZONTAL VARIANT =====
  if (variant === 'horizontal') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[styles.horizontalCard, { backgroundColor: colors.card }, cardShadow]}
        animationType="both"
        scaleValue={0.98}
        haptic="light"
      >
        <Animated.Image
          source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
          style={[styles.horizontalImage, { backgroundColor: colors.gray100 }]}
          resizeMode="cover"
          sharedTransitionTag={`event-image-${id}`}
        />
        <View style={styles.horizontalContent}>
          <Text style={[styles.dateAccent, { color: colors.accent }]}>{formatDateAccent()}</Text>
          <Text style={[styles.horizontalTitle, { color: colors.gray900 }]} numberOfLines={2}>{title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
          </View>
          <Text style={isGratuit ? [styles.priceGratuit, { color: colors.success }] : [styles.priceText, { color: colors.gray900 }]}>
            {formatCardPrice()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onLikePress}
          style={styles.bookmarkSide}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedBookmark isActive={isLiked}>
            <Ionicons
              name={isLiked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isLiked ? colors.primary : colors.gray400}
            />
          </AnimatedBookmark>
        </TouchableOpacity>
      </AnimatedPressable>
    );
  }

  // ===== COMPACT VARIANT =====
  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.compactCard, { backgroundColor: colors.card }, cardShadow]} activeOpacity={0.7}>
        <Animated.Image
          source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
          style={[styles.compactImage, { backgroundColor: colors.gray100 }]}
          resizeMode="cover"
          sharedTransitionTag={`event-image-${id}`}
        />
        <View style={styles.compactContent}>
          <Text style={[styles.dateAccentSmall, { color: colors.accent }]}>{formatDateShort()}</Text>
          <Text style={[styles.compactTitle, { color: colors.gray900 }]} numberOfLines={2}>{title}</Text>
          <Text style={isGratuit ? [styles.compactPriceGratuit, { color: colors.success }] : [styles.compactPrice, { color: colors.gray800 }]}>
            {formatCardPrice()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ===== FEATURED VARIANT =====
  if (variant === 'featured') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[styles.featuredCard, { backgroundColor: colors.card }, Shadows.glass]}
        animationType="editorial"
        haptic="light"
      >
        <View style={styles.featuredImageContainer}>
          <Animated.Image
            source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
            style={[styles.featuredImage, { backgroundColor: colors.gray100 }]}
            resizeMode="cover"
            sharedTransitionTag={`event-image-${id}`}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
            style={styles.featuredGradient}
          />
          <View style={[styles.featuredDateBadge, { backgroundColor: isDark ? 'rgba(26,26,46,0.9)' : 'rgba(255,255,255,0.95)' }]}>
            <Text style={[styles.featuredDateBadgeText, { color: colors.accent }]}>{formatDateShort()}</Text>
          </View>
          <TouchableOpacity
            onPress={onLikePress}
            style={styles.featuredBookmark}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AnimatedBookmark isActive={isLiked}>
              <Ionicons
                name={isLiked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={colors.white}
              />
            </AnimatedBookmark>
          </TouchableOpacity>
        </View>
        <View style={[styles.featuredContent, { backgroundColor: cardFooterBg }]}>
          <Text style={[styles.dateAccent, { color: colors.accent }]}>{formatDateAccent()}</Text>
          <Text style={[styles.featuredTitle, { color: colors.gray900 }]} numberOfLines={2}>{title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.featuredLocation, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
          </View>
          <View style={styles.featuredFooter}>
            {isGratuit ? (
              <View style={[styles.freeBadge, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.freeBadgeText, { color: colors.success }]}>Gratuit</Text>
              </View>
            ) : (
              <Text style={[styles.featuredPrice, { color: colors.gray900 }]}>{formatPriceShort()}</Text>
            )}
            {attendees != null && attendees > 0 && (
              <View style={styles.attendeesRow}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.attendeesText, { color: colors.textSecondary }]}>{attendees}</Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ===== GRID VARIANT =====
  if (variant === 'grid') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[styles.gridCard, { backgroundColor: colors.card }, cardShadow]}
        animationType="both"
        scaleValue={0.98}
        haptic="light"
      >
        <View style={{ position: 'relative' }}>
          <Animated.Image
            source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
            style={[styles.gridImage, { backgroundColor: colors.gray100 }]}
            resizeMode="cover"
            sharedTransitionTag={`event-image-${id}`}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.gridContent}>
          <Text style={[styles.dateAccent, { color: colors.accent }]}>{formatDateAccent()}</Text>
          <Text style={[styles.gridTitle, { color: colors.gray900 }]} numberOfLines={2}>{title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.gridLocation, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
          </View>
          <View style={styles.gridFooter}>
            <Text style={isGratuit ? [styles.priceGratuit, { color: colors.success }] : [styles.gridPrice, { color: colors.gray900 }]}>
              {isGratuit ? 'Gratuit' : formatPriceShort()}
            </Text>
            <TouchableOpacity
              onPress={onLikePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AnimatedBookmark isActive={isLiked}>
                <Ionicons
                  name={isLiked ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isLiked ? colors.primary : colors.gray400}
                />
              </AnimatedBookmark>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ===== DEFAULT VARIANT =====
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.defaultCard, { backgroundColor: colors.card }, cardShadow]}
      animationType="both"
      scaleValue={0.97}
      haptic="light"
    >
      <Animated.Image
        source={{ uri: imageUrl || DEFAULT_EVENT_IMAGE }}
        style={[styles.defaultImage, { backgroundColor: colors.gray100 }]}
        resizeMode="cover"
        sharedTransitionTag={`event-image-${id}`}
      />
      <View style={styles.defaultContent}>
        <Text style={[styles.dateAccent, { color: colors.accent }]}>{formatDateAccent()}</Text>
        <Text style={[styles.defaultTitle, { color: colors.gray900 }]} numberOfLines={2}>{title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
        </View>
        <Text style={isGratuit ? [styles.priceGratuit, { color: colors.success }] : [styles.priceText, { color: colors.gray900 }]}>
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dateAccentSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
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
    flex: 1,
  },
  priceText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
  },
  priceGratuit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
  },
  freeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  freeBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },

  // ===== DEFAULT CARD =====
  defaultCard: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  defaultImage: {
    width: '100%',
    height: 200,
  },
  defaultContent: {
    padding: Spacing.md,
    paddingTop: Spacing.md,
  },
  defaultTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    lineHeight: 22,
    marginBottom: 6,
  },

  // ===== HORIZONTAL CARD =====
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  horizontalImage: {
    width: 120,
    height: 130,
  },
  horizontalContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  horizontalTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
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
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  compactImage: {
    width: '100%',
    height: 100,
  },
  compactContent: {
    padding: Spacing.md,
  },
  compactTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    lineHeight: 18,
    marginBottom: 6,
  },
  compactPrice: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
  },
  compactPriceGratuit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
  },

  // ===== FEATURED CARD =====
  featuredCard: {
    width: SCREEN_WIDTH * 0.88,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  },
  featuredImageContainer: {
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 280,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  featuredDateBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
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
    lineHeight: 30,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  featuredLocation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
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
  },

  // ===== GRID CARD =====
  gridCard: {
    borderRadius: BorderRadius['4xl'],
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  gridImage: {
    width: '100%',
    height: 200,
  },
  gridContent: {
    padding: Spacing.lg,
  },
  gridTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    lineHeight: 24,
    marginBottom: 6,
  },
  gridLocation: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
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
  },
});

export default memo(EventCard);
