import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { APath, ACircle, useWaveOpacity, usePulse } from '../animated';

type Props = { color?: string; size?: number };

export default function MyNotifications({ color = '#7C3AED', size = 200 }: Props) {
  // Sound waves pulse outward staggered
  const sw1 = useWaveOpacity(0.1, 0.4, 1000, 0);
  const sw2 = useWaveOpacity(0.08, 0.3, 1000, 250);
  const sw3 = useWaveOpacity(0.1, 0.4, 1000, 500);
  const sw4 = useWaveOpacity(0.08, 0.3, 1000, 750);
  // ZZZ pulse
  const z1Pulse = usePulse(0.2, 0.5, 3000, 0);
  const z2Pulse = usePulse(0.2, 0.45, 3400, 300);
  // Bottom dot
  const dotPulse = usePulse(0.05, 0.18, 2600, 400);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Bell */}
      <G>
        <Path
          d="M100 80c-16.6 0-30 13.4-30 30v14c0 0-8 0-8 6h76c0-6-8-6-8-6v-14c0-16.6-13.4-30-30-30z"
          fill="#fff"
          stroke={color}
          strokeWidth={2}
        />
        <Circle cx={100} cy={136} r={5} fill={color} />
        <Path d="M96 80v-6a4 4 0 0 1 8 0v6" stroke={color} strokeWidth={2} fill="none" />
      </G>

      {/* Animated sound waves */}
      <APath animatedProps={sw1} d="M60 98a8 8 0 0 0-6 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={sw2} d="M52 92a16 16 0 0 0-10 16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={sw3} d="M140 98a8 8 0 0 1 6 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={sw4} d="M148 92a16 16 0 0 1 10 16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />

      {/* Animated ZZZ */}
      <G>
        <APath animatedProps={z1Pulse} d="M125 55h12l-12 10h12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <APath animatedProps={z2Pulse} d="M140 45h8l-8 7h8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </G>

      {/* Floating dots */}
      <Circle cx={45} cy={75} r={4} fill={color} opacity={0.15} />
      <Circle cx={160} cy={70} r={3} fill={color} opacity={0.12} />
      <ACircle animatedProps={dotPulse} cx={100} cy={160} r={5} fill={color} />
    </Svg>
  );
}
