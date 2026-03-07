import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { APath, ACircle, usePulse } from '../animated';

type Props = { color?: string; size?: number };

export default function SaveToBookmarks({ color = '#4F46E5', size = 200 }: Props) {
  // Heart pulses (heartbeat)
  const heartPulse = usePulse(0.6, 1, 1200);
  // Floating star dots twinkle staggered
  const star1 = usePulse(0.1, 0.35, 2000, 0);
  const star2 = usePulse(0.08, 0.28, 2400, 400);
  const star3 = usePulse(0.06, 0.22, 2200, 800);
  // Diamond twinkle
  const diamondPulse = usePulse(0.08, 0.28, 2600, 1000);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Main bookmark */}
      <Path
        d="M60 45h80c4.4 0 8 3.6 8 8v110l-48-30-48 30V53c0-4.4 3.6-8 8-8z"
        fill="#fff"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M100 133l-40 25V53c0-4.4 3.6-8 8-8h32v88z" fill={color} opacity={0.04} />

      {/* Animated heart */}
      <APath
        animatedProps={heartPulse}
        d="M100 100l-2.8-2.5C88 89.2 82 83.7 82 77c0-5.5 4.5-10 10-10 3.1 0 6.1 1.4 8 3.7 1.9-2.3 4.9-3.7 8-3.7 5.5 0 10 4.5 10 10 0 6.7-6 12.2-15.2 20.5L100 100z"
        fill={color}
      />

      {/* Lines on bookmark */}
      <Rect x={75} y={55} width={50} height={3} rx={1.5} fill="#E5E7EB" />
      <Rect x={80} y={64} width={40} height={3} rx={1.5} fill="#E5E7EB" />

      {/* Animated floating stars */}
      <ACircle animatedProps={star1} cx={48} cy={60} r={4} fill={color} />
      <ACircle animatedProps={star2} cx={155} cy={55} r={3} fill={color} />
      <ACircle animatedProps={star3} cx={152} cy={120} r={5} fill={color} />
      <APath animatedProps={diamondPulse} d="M45 110l3 6-3 6-3-6z" fill={color} />
    </Svg>
  );
}
