import React from 'react';
import Svg, { Path, Rect, Circle, G, Line } from 'react-native-svg';
import { ACircle, APath, usePulse } from '../animated';

type Props = { color?: string; size?: number };

export default function Searching({ color = '#4F46E5', size = 200 }: Props) {
  // Magnifying glass glow pulses
  const glassPulse = usePulse(0.06, 0.18, 2000);
  // Sparkle accents stagger
  const spark1 = usePulse(0.15, 0.45, 1600, 0);
  const spark2 = usePulse(0.1, 0.35, 1800, 400);
  // Glass shine flickers
  const shinePulse = usePulse(0.4, 0.8, 1400, 200);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={95} cy={105} r={75} fill={color} opacity={0.07} />

      {/* Document stack */}
      <Rect x={45} y={60} width={80} height={100} rx={8} fill="#E5E7EB" opacity={0.5} />
      <Rect x={50} y={55} width={80} height={100} rx={8} fill="#F3F4F6" />
      <Rect x={55} y={50} width={80} height={100} rx={8} fill="#fff" stroke="#D1D5DB" strokeWidth={1.5} />

      {/* Document lines */}
      <Rect x={67} y={68} width={48} height={4} rx={2} fill="#D1D5DB" />
      <Rect x={67} y={80} width={56} height={4} rx={2} fill="#E5E7EB" />
      <Rect x={67} y={92} width={40} height={4} rx={2} fill="#E5E7EB" />
      <Rect x={67} y={104} width={52} height={4} rx={2} fill="#E5E7EB" />
      <Rect x={67} y={116} width={32} height={4} rx={2} fill="#E5E7EB" />

      {/* Magnifying glass */}
      <G>
        <ACircle animatedProps={glassPulse} cx={130} cy={110} r={28} fill={color} />
        <Circle cx={130} cy={110} r={22} fill="#fff" stroke={color} strokeWidth={3} />
        <APath
          animatedProps={shinePulse}
          d="M120 100a14 14 0 0 1 14-14"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line x1={147} y1={127} x2={162} y2={142} stroke={color} strokeWidth={4} strokeLinecap="round" />
      </G>

      {/* Sparkle accents */}
      <ACircle animatedProps={spark1} cx={160} cy={85} r={3} fill={color} />
      <ACircle animatedProps={spark2} cx={40} cy={130} r={4} fill={color} />
      <Path d="M170 70l2 5-2 5-2-5z" fill={color} opacity={0.25} />
    </Svg>
  );
}
