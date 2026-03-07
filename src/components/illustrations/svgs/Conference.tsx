import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { APath, ACircle, useWaveOpacity, usePulse } from '../animated';

type Props = { color?: string; size?: number };

export default function Conference({ color = '#4F46E5', size = 200 }: Props) {
  // Sound waves pulse outward in sequence
  const wave1 = useWaveOpacity(0.15, 0.5, 1000, 0);
  const wave2 = useWaveOpacity(0.1, 0.4, 1000, 300);
  const wave3 = useWaveOpacity(0.1, 0.35, 1000, 600);
  // Mic glow
  const micPulse = usePulse(0.6, 1, 1600);
  // Sparkle dots
  const spark1 = usePulse(0.1, 0.3, 2200, 200);
  const spark2 = usePulse(0.08, 0.25, 2600, 500);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={105} r={78} fill={color} opacity={0.06} />

      {/* Stage */}
      <Path d="M35 150h130l-10-40H45z" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={1.5} />
      <Rect x={45} y={110} width={110} height={8} rx={4} fill={color} opacity={0.15} />

      {/* Podium */}
      <Rect x={75} y={100} width={50} height={50} rx={6} fill="#fff" stroke={color} strokeWidth={1.5} />
      <Rect x={90} y={112} width={20} height={3} rx={1.5} fill={color} opacity={0.4} />
      <Rect x={85} y={120} width={30} height={3} rx={1.5} fill="#E5E7EB" />
      <Rect x={88} y={128} width={24} height={3} rx={1.5} fill="#E5E7EB" />

      {/* Microphone */}
      <G>
        <Rect x={97} y={68} width={6} height={22} rx={3} fill="#6B7280" />
        <ACircle animatedProps={micPulse} cx={100} cy={64} r={8} fill={color} />
        <Circle cx={100} cy={64} r={5} fill={color} opacity={0.7} />
        <Rect x={96} y={60} width={8} height={1} rx={0.5} fill="#fff" opacity={0.4} />
        <Rect x={96} y={63} width={8} height={1} rx={0.5} fill="#fff" opacity={0.4} />
        <Rect x={96} y={66} width={8} height={1} rx={0.5} fill="#fff" opacity={0.4} />
        <Rect x={99} y={90} width={2} height={10} fill="#9CA3AF" />
        <Rect x={93} y={98} width={14} height={3} rx={1.5} fill="#9CA3AF" />
      </G>

      {/* Animated sound waves */}
      <APath animatedProps={wave1} d="M115 58a18 18 0 0 1 0 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={wave2} d="M120 54a26 26 0 0 1 0 20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={wave3} d="M85 58a18 18 0 0 0 0 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />

      {/* Audience dots */}
      <Circle cx={50} cy={165} r={5} fill="#D1D5DB" />
      <Circle cx={70} cy={168} r={5} fill="#D1D5DB" />
      <Circle cx={90} cy={170} r={5} fill="#D1D5DB" />
      <Circle cx={110} cy={170} r={5} fill="#D1D5DB" />
      <Circle cx={130} cy={168} r={5} fill="#D1D5DB" />
      <Circle cx={150} cy={165} r={5} fill="#D1D5DB" />

      <ACircle animatedProps={spark1} cx={155} cy={55} r={3} fill={color} />
      <ACircle animatedProps={spark2} cx={42} cy={80} r={4} fill={color} />
    </Svg>
  );
}
