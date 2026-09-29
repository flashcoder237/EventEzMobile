/**
 * RollingText — texte/chiffre qui « roule » quand sa valeur change : l'ancien
 * sort vers le haut, le nouveau entre par le bas (inverse si la valeur baisse).
 * Rien au premier rendu. Réduire les animations : changement sec.
 *
 * CountBadge — pastille de compteur non lu. Elle « éclate » (pop + anneau qui
 * s'élargit) UNIQUEMENT quand la valeur augmente après le montage : jamais au
 * chargement, jamais quand elle baisse. Pas d'haptique (événement non provoqué
 * par l'utilisateur).
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
import { Amplitudes, Curves, Durations, springConfig } from '../../../constants/motion';
import { useMotionGate, useSettled } from './useMotionGate';

export interface RollingTextProps {
  value: string | number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Force le sens ; sinon déduit (nombre en hausse = vers le haut). */
  direction?: 'up' | 'down';
  duration?: number;
  numberOfLines?: number;
  testID?: string;
}

function RollingTextComponent({
  value,
  style,
  containerStyle,
  direction,
  duration = Durations.move,
  numberOfLines,
  testID,
}: RollingTextProps) {
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const prev = useRef(value);
  const mounted = useRef(false);
  let dir: 'up' | 'down' = direction ?? 'up';
  if (!direction && typeof value === 'number' && typeof prev.current === 'number') {
    dir = value < prev.current ? 'down' : 'up';
  }
  const animate = mounted.current && canAnimate && prev.current !== value;

  useEffect(() => {
    mounted.current = true;
    prev.current = value;
  }, [value]);

  const entering = animate ? (dir === 'up' ? FadeInUp : FadeInDown).duration(duration) : undefined;
  const exiting = canAnimate ? (dir === 'up' ? FadeOutUp : FadeOutDown).duration(duration) : undefined;

  return (
    <View style={[{ overflow: 'hidden' }, containerStyle]} testID={testID}>
      <Animated.Text
        key={String(value)}
        entering={entering}
        exiting={exiting}
        style={style}
        numberOfLines={numberOfLines}
      >
        {value}
      </Animated.Text>
    </View>
  );
}

export const RollingText = memo(RollingTextComponent);

// ---------------------------------------------------------------------------

export interface CountBadgeProps {
  value: number;
  max?: number;
  /** Affiche la pastille à 0 (défaut : masquée). */
  showZero?: boolean;
  /** Point sans chiffre. */
  dot?: boolean;
  color?: string;
  textColor?: string;
  size?: number;
  /** Liseré qui détache la pastille de son fond (ex. couleur de la pilule). */
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

function CountBadgeComponent({
  value,
  max = 99,
  showZero = false,
  dot = false,
  color,
  textColor = '#FFFFFF',
  size = 18,
  borderColor,
  borderWidth = 0,
  style,
  textStyle,
  testID,
}: CountBadgeProps) {
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const bg = color ?? colors.accent;
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const prev = useRef<number | null>(null);
  const settled = useSettled();

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    // Hausse pendant la fenêtre de chargement = valeur serveur initiale.
    if (before === null || value <= before || !canAnimate || !settled()) return;
    // Tokens : entrée depuis 0,96, pic ≤ 1,12 (jamais 1,28), ressort « pop ».
    scale.value = withSequence(
      withTiming(Amplitudes.enterFrom, { duration: 70, easing: Curves.out }),
      withTiming(Amplitudes.popPeak, { duration: 120, easing: Curves.out }),
      withSpring(1, springConfig('pop')),
    );
    ring.value = 0;
    ring.value = withTiming(1, { duration: Durations.inform + 200, easing: Curves.out });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value > 0 && ring.value < 1 ? 0.7 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + ring.value * 0.9 }],
  }));

  if (value <= 0 && !showZero) return null;
  const label = value > max ? `${max}+` : value;
  const dim = dot ? Math.round(size / 2) : size;

  return (
    <View style={style} pointerEvents="none" testID={testID}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: dim,
            borderWidth: 2,
            borderColor: bg,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            minWidth: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: dot ? 0 : 4,
            borderWidth,
            borderColor: borderColor ?? 'transparent',
          },
          badgeStyle,
        ]}
      >
        {!dot && (
          <RollingText
            value={label}
            style={[{ color: textColor, fontSize: size * 0.6, fontWeight: '700', lineHeight: size }, textStyle]}
          />
        )}
      </Animated.View>
    </View>
  );
}

export const CountBadge = memo(CountBadgeComponent);

export default RollingText;
