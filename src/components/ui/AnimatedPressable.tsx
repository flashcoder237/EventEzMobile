import React, { useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SpringPresets } from '../../constants/theme';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  animationType?: 'scale' | 'opacity' | 'both' | 'lift' | 'editorial' | 'shadow';
  disabled?: boolean;
  haptic?: boolean | 'light' | 'medium' | 'heavy';
  /** Label d'accessibilite personnalise */
  accessibilityLabel?: string;
}

export default function AnimatedPressable({
  children,
  style,
  scaleValue = 0.97,
  animationType = 'both',
  disabled = false,
  haptic = false,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...props
}: AnimatedPressableProps) {
  const pressed = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    if (!haptic) return;
    const style = haptic === true || haptic === 'light'
      ? Haptics.ImpactFeedbackStyle.Light
      : haptic === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy;
    Haptics.impactAsync(style).catch(() => {});
  }, [haptic]);

  const handlePressIn = useCallback(
    (e: any) => {
      pressed.value = withSpring(1, SpringPresets.snappy);
      triggerHaptic();
      onPressIn?.(e);
    },
    [onPressIn, pressed, triggerHaptic]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      pressed.value = withSpring(0, SpringPresets.snappy);
      onPressOut?.(e);
    },
    [onPressOut, pressed]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, scaleValue]);
    const opacity = interpolate(pressed.value, [0, 1], [1, 0.9]);
    const translateY = interpolate(pressed.value, [0, 1], [0, -2]);

    switch (animationType) {
      case 'scale':
        return { transform: [{ scale }] };
      case 'opacity':
        return { opacity };
      case 'lift':
        return {
          transform: [{ scale }, { translateY }],
          opacity,
        };
      case 'editorial': {
        const editorialScale = interpolate(pressed.value, [0, 1], [1, 0.96]);
        const editorialTranslateY = interpolate(pressed.value, [0, 1], [0, -3]);
        const editorialRotate = interpolate(pressed.value, [0, 1], [0, -0.5]);
        return {
          transform: [
            { scale: editorialScale },
            { translateY: editorialTranslateY },
            { rotate: `${editorialRotate}deg` },
          ],
          opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
        };
      }
      case 'shadow': {
        // Pas d'ombre au repos — elle apparait uniquement au touch.
        // Subtle scale (0.99) pour donner une sensation tactile.
        // shadowColor/shadowOffset doivent etre definis dans le style
        // de la card pour que l'animation ait un rendu visible sur iOS.
        const shadowScale = interpolate(pressed.value, [0, 1], [1, 0.99]);
        return {
          transform: [{ scale: shadowScale }],
          shadowOpacity: interpolate(pressed.value, [0, 1], [0, 0.18]),
          shadowRadius: interpolate(pressed.value, [0, 1], [0, 14]),
          elevation: interpolate(pressed.value, [0, 1], [0, 8]),
        };
      }
      case 'both':
      default:
        return {
          transform: [{ scale }],
          opacity,
        };
    }
  });

  return (
    <AnimatedPressableComponent
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
