/**
 * RotatingPlaceholder — texte d'exemple qui défile dans un faux champ de
 * recherche (« Concert à Douala », « Mariage… »). Catalogue A2.
 *
 * L'état vit ICI, pas dans l'écran : changer d'exemple ne redessine que ce
 * composant (avant : tout DiscoverScreen se re-rendait toutes les 3 s).
 * Le minuteur ne tourne que si l'écran est affiché et l'app au premier plan.
 * Animations réduites : simple fondu, sans déplacement.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp } from 'react-native-reanimated';
import { useMotionGate } from './useMotionGate';

export interface RotatingPlaceholderProps {
  items: string[];
  intervalMs?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  testID?: string;
}

function RotatingPlaceholderComponent({
  items,
  intervalMs = 3000,
  style,
  containerStyle,
  numberOfLines = 1,
  testID,
}: RotatingPlaceholderProps) {
  const { appActive, focused, reduced } = useMotionGate();
  const [index, setIndex] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!appActive || !focused || items.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(id);
  }, [appActive, focused, items.length, intervalMs]);

  const safeIndex = index % Math.max(1, items.length);
  const entering = !mounted.current
    ? undefined
    : reduced
      ? FadeIn.duration(200)
      : FadeInDown.duration(260);
  const exiting = reduced ? FadeOut.duration(150) : FadeOutUp.duration(220);

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* Texte en absolu (gauche/droite seulement) : Yoga le centre alors
          verticalement via justifyContent, et le texte sortant et l'entrant se
          superposent pendant la transition au lieu de s'empiler. `flex: 0`
          neutralise un éventuel `flex: 1` hérité du style de l'écran, qui
          étirait le texte sur toute la hauteur (texte collé en haut). */}
      <Animated.Text
        key={safeIndex}
        entering={entering}
        exiting={exiting}
        style={[style, styles.text]}
        numberOfLines={numberOfLines}
      >
        {items[safeIndex] ?? ''}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    flex: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export const RotatingPlaceholder = memo(RotatingPlaceholderComponent);
export default RotatingPlaceholder;
