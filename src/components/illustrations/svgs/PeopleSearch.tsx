import React from 'react';
import Svg, { Path, Rect, Circle, G, Line } from 'react-native-svg';
import { ACircle, APath, usePulse, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function PeopleSearch({ color = '#7C3AED', size = 200 }: Props) {
  // Center person highlight pulses
  const personPulse = usePulse(0.15, 0.35, 2000);
  // Lens glow
  const lensPulse = usePulse(0.7, 0.95, 1600, 200);
  // Question mark fades
  const qPulse = useWaveOpacity(0.5, 1, 1400, 400);
  // Accent dots
  const dot1 = usePulse(0.08, 0.25, 2400, 0);
  const dot2 = usePulse(0.06, 0.2, 2800, 500);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={105} r={75} fill={color} opacity={0.06} />

      {/* Person 1 (left) */}
      <Circle cx={65} cy={90} r={14} fill="#E5E7EB" />
      <Path d="M45 130c0-11 9-20 20-20h0c11 0 20 9 20 20v8H45v-8z" fill="#E5E7EB" />

      {/* Person 2 (center, animated highlight) */}
      <ACircle animatedProps={personPulse} cx={100} cy={82} r={16} fill={color} />
      <Path d="M78 126c0-12.2 9.8-22 22-22h0c12.2 0 22 9.8 22 22v10H78v-10z" fill={color} opacity={0.2} />

      {/* Person 3 (right) */}
      <Circle cx={135} cy={90} r={14} fill="#E5E7EB" />
      <Path d="M115 130c0-11 9-20 20-20h0c11 0 20 9 20 20v8h-40v-8z" fill="#E5E7EB" />

      {/* Magnifying glass */}
      <G>
        <ACircle animatedProps={lensPulse} cx={140} cy={75} r={24} fill="#fff" stroke={color} strokeWidth={2.5} />
        <Path d="M130 65a14 14 0 0 1 14-4" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        <Line x1={158} y1={93} x2={170} y2={105} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Animated question mark */}
        <APath
          animatedProps={qPulse}
          d="M136 70c0-3.3 2.7-6 6-6s6 2.7 6 6c0 2.5-1.5 4-3.5 5l-1.5 1v2"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={143} cy={82} r={1.2} fill={color} />
      </G>

      <Rect x={35} y={138} width={130} height={2} rx={1} fill="#E5E7EB" />

      <ACircle animatedProps={dot1} cx={40} cy={65} r={3} fill={color} />
      <ACircle animatedProps={dot2} cx={165} cy={120} r={4} fill={color} />
    </Svg>
  );
}
