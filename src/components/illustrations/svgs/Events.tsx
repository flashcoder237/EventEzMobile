import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { ACircle, ARect, usePulse, useFloatY } from '../animated';

type Props = { color?: string; size?: number };

export default function Events({ color = '#4F46E5', size = 200 }: Props) {
  // Highlighted day cell pulses
  const dayPulse = usePulse(0.7, 1, 1400);
  // Accent star pulses
  const starPulse = usePulse(0.2, 0.5, 2000, 300);
  // Floating dots drift
  const dot1Float = useFloatY(140, 5, 2800, 0);
  const dot2Float = useFloatY(90, 4, 3200, 500);
  const dot3Float = useFloatY(50, 6, 2600, 200);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={105} r={80} fill={color} opacity={0.08} />

      {/* Calendar body */}
      <Rect x={40} y={55} width={120} height={105} rx={12} fill="#fff" stroke={color} strokeWidth={2} />
      <Rect x={40} y={55} width={120} height={30} rx={12} fill={color} />
      <Rect x={40} y={73} width={120} height={12} fill={color} />
      <Rect x={70} y={48} width={4} height={16} rx={2} fill={color} />
      <Rect x={126} y={48} width={4} height={16} rx={2} fill={color} />
      <Rect x={60} y={62} width={36} height={4} rx={2} fill="#fff" opacity={0.9} />

      {/* Day grid */}
      {[0, 1, 2, 3, 4].map((col) =>
        [0, 1, 2, 3].map((row) => {
          const isHighlighted = col === 2 && row === 1;
          return isHighlighted ? (
            <ARect
              key={`${col}-${row}`}
              animatedProps={dayPulse}
              x={54 + col * 22}
              y={96 + row * 15}
              width={14}
              height={10}
              rx={3}
              fill={color}
            />
          ) : (
            <Rect
              key={`${col}-${row}`}
              x={54 + col * 22}
              y={96 + row * 15}
              width={14}
              height={10}
              rx={3}
              fill="#E5E7EB"
              opacity={0.6}
            />
          );
        }),
      )}

      {/* Animated accent star */}
      <ACircle animatedProps={starPulse} cx={152} cy={52} r={10} fill={color} />
      <Path
        d="M152 44l1.8 5.5h5.8l-4.7 3.4 1.8 5.5-4.7-3.4-4.7 3.4 1.8-5.5-4.7-3.4h5.8z"
        fill={color}
        opacity={0.5}
      />

      {/* Floating dots */}
      <ACircle animatedProps={dot1Float} cx={38} r={4} fill={color} opacity={0.15} />
      <ACircle animatedProps={dot2Float} cx={168} r={3} fill={color} opacity={0.2} />
      <ACircle animatedProps={dot3Float} cx={50} r={5} fill={color} opacity={0.1} />
    </Svg>
  );
}
