/**
 * G14 — double tap sur la bannière de la fiche = enregistrer.
 *
 * Couche plein cadre posée sur l'image : le tap simple garde son rôle
 * (ouvrir la galerie), le double tap enregistre — `Gesture.Exclusive`, donc
 * jamais les deux. Les Tap échouent dès que le doigt bouge : le défilement et
 * « tirer pour fermer » restent prioritaires.
 *
 * Au point touché : un signet corail qui se pose puis s'efface, quelques
 * particules, haptique légère. Le double tap n'enlève JAMAIS l'enregistrement
 * (le bouton signet le fait).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { BurstParticles } from '../ui/motion/BurstParticles';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Durations } from '../../constants/motion';
import { haptics } from '../../utils/haptics';

const CORAL = '#FF6B6B';
const MARK = 56;

export default function DoubleTapSaveLayer({
  onSingleTap,
  onDoubleTap,
  accessibilityLabel,
  saveActionLabel,
}: {
  onSingleTap?: () => void;
  onDoubleTap: () => void;
  accessibilityLabel?: string;
  /** Libellé de l'action d'accessibilité équivalente au double tap. */
  saveActionLabel: string;
}) {
  const reduced = useReducedMotion();
  const [point, setPoint] = useState<{ x: number; y: number; n: number } | null>(null);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const play = useCallback(
    (x: number, y: number) => {
      haptics.light();
      setPoint((p) => ({ x, y, n: (p?.n ?? 0) + 1 }));
      if (reduced) {
        scale.value = 1;
        opacity.value = withSequence(withTiming(1, { duration: 0 }), withDelay(600, withTiming(0, { duration: Durations.exit })));
      } else {
        scale.value = withSequence(withTiming(0.6, { duration: 0 }), withTiming(1, { duration: Durations.move }));
        opacity.value = withSequence(withTiming(1, { duration: 90 }), withDelay(560, withTiming(0, { duration: 260 })));
      }
      onDoubleTap();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDoubleTap, reduced],
  );

  const single = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onEnd((_e, ok) => {
      if (ok) onSingleTap?.();
    });
  const double = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDistance(16)
    .onEnd((e, ok) => {
      if (ok) play(e.x, e.y);
    });
  const gesture = Gesture.Exclusive(double, single);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[
          ...(onSingleTap ? [{ name: 'activate' as const }] : []),
          { name: 'save', label: saveActionLabel },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onSingleTap?.();
          if (e.nativeEvent.actionName === 'save') {
            haptics.light();
            onDoubleTap();
          }
        }}
      >
        {point && (
          <View pointerEvents="none" style={[styles.anchor, { left: point.x, top: point.y }]}>
            <Animated.View style={[styles.mark, markStyle]}>
              <Ionicons name="bookmark" size={MARK} color={CORAL} />
            </Animated.View>
            <BurstParticles trigger={point.n} distance={34} dotSize={5} count={8} duration={420} />
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0 },
  mark: {
    position: 'absolute',
    left: -MARK / 2,
    top: -MARK / 2,
    width: MARK,
    height: MARK,
    alignItems: 'center',
    justifyContent: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
  },
});
