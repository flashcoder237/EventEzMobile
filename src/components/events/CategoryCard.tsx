import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../ui/AnimatedPressable';
import {
  Colors,
  FontSizes,
  Spacing,
  BorderRadius,
  Shadows,
  FontFamily,
} from '../../constants/theme';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  image?: string;
  eventCount?: number;
  onPress?: () => void;
  variant?: 'default' | 'large' | 'compact';
}

// Images par défaut pour les catégories (comme sur le web)
const categoryImages: Record<string, string> = {
  'Musique': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
  'Business': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400',
  'Conférence': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
  'Art': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
  'Sport': 'https://images.unsplash.com/photo-1461896836934- voices-8a9c7?w=400',
  'Gastronomie': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
  'Festival': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
  'Formation': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
  'Networking': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400',
  'Culture': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400',
  'Technologie': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
  'Santé': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400',
};

const categoryColors: Record<string, [string, string]> = {
  music: ['#7C3AED', '#A855F7'],
  sports: ['#10B981', '#34D399'],
  art: ['#F59E0B', '#FBBF24'],
  food: ['#EF4444', '#F87171'],
  tech: ['#3B82F6', '#60A5FA'],
  business: ['#6366F1', '#818CF8'],
  education: ['#8B5CF6', '#A78BFA'],
  health: ['#EC4899', '#F472B6'],
  default: ['#7C3AED', '#D946EF'],
};

function CategoryCard({
  id,
  name,
  icon,
  color,
  image,
  eventCount,
  onPress,
  variant = 'default',
}: CategoryCardProps) {
  const gradientColors: [string, string] = color
    ? [color, color]
    : categoryColors[id.toLowerCase()] || categoryColors.default;

  // Get image URL: use provided image, or lookup by name, or null for gradient fallback
  const imageUrl = image || categoryImages[name] || null;

  if (variant === 'large') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.largeCard}
        animationType="lift"
        scaleValue={0.96}
      >
        {imageUrl ? (
          <ImageBackground
            source={{ uri: imageUrl }}
            style={styles.largeImageBackground}
            imageStyle={styles.largeImage}
          >
            {/* Dark overlay gradient */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']}
              style={styles.largeOverlay}
            >
              <View style={styles.largeIconContainer}>
                <Ionicons name={icon} size={32} color={Colors.white} />
              </View>
              <Text style={styles.largeName}>{name}</Text>
              {eventCount !== undefined && eventCount > 0 && (
                <Text style={styles.largeCount}>{eventCount} événement{eventCount > 1 ? 's' : ''}</Text>
              )}
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={gradientColors}
            style={styles.largeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.largeIconContainer}>
              <Ionicons name={icon} size={32} color={Colors.white} />
            </View>
            <Text style={styles.largeName}>{name}</Text>
            {eventCount !== undefined && eventCount > 0 && (
              <Text style={styles.largeCount}>{eventCount} événement{eventCount > 1 ? 's' : ''}</Text>
            )}
          </LinearGradient>
        )}
      </AnimatedPressable>
    );
  }

  if (variant === 'compact') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.compactCard}
        animationType="scale"
        scaleValue={0.95}
      >
        <View style={[styles.compactIconBg, { backgroundColor: `${gradientColors[0]}15` }]}>
          <Ionicons name={icon} size={20} color={gradientColors[0]} />
        </View>
        <Text style={styles.compactName} numberOfLines={1}>
          {name}
        </Text>
      </AnimatedPressable>
    );
  }

  // Default variant
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.card}
      animationType="lift"
      scaleValue={0.95}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={28} color={Colors.white} />
        </View>
      </LinearGradient>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {eventCount !== undefined && (
        <Text style={styles.count}>{eventCount}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Default Card
  card: {
    width: 85,
    alignItems: 'center',
  },
  gradient: {
    width: 65,
    height: 65,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.glass,
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    textAlign: 'center',
  },
  count: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 2,
  },

  // Large Card
  largeCard: {
    width: 160,
    height: 200,
    borderRadius: BorderRadius['4xl'],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  largeImageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  largeImage: {
    borderRadius: BorderRadius['4xl'],
  },
  largeOverlay: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  largeGradient: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  largeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  largeName: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  largeCount: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Compact Card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
    gap: Spacing.sm,
  },
  compactIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactName: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
});

export default memo(CategoryCard);
