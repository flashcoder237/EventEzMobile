import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { ARect, ACircle, APath, usePulse, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function Alert({ color = '#7C3AED', size = 200 }: Props) {
  // Exclamation pulses
  const excPulse = useWaveOpacity(0.7, 1, 1200);
  const dotPulse = useWaveOpacity(0.6, 1, 1200, 200);
  // Impact lines stagger
  const line1 = usePulse(0.1, 0.35, 1400, 0);
  const line2 = usePulse(0.08, 0.3, 1400, 200);
  const line3 = usePulse(0.1, 0.35, 1400, 400);
  const line4 = usePulse(0.08, 0.3, 1400, 600);
  // Floating bits
  const bit1 = usePulse(0.08, 0.25, 2200, 300);
  const bit2 = usePulse(0.06, 0.2, 2600, 500);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={105} r={78} fill={color} opacity={0.06} />

      {/* Warning triangle */}
      <G>
        <Path
          d="M100 48l55 95.3a8 8 0 0 1-6.9 12H51.9a8 8 0 0 1-6.9-12L100 48z"
          fill={color}
          opacity={0.08}
        />
        <Path
          d="M96.5 52.5a4 4 0 0 1 7 0l50.4 87.2a4 4 0 0 1-3.5 6H49.6a4 4 0 0 1-3.5-6l50.4-87.2z"
          fill="#fff"
          stroke={color}
          strokeWidth={2}
        />

        {/* Animated exclamation */}
        <ARect animatedProps={excPulse} x={97} y={80} width={6} height={32} rx={3} fill={color} />
        <ACircle animatedProps={dotPulse} cx={100} cy={125} r={4} fill={color} />
      </G>

      {/* Animated impact lines */}
      <APath animatedProps={line1} d="M45 130l-10 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={line2} d="M40 122l-8 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={line3} d="M155 130l10 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={line4} d="M160 122l8 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />

      {/* Floating bits */}
      <ACircle animatedProps={bit1} cx={40} cy={75} r={4} fill={color} />
      <ACircle animatedProps={bit2} cx={160} cy={70} r={3} fill={color} />
      <Circle cx={100} cy={165} r={5} fill={color} opacity={0.1} />
      <Path d="M68 45l-3-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.2} />
      <Path d="M132 45l3-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.2} />
    </Svg>
  );
}
