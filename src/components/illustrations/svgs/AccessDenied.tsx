import React from 'react';
import Svg, { Path, Rect, Circle, G, Line } from 'react-native-svg';
import { ALine, ACircle, APath, usePulse, useWaveOpacity } from '../animated';

type Props = { color?: string; size?: number };

export default function AccessDenied({ color = '#7C3AED', size = 200 }: Props) {
  // X mark pulses
  const xPulse = useWaveOpacity(0.6, 1, 1200);
  // Shield inner glow
  const shieldGlow = usePulse(0.03, 0.08, 2400);
  // X circle ring pulses
  const ringPulse = usePulse(0.08, 0.2, 1800, 200);
  // Prohibition lines
  const pLine1 = usePulse(0.1, 0.3, 1600, 0);
  const pLine2 = usePulse(0.1, 0.3, 1600, 300);
  // Accent dots
  const dot1 = usePulse(0.08, 0.25, 2200, 400);
  const dot2 = usePulse(0.06, 0.2, 2600, 600);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Shield */}
      <Path
        d="M100 35l55 24v44c0 33-22 60-55 70-33-10-55-37-55-70V59l55-24z"
        fill="#fff"
        stroke={color}
        strokeWidth={2}
      />
      <APath
        animatedProps={shieldGlow}
        d="M100 35l55 24v44c0 33-22 60-55 70V35z"
        fill={color}
      />

      {/* Animated circle + X */}
      <ACircle animatedProps={ringPulse} cx={100} cy={95} r={26} fill={color} />
      <Circle cx={100} cy={95} r={20} fill="#fff" stroke={color} strokeWidth={2} />
      <ALine animatedProps={xPulse} x1={90} y1={85} x2={110} y2={105} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <ALine animatedProps={xPulse} x1={110} y1={85} x2={90} y2={105} stroke={color} strokeWidth={3} strokeLinecap="round" />

      {/* Animated prohibition lines */}
      <APath animatedProps={pLine1} d="M62 55l-8-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <APath animatedProps={pLine2} d="M138 55l8-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />

      {/* Accents */}
      <ACircle animatedProps={dot1} cx={45} cy={80} r={4} fill={color} />
      <ACircle animatedProps={dot2} cx={158} cy={75} r={3} fill={color} />
      <Circle cx={100} cy={170} r={5} fill={color} opacity={0.1} />
    </Svg>
  );
}
