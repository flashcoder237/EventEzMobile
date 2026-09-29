/**
 * CountUpText — chiffre qui compte jusqu'à sa valeur (round 2, M5).
 *
 *   - Comptage 0 → valeur UNE FOIS PAR SESSION et par `countKey` (600 ms,
 *     courbe « settle ») : revenir sur le tableau de bord ne le rejoue plus.
 *   - Ensuite, une variation de valeur s'anime de l'ancienne à la nouvelle
 *     en 400 ms (token « inform ») ; une hausse ajoute un bref éclat.
 *   - UN SEUL nœud texte du début à la fin (TextInput animé, écrit sur le
 *     thread UI, sans re-render) : plus de bascule TextInput → Text qui
 *     décalait la ligne de base de 1-2 px sur Android.
 * Réduire les animations : valeur finale directement.
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleProp, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Curves, Durations } from '../../../constants/motion';
import { moments, useMotionGate } from './useMotionGate';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface CountUpTextProps {
  value: number;
  /** Clé du comptage « une fois par session » (ex. libellé de la stat). */
  countKey?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  duration?: number;
  /**
   * O5 — valeur de départ du premier comptage (« depuis votre dernière
   * visite ») : le chiffre roule de l'ancienne valeur à la nouvelle au lieu
   * de repartir de 0 (ou décompte si `from` > `value`). Ignoré si absent,
   * négatif ou égal à `value`.
   */
  from?: number;
  /** Séparateur de milliers (espace), comme `formatPriceAmount`. */
  group?: boolean;
  /** Délai (ms) avant un comptage depuis `from` — pour enchaîner deux chiffres. */
  delay?: number;
  testID?: string;
}

/** Même rendu que `formatPriceAmount` (espace tous les 3 chiffres), côté UI thread. */
function formatCount(n: number, group: boolean): string {
  'worklet';
  const r = Math.round(n);
  if (!group) return String(r);
  const s = String(Math.abs(r));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ' ';
    out += s[i];
  }
  return r < 0 ? `-${out}` : out;
}

function CountUpTextComponent({
  value,
  countKey,
  style,
  containerStyle,
  duration = 600,
  from,
  group = false,
  delay = 0,
  testID,
}: CountUpTextProps) {
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const shown = useSharedValue(value);
  const flash = useSharedValue(1);
  const started = useRef(false);
  const prev = useRef(value);

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (!started.current) {
      // Le comptage part à la première valeur non nulle (les stats arrivent
      // souvent après le montage, à 0 d'abord).
      if (value <= 0 && !(typeof from === 'number' && from > value)) {
        shown.value = value;
        return;
      }
      started.current = true;
      const hasFrom = typeof from === 'number' && from >= 0 && from !== value;
      // Un départ « depuis la dernière visite » est une information : il
      // joue même si le comptage 0 → valeur a déjà eu lieu dans la session.
      const first = hasFrom || moments.once(`countup:${countKey ?? 'default'}`);
      if (!canAnimate || !first) {
        shown.value = value;
        return;
      }
      shown.value = hasFrom ? (from as number) : 0;
      const run = withTiming(value, {
        duration: hasFrom ? Durations.inform : duration,
        easing: Curves.settle,
      });
      shown.value = hasFrom && delay > 0 ? withDelay(delay, run) : run;
      return;
    }
    if (value === before) return;
    if (!canAnimate) {
      shown.value = value;
      return;
    }
    shown.value = withTiming(value, { duration: Durations.inform, easing: Curves.settle });
    if (value > before) {
      flash.value = withSequence(
        withTiming(0.6, { duration: 120, easing: Curves.out }),
        withTiming(1, { duration: Durations.inform, easing: Curves.out }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const text = useDerivedValue(() => formatCount(shown.value, group));
  const animatedProps = useAnimatedProps(() => ({ text: text.value, defaultValue: text.value }) as never);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View style={containerStyle} testID={testID} accessible accessibilityLabel={String(value)}>
      <Animated.View style={flashStyle}>
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          underlineColorAndroid="transparent"
          defaultValue={formatCount(value, group)}
          animatedProps={animatedProps}
          style={[style, { padding: 0, margin: 0 }]}
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>
    </View>
  );
}

export const CountUpText = memo(CountUpTextComponent);
export default CountUpText;
