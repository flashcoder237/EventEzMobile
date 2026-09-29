/**
 * AnimatedStroke — trait SVG qui se dessine (strokeDashoffset length → 0).
 * DrawCheck — la coche de succès, préréglage d'AnimatedStroke.
 *
 * `onComplete` est appelé à la FIN du trait (via runOnJS) : c'est là qu'on
 * branche l'haptique (règle « haptique au pic visuel »). Si les animations
 * sont réduites, le trait est plein d'emblée et `onComplete` part aussitôt.
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Curves } from '../../../constants/motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface AnimatedStrokeProps {
  d: string;
  /** Longueur (approx.) du tracé, en unités du viewBox. */
  length: number;
  size?: number;
  viewBox?: string;
  color?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  /** Joue quand passe à true (ou à chaque changement si c'est un nombre). */
  play?: boolean | number;
  onComplete?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function AnimatedStrokeComponent({
  d,
  length,
  size = 24,
  viewBox = '0 0 24 24',
  color = '#FFFFFF',
  strokeWidth = 2.5,
  duration = 380,
  delay = 0,
  play = true,
  onComplete,
  style,
  testID,
}: AnimatedStrokeProps) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(length);
  const cb = useRef(onComplete);
  cb.current = onComplete;
  // onComplete (haptique, confettis…) ne part qu'UNE fois par lecture, même si
  // `reduced` bascule après coup (useReducedMotion se résout en asynchrone).
  const fired = useRef(false);
  const done = () => {
    if (fired.current) return;
    fired.current = true;
    cb.current?.();
  };

  useEffect(() => {
    if (play === false) {
      offset.value = length;
      fired.current = false;
      return;
    }
    if (reduced) {
      offset.value = 0;
      done();
      return;
    }
    offset.value = length;
    offset.value = withDelay(
      delay,
      withTiming(0, { duration, easing: Curves.inOut }, (finished) => {
        if (finished) runOnJS(done)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <Svg width={size} height={size} viewBox={viewBox} style={style} testID={testID}>
      <AnimatedPath
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={length}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

export const AnimatedStroke = memo(AnimatedStrokeComponent);

export type DrawCheckProps = Omit<AnimatedStrokeProps, 'd' | 'length' | 'viewBox'>;

const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
const CHECK_LENGTH = 20;

function DrawCheckComponent(props: DrawCheckProps) {
  return <AnimatedStroke {...props} d={CHECK_PATH} length={CHECK_LENGTH} viewBox="0 0 24 24" />;
}

export const DrawCheck = memo(DrawCheckComponent);
export default DrawCheck;
