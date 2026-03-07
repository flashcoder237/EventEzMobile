import React, { memo, useRef, useEffect } from 'react';
import { Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BRAND_COLORS = ['#4F46E5', '#A855F7', '#818CF8', '#C084FC', '#BEFF5A', '#FF6B6B'];

interface ConfettiEffectProps {
  autoStart?: boolean;
  count?: number;
  origin?: { x: number; y: number };
  fadeOut?: boolean;
  colors?: string[];
}

function ConfettiEffectComponent({
  autoStart = true,
  count = 150,
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
