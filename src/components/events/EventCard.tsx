import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSizes,
  FontWeights,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

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
  variant = 'default',
  onPress,
  onLikePress,
}: EventCardProps) {
  const formatPrice = () => {
    if (isFree) return 'Gratuit';
    if (typeof price === 'number') return `${price.toLocaleString()} FCFA`;
    return price || 'Gratuit';
  };

  const formatDate = () => {
    try {
      const eventDate = new Date(date);
      const day = eventDate.getDate();
      const month = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
      return { day, month };
    } catch {
      return { day: '--', month: '---' };
    }
  };

  const formatFullDate = () => {
    try {
      const eventDate = new Date(date);
      return eventDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return date;
    }
  };

  const { day, month } = formatDate();

  // Horizontal variant - clean card style
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.horizontalCard}
        activeOpacity={0.7}
      >
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require('../../../assets/defaults/default-event.png')
          }
          style={styles.horizontalImage}
          resizeMode="cover"
        />
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalHeader}>
            {category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={onLikePress}
              style={styles.likeButtonSmall}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? Colors.error : Colors.gray400}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.horizontalMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.gray500} />
              <Text style={styles.metaText}>{formatFullDate()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.gray500} />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>
          <View style={styles.horizontalFooter}>
            <Text style={styles.priceText}>{formatPrice()}</Text>
            {attendees !== undefined && (
              <View style={styles.attendeesContainer}>
                <Ionicons name="people-outline" size={14} color={Colors.gray400} />
                <Text style={styles.attendeesText}>{attendees}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.compactCard}
        activeOpacity={0.8}
      >
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require('../../../assets/defaults/default-event.png')
          }
          style={styles.compactImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.compactOverlay}
        />
        <View style={styles.compactDateBadge}>
          <Text style={styles.compactDateDay}>{day}</Text>
          <Text style={styles.compactDateMonth}>{month}</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.compactLocation} numberOfLines={1}>
            <Ionicons name="location" size={12} color={Colors.gray300} /> {location}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Featured or Default variant - card with image overlay
  const isFeatured = variant === 'featured';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, isFeatured && styles.featuredCard]}
      activeOpacity={0.8}
    >
      {/* Image */}
      <Image
        source={
          imageUrl
            ? { uri: imageUrl }
            : require('../../../assets/defaults/default-event.png')
        }
        style={[styles.image, isFeatured && styles.featuredImage]}
        resizeMode="cover"
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Date Badge */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      {/* Like Button */}
      <TouchableOpacity
        onPress={onLikePress}
        style={styles.likeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.likeButtonBg}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? Colors.error : Colors.gray700}
          />
        </View>
      </TouchableOpacity>

      {/* Category Badge */}
      {category && (
        <View style={styles.categoryBadgeTop}>
          <Text style={styles.categoryTextLight}>{category}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, isFeatured && styles.featuredTitle]} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={Colors.gray300} />
          <Text style={styles.locationText} numberOfLines={1}>
            {location}
          </Text>
        </View>

        {time && (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={Colors.gray300} />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            {isFree ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gratuit</Text>
              </View>
            ) : (
              <Text style={styles.priceLight}>{formatPrice()}</Text>
            )}
          </View>
          {attendees !== undefined && (
            <View style={styles.attendeesRow}>
              <Ionicons name="people" size={14} color={Colors.gray300} />
              <Text style={styles.attendeesTextLight}>{attendees}+</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Default Card
  card: {
    width: 260,
    height: 320,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray900,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  featuredCard: {
    width: 280,
    height: 360,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredImage: {
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dateBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  dateDay: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    lineHeight: FontSizes.xl * 1.1,
  },
  dateMonth: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.gray500,
    letterSpacing: 1,
  },
  likeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  likeButtonBg: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  categoryBadgeTop: {
    position: 'absolute',
    top: Spacing.md,
    left: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryTextLight: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
    lineHeight: FontSizes.lg * 1.3,
  },
  featuredTitle: {
    fontSize: FontSizes.xl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.gray300,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeText: {
    fontSize: FontSizes.sm,
    color: Colors.gray300,
    marginLeft: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLight: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  freeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  freeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeesTextLight: {
    fontSize: FontSizes.sm,
    color: Colors.gray300,
    marginLeft: Spacing.xs,
  },

  // Horizontal Card
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 130,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  horizontalImage: {
    width: 120,
    height: '100%',
  },
  horizontalContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  horizontalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  likeButtonSmall: {
    padding: Spacing.xs,
  },
  horizontalTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    lineHeight: FontSizes.base * 1.3,
  },
  horizontalMeta: {
    gap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    flex: 1,
  },
  horizontalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  attendeesText: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },

  // Compact Card
  compactCard: {
    width: 160,
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.gray900,
    ...Shadows.md,
  },
  compactImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  compactOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  compactDateBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  compactDateDay: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  compactDateMonth: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.gray500,
    textTransform: 'uppercase',
  },
  compactContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  compactTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  compactLocation: {
    fontSize: FontSizes.xs,
    color: Colors.gray300,
  },
});

export default memo(EventCard);
