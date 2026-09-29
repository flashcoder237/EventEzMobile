/**
 * Composants d'animation reutilisables
 * Equivalents mobile des micro-interactions Framer Motion du web
 */

import React, { useEffect, useCallback, useRef, useState, memo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
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
import { haptics } from '../../utils/haptics';
import { BurstParticles } from './motion/BurstParticles';

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

/**
 * Au-delà de cet index, un item de liste apparaît sans délai supplémentaire.
 * Sans plafond, le 30e item d'une FlatList attendait 30 × 60 ms = 1,8 s avant
 * de s'afficher (perçu comme « l'écran est lent »), et chaque item recyclé
 * par la virtualisation rejouait ce délai géant au scroll.
 */
export const MAX_STAGGER_INDEX = 6;

/** Délai de stagger plafonné — à utiliser aussi pour les `entering` reanimated. */
export function staggerDelayFor(index: number, step: number): number {
  return Math.min(Math.max(index, 0), MAX_STAGGER_INDEX) * step;
}

interface StaggeredItemProps {
  children: React.ReactNode;
  index: number;
  staggerDelay?: number;
  style?: StyleProp<ViewStyle>;
}

function StaggeredItemComponent({
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
      staggerDelayFor(index, staggerDelay),
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

// Mémoïsation par défaut (shallow compare). L'ancienne version comparait
// uniquement {index, staggerDelay, style} en ignorant `children`, ce qui faisait
// que les rows dont l'index ne changeait pas n'étaient JAMAIS re-rendus même
// quand leur contenu changeait (preview message, badge unread, etc.). Symptôme :
// MessagesScreen restait sur un état figé après envoi/réception WS.
// La shallow compare native re-render quand la JSX `children` change (nouvelle
// référence à chaque render parent), ce qui est le bon comportement pour des
// listes dynamiques. L'animation d'entrée ne rejoue pas (deps useEffect vides).
export const StaggeredItem = memo(StaggeredItemComponent);

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
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.8);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withDelay(delay, withSpring(1, SpringPresets.bouncy));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
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
// 4. PulsingBadge — Notification pulse effect
// ============================================

interface PulsingBadgeProps {
  children: React.ReactNode;
  /**
   * Pulsation continue (legacy). À éviter : le style guide §6 interdit les
   * boucles permanentes hors « en direct ». Préférer `trigger`.
   */
  active?: boolean;
  /**
   * Une seule pulsation à chaque changement de valeur (jamais au montage).
   * Ex. : `trigger={unreadCount}` — la cloche réagit à l'arrivée d'une notif,
   * puis se tait.
   */
  trigger?: number | string;
  style?: StyleProp<ViewStyle>;
}

export function PulsingBadge({
  children,
  active,
  trigger,
  style,
}: PulsingBadgeProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  // Mode par défaut : continu seulement si aucun `trigger` n'est fourni.
  const continuous = active ?? trigger === undefined;

  useEffect(() => {
    // Ne pas démarrer la pulsation infinie si l'utilisateur a réduit les animations.
    if (continuous && !reducedMotion) {
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
    return () => {
      // Stop the infinite withRepeat when active toggles or component unmounts
      cancelAnimation(scale);
    };
  }, [continuous, reducedMotion]);

  const lastTrigger = useRef(trigger);
  useEffect(() => {
    if (lastTrigger.current === trigger) return;
    lastTrigger.current = trigger;
    if (continuous || reducedMotion) return;
    scale.value = withSequence(
      withTiming(1.22, { duration: 160, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 10, stiffness: 260 })
    );
  }, [trigger, continuous, reducedMotion]);

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
  /** Vibration légère à l'activation (jamais au retrait). Défaut : true. */
  haptic?: boolean;
  /** Éclat de 6 particules indigo/violet/corail à l'activation. Défaut : true. */
  burst?: boolean;
  /**
   * false = suivre `isActive` sans aucun effet (ex. état chargé du serveur
   * avant tout geste de l'utilisateur). Défaut : true.
   */
  animate?: boolean;
}

/**
 * Rebond UNIQUEMENT au passage false → true provoqué par l'utilisateur.
 * Un favori déjà actif au montage (affichage / recyclage de cellule) ne
 * rebondit pas ; le retrait ne rebondit pas et ne vibre pas.
 */
export function AnimatedBookmark({
  children,
  isActive,
  style,
  haptic = true,
  burst = true,
  animate = true,
}: AnimatedBookmarkProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const prev = useRef(isActive);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    const was = prev.current;
    prev.current = isActive;
    if (was || !isActive || !animate) return;
    if (haptic) haptics.light();
    if (reducedMotion) return;
    if (burst) setBurstKey((k) => k + 1);
    scale.value = withSequence(
      withTiming(0.6, { duration: 80 }),
      withSpring(1.2, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
      {burst && <BurstParticles trigger={burstKey} />}
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
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
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
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
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
