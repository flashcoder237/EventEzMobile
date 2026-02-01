import React, { useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Animations } from '../../constants/theme';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  animationType?: 'scale' | 'opacity' | 'both' | 'lift';
  disabled?: boolean;
}

export default function AnimatedPressable({
  children,
  style,
  scaleValue = 0.97,
  animationType = 'both',
  disabled = false,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (e: any) => {
      pressed.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
      onPressIn?.(e);
    },
    [onPressIn, pressed]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      pressed.value = withSpring(0, {
        damping: 15,
        stiffness: 400,
      });
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
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
