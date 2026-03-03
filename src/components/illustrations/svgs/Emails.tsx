import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { ACircle, APath, usePulse, usePulseR, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function Emails({ color = '#7C3AED', size = 200 }: Props) {
  // Notification badge pulses (scale)
  const badgePulse = usePulseR(12, 14, 1200);
  // Checkmark in badge
  const checkPulse = useWaveOpacity(0.7, 1, 1200, 200);
  // Send arrow hints pulse
  const arrow1 = usePulse(0.06, 0.2, 1800, 0);
  const arrow2 = usePulse(0.06, 0.2, 1800, 300);
  // Floating dots
  const dot1 = usePulse(0.08, 0.25, 2200, 400);
  const dot2 = usePulse(0.06, 0.2, 2600, 600);
  const dot3 = usePulse(0.05, 0.18, 3000, 200);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Stack envelope */}
      <Rect x={48} y={68} width={110} height={72} rx={10} fill="#E5E7EB" opacity={0.5} />

      {/* Main envelope */}
      <G>
        <Rect x={38} y={62} width={120} height={80} rx={10} fill="#fff" stroke={color} strokeWidth={2} />
        <Path d="M40 68l55 38a8 8 0 0 0 9 0l55-38" stroke={color} strokeWidth={2} fill="none" />
        <Path d="M40 68l55 38a8 8 0 0 0 9 0l55-38" fill={color} opacity={0.05} />
      </G>

      {/* Letter peeking out */}
      <Rect x={55} y={48} width={86} height={36} rx={6} fill="#fff" stroke={color} strokeWidth={1.5} />
      <Rect x={65} y={56} width={46} height={3} rx={1.5} fill={color} opacity={0.3} />
      <Rect x={65} y={64} width={60} height={3} rx={1.5} fill="#E5E7EB" />
      <Rect x={65} y={72} width={38} height={3} rx={1.5} fill="#E5E7EB" />

      {/* Animated notification badge */}
      <ACircle animatedProps={badgePulse} cx={148} cy={58} fill={color} />
      <APath
        animatedProps={checkPulse}
        d="M144 58l3 3 6-6"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Animated send arrows */}
      <APath animatedProps={arrow1} d="M30 150l8-5 4 8z" fill={color} />
      <APath animatedProps={arrow2} d="M165 150l-8-5-4 8z" fill={color} />

      {/* Animated floating dots */}
      <ACircle animatedProps={dot1} cx={30} cy={85} r={4} fill={color} />
      <ACircle animatedProps={dot2} cx={172} cy={100} r={3} fill={color} />
      <ACircle animatedProps={dot3} cx={100} cy={165} r={5} fill={color} />
    </Svg>
  );
}
