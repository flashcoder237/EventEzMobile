import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../ui/AnimatedPressable';
import {
  Colors,
  FontSizes,
  FontWeights,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  eventCount?: number;
  onPress?: () => void;
  variant?: 'default' | 'large' | 'compact';
}

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
  eventCount,
  onPress,
  variant = 'default',
}: CategoryCardProps) {
  const gradientColors = color
    ? [color, color]
    : categoryColors[id.toLowerCase()] || categoryColors.default;

  if (variant === 'large') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={styles.largeCard}
        animationType="lift"
        scaleValue={0.96}
      >
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
          {eventCount !== undefined && (
            <Text style={styles.largeCount}>{eventCount} événements</Text>
          )}
        </LinearGradient>
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
    ...Shadows.md,
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
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
    width: 150,
    height: 160,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
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
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
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
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
});

export default memo(CategoryCard);
