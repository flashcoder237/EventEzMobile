import React, { memo, useRef, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BRAND_COLORS = ['#4F46E5', '#A855F7', '#818CF8', '#C084FC', '#BEFF5A', '#FF6B6B'];

// Older Android devices struggle with 150 simultaneous animated views.
// Cap the particle count for Android < 11 (API 30) which corresponds to
// roughly the 4GB-RAM-and-below segment we still target. iOS handles it fine.
const DEFAULT_COUNT = (() => {
  if (Platform.OS === 'android') {
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
    if (apiLevel > 0 && apiLevel < 30) return 60;
  }
  return 150;
})();

interface ConfettiEffectProps {
  autoStart?: boolean;
  count?: number;
  origin?: { x: number; y: number };
  fadeOut?: boolean;
  colors?: string[];
}

function ConfettiEffectComponent({
  autoStart = true,
  count = DEFAULT_COUNT,
  origin = { x: SCREEN_WIDTH / 2, y: -20 },
  fadeOut = true,
  colors = BRAND_COLORS,
}: ConfettiEffectProps) {
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (autoStart && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [autoStart]);

  return (
    <ConfettiCannon
      ref={confettiRef}
      count={count}
      origin={origin}
      autoStart={autoStart}
      fadeOut={fadeOut}
      colors={colors}
      explosionSpeed={350}
      fallSpeed={3000}
    />
  );
}

export const ConfettiEffect = memo(ConfettiEffectComponent);
export default ConfettiEffect;
