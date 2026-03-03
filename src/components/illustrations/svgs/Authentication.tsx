import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { ACircle, APath, usePulse, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function Authentication({ color = '#7C3AED', size = 200 }: Props) {
  // Check badge pulses
  const badgePulse = usePulse(0.12, 0.3, 1800, 200);
  // Checkmark appears/fades
  const checkPulse = useWaveOpacity(0.6, 1, 1400, 400);
  // Shield subtle glow
  const shieldGlow = usePulse(0.03, 0.08, 2400);
  // Accent dots
  const dot1 = usePulse(0.08, 0.25, 2200, 0);
  const dot2 = usePulse(0.1, 0.3, 2000, 600);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Shield */}
      <Path
        d="M100 38l50 22v40c0 30-20 54-50 64-30-10-50-34-50-64V60l50-22z"
        fill="#fff"
        stroke={color}
        strokeWidth={2}
      />
      <APath
        animatedProps={shieldGlow}
        d="M100 38l50 22v40c0 30-20 54-50 64V38z"
        fill={color}
      />

      {/* Lock */}
      <G>
        <Rect x={82} y={92} width={36} height={30} rx={6} fill={color} opacity={0.9} />
        <Path d="M88 92v-10a12 12 0 0 1 24 0v10" stroke={color} strokeWidth={3} fill="none" />
        <Circle cx={100} cy={104} r={4} fill="#fff" />
        <Rect x={98.5} y={106} width={3} height={8} rx={1.5} fill="#fff" />
      </G>

      {/* Animated check badge */}
      <ACircle animatedProps={badgePulse} cx={130} cy={72} r={12} fill={color} />
      <APath
        animatedProps={checkPulse}
        d="M124 72l4 4 8-8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Accents */}
      <ACircle animatedProps={dot1} cx={55} cy={50} r={4} fill={color} />
      <ACircle animatedProps={dot2} cx={150} cy={110} r={3} fill={color} />
      <Circle cx={60} cy={140} r={5} fill={color} opacity={0.1} />
    </Svg>
  );
}
