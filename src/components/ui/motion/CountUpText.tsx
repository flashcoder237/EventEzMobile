/**
 * CountUpText — chiffre qui compte de 0 à sa valeur à la première apparition
 * (600 ms, sortie amortie), sans re-render React : le texte est écrit sur le
 * thread UI via un TextInput animé (`animatedProps.text`).
 *
 * Ensuite, si la valeur augmente (nouveau billet, nouveau favori), le chiffre
 * « roule » (RollingText) avec un bref pop lumineux. Rien quand elle baisse.
 * Réduire les animations : valeur finale directement.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleProp, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RollingText } from './RollingText';
import { useMotionGate } from './useMotionGate';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface CountUpTextProps {
  value: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  duration?: number;
  testID?: string;
}

function CountUpTextComponent({ value, style, containerStyle, duration = 600, testID }: CountUpTextProps) {
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  // Le comptage part à la première valeur non nulle (les stats arrivent
  // souvent après le montage, à 0 d'abord) — une seule fois par instance.
  const [counting, setCounting] = useState(() => canAnimate && value > 0);
  const started = useRef(false);
  const progress = useSharedValue(0);
  const target = useSharedValue(value);
  const pop = useSharedValue(1);
  const prev = useRef(value);

  useEffect(() => {
    target.value = value;
    const before = prev.current;
    prev.current = value;
    if (!started.current) {
      if (value <= 0) return;
      started.current = true;
      if (!canAnimate) {
        setCounting(false);
        return;
      }
      setCounting(true);
      progress.value = 0;
      progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setCounting)(false);
      });
      return;
    }
    if (!counting && canAnimate && value > before) {
      pop.value = withSequence(
        withTiming(1.14, { duration: 120 }),
        withSpring(1, { damping: 12, stiffness: 260 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const text = useDerivedValue(() => String(Math.round(target.value * progress.value)));
  const animatedProps = useAnimatedProps(() => ({ text: text.value, defaultValue: text.value }) as never);
  // Le pop sert de « flash » : léger grossissement + éclat (opacité 0,7 → 1).
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    opacity: pop.value > 1.001 ? 0.7 + 0.3 * ((1.14 - pop.value) / 0.14) : 1,
  }));

  if (counting) {
    return (
      <View style={containerStyle} testID={testID} accessible accessibilityLabel={String(value)}>
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          underlineColorAndroid="transparent"
          defaultValue="0"
          animatedProps={animatedProps}
          style={[style, { padding: 0, margin: 0 }]}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    );
  }

  return (
    <Animated.View style={[containerStyle, popStyle]} testID={testID}>
      <RollingText value={value} style={style} />
    </Animated.View>
  );
}

export const CountUpText = memo(CountUpTextComponent);
export default CountUpText;
