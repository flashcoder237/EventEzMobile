import React from 'react';
import Svg, { Path, Rect, Circle, Ellipse } from 'react-native-svg';
import { ACircle, APath, usePulse, useFloatY } from '../animated';

type Props = { color?: string; size?: number };

export default function Empty({ color = '#4F46E5', size = 200 }: Props) {
  // Floating particles drift upward
  const p1 = useFloatY(75, 6, 2800, 0);
  const p2 = useFloatY(60, 5, 3200, 400);
  const p3 = useFloatY(55, 7, 2600, 800);
  // Top particle pulses
  const topPulse = usePulse(0.1, 0.3, 2000, 200);
  // Diamond twinkle
  const diamondPulse = usePulse(0.1, 0.35, 1600);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Ellipse cx={100} cy={165} rx={55} ry={8} fill="#E5E7EB" opacity={0.5} />
      <Circle cx={100} cy={100} r={72} fill={color} opacity={0.06} />

      {/* Box body */}
      <Path d="M55 95l45 18 45-18v55l-45 15-45-15z" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth={1.5} />
      <Path d="M55 95l45 18v55l-45-15z" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={1.5} />
      <Path d="M145 95l-45 18v55l45-15z" fill="#fff" stroke="#D1D5DB" strokeWidth={1.5} />

      {/* Box lids */}
      <Path d="M55 95l-12-18 45-14 12 19z" fill={color} opacity={0.2} stroke={color} strokeWidth={1} />
      <Path d="M145 95l12-18-45-14-12 19z" fill={color} opacity={0.15} stroke={color} strokeWidth={1} />

      <Path d="M100 113v55" stroke="#D1D5DB" strokeWidth={1} strokeDasharray="4 3" />

      {/* Animated floating particles */}
      <ACircle animatedProps={p1} cx={100} r={4} fill={color} opacity={0.2} />
      <ACircle animatedProps={p2} cx={85} r={2.5} fill={color} opacity={0.15} />
      <ACircle animatedProps={p3} cx={115} r={3} fill={color} opacity={0.12} />
      {/* Diamond twinkle */}
      <APath animatedProps={diamondPulse} d="M100 42l2.5 7-2.5 7-2.5-7z" fill={color} />
    </Svg>
  );
}
