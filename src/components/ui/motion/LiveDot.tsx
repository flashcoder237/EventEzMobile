/**
 * LiveDot — point « en direct » : pastille fixe + anneau radar qui s'étend
 * (1 → 2,4, opacité 0,55 → 0, 2,4 s). C'est la SEULE boucle permise par le
 * style guide ; elle se met en pause écran masqué, app en arrière-plan ou
 * animations réduites (point fixe seul).
 */
import React, { memo, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
import { useMotionGate } from './useMotionGate';

export interface LiveDotProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function LiveDotComponent({ size = 8, color, style, testID }: LiveDotProps) {
  const { colors } = useTheme();
  const { canAnimate } = useMotionGate();
  const c = color ?? colors.accent;
  const p = useSharedValue(0);

  useEffect(() => {
    if (canAnimate) {
      p.value = 0;
      p.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }), -1, false);
    } else {
      cancelAnimation(p);
      p.value = 0;
    }
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAnimate]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 1.4 }],
  }));

  return (
    <View style={[{ width: size, height: size }, style]} testID={testID} pointerEvents="none">
      {canAnimate && (
        <Animated.View
          style={[
            { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: c },
            ringStyle,
          ]}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c }} />
    </View>
  );
}

export const LiveDot = memo(LiveDotComponent);
export default LiveDot;
