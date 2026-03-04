/**
 * useBottomSheetAnim — hook Reanimated partagé pour tous les bottom sheets.
 *
 * Retourne :
 *  - modalOpen  : boolean à passer à Modal visible={modalOpen}
 *  - sheetAnim  : style animé (translateY) à passer au Reanimated.View sheet
 *  - backdropAnim : style animé (opacity) à passer au backdrop
 *
 * Entrée  : spring(damping=17, stiffness=190) + backdrop fade 300ms
 * Sortie  : spring rapide vers le bas + backdrop fade 220ms
 *           Le Modal est masqué 290ms après le déclenchement de la sortie
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { height: SCREEN_H } = Dimensions.get('window');

const SPRING_IN  = { damping: 17, stiffness: 190, mass: 0.9 } as const;
const SPRING_OUT = { damping: 24, stiffness: 300, mass: 0.8 } as const;
const EXIT_DELAY = 290;

export function useBottomSheetAnim(visible: boolean) {
  const [modalOpen, setModalOpen] = useState(false);

  const sheetY      = useSharedValue(SCREEN_H);
  const backdropAlp = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      sheetY.value      = SCREEN_H;
      backdropAlp.value = 0;
      setModalOpen(true);

      const id = setTimeout(() => {
        sheetY.value      = withSpring(0, SPRING_IN);
        backdropAlp.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      }, 10);

      return () => clearTimeout(id);
    } else {
      sheetY.value      = withSpring(SCREEN_H, SPRING_OUT);
      backdropAlp.value = withTiming(0, { duration: 220 });

      const id = setTimeout(() => setModalOpen(false), EXIT_DELAY);
      return () => clearTimeout(id);
    }
  }, [visible]);

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: backdropAlp.value,
  }));

  return { modalOpen, sheetAnim, backdropAnim };
}
