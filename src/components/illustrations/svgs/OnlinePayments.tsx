import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { ACircle, APath, usePulse, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function OnlinePayments({ color = '#7C3AED', size = 200 }: Props) {
  // Checkmark on phone pulses
  const checkCircle = usePulse(0.12, 0.3, 1600, 200);
  const checkMark = useWaveOpacity(0.7, 1, 1400, 400);
  // Coin dots float/pulse
  const coin1 = usePulse(0.06, 0.2, 2400, 0);
  const coin2 = usePulse(0.05, 0.18, 2800, 400);
  // Sparkle accents
  const spark1 = usePulse(0.08, 0.25, 2200, 200);
  const spark2 = usePulse(0.1, 0.3, 2000, 600);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Credit card */}
      <G>
        <Rect x={30} y={65} width={110} height={70} rx={10} fill="#fff" stroke={color} strokeWidth={2} />
        <Rect x={30} y={82} width={110} height={14} fill={color} opacity={0.15} />
        <Rect x={44} y={72} width={16} height={12} rx={2} fill={color} opacity={0.4} />
        <Rect x={48} y={74} width={8} height={8} rx={1} fill={color} opacity={0.2} />
        {/* Card number dots */}
        {[0, 1, 2, 3].map((g) => (
          <G key={g}>
            {[0, 1, 2, 3].map((d) => (
              <Circle
                key={d}
                cx={46 + g * 24 + d * 5}
                cy={108}
                r={1.5}
                fill={g === 3 ? color : '#9CA3AF'}
                opacity={g === 3 ? 0.6 : 0.4}
              />
            ))}
          </G>
        ))}
        <Rect x={44} y={118} width={40} height={3} rx={1.5} fill="#D1D5DB" />
        <Rect x={100} y={118} width={24} height={3} rx={1.5} fill="#D1D5DB" />
      </G>

      {/* Phone */}
      <G>
        <Rect x={125} y={50} width={48} height={90} rx={10} fill="#fff" stroke={color} strokeWidth={2} />
        <Rect x={130} y={62} width={38} height={60} rx={4} fill={color} opacity={0.08} />
        <Rect x={141} y={54} width={16} height={4} rx={2} fill="#E5E7EB" />
        {/* Animated checkmark */}
        <ACircle animatedProps={checkCircle} cx={149} cy={86} r={12} fill={color} />
        <APath
          animatedProps={checkMark}
          d="M143 86l4 4 8-8"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect x={138} y={105} width={22} height={4} rx={2} fill={color} opacity={0.3} />
        <Rect x={141} y={130} width={16} height={3} rx={1.5} fill="#D1D5DB" />
      </G>

      {/* Sparkle accents */}
      <ACircle animatedProps={spark1} cx={40} cy={50} r={4} fill={color} />
      <ACircle animatedProps={spark2} cx={165} cy={155} r={3} fill={color} />

      {/* Animated coins */}
      <ACircle animatedProps={coin1} cx={55} cy={155} r={10} fill={color} />
      <Circle cx={55} cy={155} r={6} fill={color} opacity={0.08} />
      <ACircle animatedProps={coin2} cx={72} cy={160} r={8} fill={color} />
      <Circle cx={72} cy={160} r={5} fill={color} opacity={0.06} />
    </Svg>
  );
}
