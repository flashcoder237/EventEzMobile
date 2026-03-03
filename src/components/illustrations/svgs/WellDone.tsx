import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { ACircle, APath, ARect, usePulse, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function WellDone({ color = '#7C3AED', size = 200 }: Props) {
  // Trophy checkmark pulses
  const checkPulse = useWaveOpacity(0.7, 1, 1400);
  const checkBg = usePulse(0.1, 0.25, 1600, 200);
  // Confetti dots stagger
  const conf1 = usePulse(0.15, 0.45, 1600, 0);
  const conf2 = usePulse(0.12, 0.4, 1800, 300);
  const conf3 = usePulse(0.08, 0.3, 2000, 600);
  const conf4 = usePulse(0.1, 0.35, 1700, 150);
  // Stars twinkle
  const star1 = usePulse(0.08, 0.25, 2400, 400);
  const star2 = usePulse(0.06, 0.2, 2800, 700);
  // Diamond twinkles
  const d1Pulse = usePulse(0.1, 0.35, 2200, 800);
  const d2Pulse = usePulse(0.08, 0.3, 2600, 1000);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Trophy */}
      <G>
        <Path
          d="M72 60h56v30c0 15.5-12.5 28-28 28s-28-12.5-28-28V60z"
          fill="#fff"
          stroke={color}
          strokeWidth={2}
        />
        <Rect x={68} y={56} width={64} height={8} rx={4} fill={color} opacity={0.2} />
        <Path d="M72 70c-10 0-16 6-16 14s6 14 16 14" stroke={color} strokeWidth={2} fill="none" />
        <Path d="M128 70c10 0 16 6 16 14s-6 14-16 14" stroke={color} strokeWidth={2} fill="none" />
        <Rect x={96} y={118} width={8} height={18} rx={2} fill={color} opacity={0.3} />
        <Rect x={80} y={134} width={40} height={8} rx={4} fill={color} opacity={0.2} />
      </G>

      {/* Animated checkmark */}
      <ACircle animatedProps={checkBg} cx={100} cy={86} r={14} fill={color} />
      <APath
        animatedProps={checkPulse}
        d="M91 86l6 6 12-12"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Animated confetti */}
      <ACircle animatedProps={conf1} cx={55} cy={48} r={4} fill={color} />
      <ACircle animatedProps={conf2} cx={148} cy={44} r={3} fill={color} />
      <ARect animatedProps={conf3} x={42} y={65} width={6} height={6} rx={1} fill={color} />
      <ARect animatedProps={conf4} x={152} y={62} width={5} height={5} rx={1} fill={color} />

      {/* Animated diamonds twinkle */}
      <APath animatedProps={d1Pulse} d="M70 42l2 6-2 6-2-6z" fill={color} />
      <APath animatedProps={d2Pulse} d="M135 38l2 5-2 5-2-5z" fill={color} />

      {/* Animated stars */}
      <APath
        animatedProps={star1}
        d="M50 100l1.5 4.5h4.7l-3.8 2.7 1.4 4.5L50 109l-3.8 2.7 1.4-4.5-3.8-2.7h4.7z"
        fill={color}
      />
      <APath
        animatedProps={star2}
        d="M155 95l1.2 3.5h3.7l-3 2.2 1.1 3.5L155 102l-3 2.2 1.1-3.5-3-2.2h3.7z"
        fill={color}
      />

      <Rect x={55} y={146} width={90} height={2} rx={1} fill="#E5E7EB" />
    </Svg>
  );
}
