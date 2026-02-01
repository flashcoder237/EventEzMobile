import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AnimatedPressable from '../ui/AnimatedPressable';
import {
  Colors,
  FontSizes,
  FontWeights,
  Spacing,
  BorderRadius,
  Shadows,
  Gradients,
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

  const { day, month } = formatDate();

  if (variant === 'horizontal') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.horizontalCard}
        animationType="lift"
        scaleValue={0.98}
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
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.horizontalImageOverlay}
        />
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalHeader}>
            {category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            )}
            <AnimatedPressable
              onPress={onLikePress}
              style={styles.likeButtonSmall}
              animationType="scale"
              scaleValue={0.85}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? Colors.error : Colors.gray400}
              />
            </AnimatedPressable>
          </View>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.horizontalMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.metaText}>{date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} />
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
      </AnimatedPressable>
    );
  }

  if (variant === 'compact') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.compactCard}
        animationType="lift"
        scaleValue={0.98}
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
          colors={Gradients.darkStrong}
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
      </AnimatedPressable>
    );
  }

  // Featured or Default variant
  const isFeatured = variant === 'featured';

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.card, isFeatured && styles.featuredCard]}
      animationType="lift"
      scaleValue={0.98}
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
        colors={Gradients.darkStrong}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Date Badge */}
      <View style={styles.dateBadge}>
        <LinearGradient
          colors={Gradients.primary}
          style={styles.dateBadgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </LinearGradient>
      </View>

      {/* Like Button */}
      <AnimatedPressable
        onPress={onLikePress}
        style={styles.likeButton}
        animationType="scale"
        scaleValue={0.85}
      >
        <BlurView intensity={80} tint="light" style={styles.likeButtonBlur}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? Colors.error : Colors.gray700}
          />
        </BlurView>
      </AnimatedPressable>

      {/* Category Badge */}
      {category && (
        <View style={styles.categoryBadgeTop}>
          <BlurView intensity={60} tint="dark" style={styles.categoryBlur}>
            <Text style={styles.categoryTextLight}>{category}</Text>
          </BlurView>
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
              <Text style={styles.price}>{formatPrice()}</Text>
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
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Default Card
  card: {
    width: 280,
    height: 340,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray900,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  featuredCard: {
    width: 300,
    height: 380,
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
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.violet,
  },
  dateBadgeGradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  dateDay: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.white,
    lineHeight: FontSizes['2xl'] * 1.1,
  },
  dateMonth: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
    opacity: 0.9,
    letterSpacing: 1,
  },
  likeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  likeButtonBlur: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  categoryBadgeTop: {
    position: 'absolute',
    top: Spacing.md,
    left: 80,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  categoryBlur: {
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
  price: {
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
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    height: 140,
    ...Shadows.card,
  },
  horizontalImage: {
    width: 130,
    height: '100%',
  },
  horizontalImageOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 130,
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
    paddingVertical: Spacing.xs,
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
    fontSize: FontSizes.md,
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
