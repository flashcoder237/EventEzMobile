/**
 * Composants d'animation reutilisables
 * Equivalents mobile des micro-interactions Framer Motion du web
 */

import React, { useEffect, useCallback } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import { SpringPresets, ANIMATION_DURATION } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// ============================================
// 1. FadeInView — Entrance fade + slide up
// ============================================

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 400,
  translateY = 16,
  style,
}: FadeInViewProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [translateY, 0]) },
    ],
  }));

  if (reducedMotion) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 2. StaggeredItem — For list items with stagger
// ============================================

interface StaggeredItemProps {
  children: React.ReactNode;
  index: number;
  staggerDelay?: number;
  style?: StyleProp<ViewStyle>;
}

export function StaggeredItem({
  children,
  index,
  staggerDelay = 60,
  style,
}: StaggeredItemProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withDelay(
      index * staggerDelay,
      withSpring(1, { damping: 18, stiffness: 200 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  if (reducedMotion) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 3. ScaleOnMount — Scale bounce entrance
// ============================================

interface ScaleOnMountProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScaleOnMount({
  children,
  delay = 0,
  style,
}: ScaleOnMountProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, SpringPresets.bouncy));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 4. PulsingBadge — Notification pulse effect
// ============================================

interface PulsingBadgeProps {
  children: React.ReactNode;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PulsingBadge({
  children,
  active = true,
  style,
}: PulsingBadgeProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 5. AnimatedBookmark — Bounce toggle
// ============================================

interface AnimatedBookmarkProps {
  children: React.ReactNode;
  isActive: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedBookmark({
  children,
  isActive,
  style,
}: AnimatedBookmarkProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withTiming(0.6, { duration: 80 }),
        withSpring(1.2, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      );
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 6. ContentTransition — Skeleton to content fade
// ============================================

interface ContentTransitionProps {
  children: React.ReactNode;
  isLoading: boolean;
  skeleton: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ContentTransition({
  children,
  isLoading,
  skeleton,
  style,
}: ContentTransitionProps) {
  if (isLoading) {
    return (
      <Animated.View exiting={FadeOut.duration(200)} style={style}>
        {skeleton}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(250)} style={style}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 7. SectionEntrance — Animate sections on scroll
// ============================================

interface SectionEntranceProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function SectionEntrance({
  children,
  delay = 0,
  style,
}: SectionEntranceProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [24, 0]) },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// 8. SlideInFromRight — Horizontal entrance
// ============================================

interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function SlideIn({
  children,
  delay = 0,
  style,
}: SlideInProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(1, SpringPresets.gentle)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [40, 0]) },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// Reanimated Layout Animations (re-exports)
// ============================================

export {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  SlideInRight,
  Layout,
};
