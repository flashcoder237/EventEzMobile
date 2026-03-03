import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { ACircle, ARect, usePulse, usePulseR } from '../animated';

type Props = { color?: string; size?: number };

export default function NewMessage({ color = '#7C3AED', size = 200 }: Props) {
  // Notification dot pulses (scale)
  const dotPulse = usePulseR(8, 10, 1200);
  // Reply bubble fades gently
  const replyPulse = usePulse(0.12, 0.2, 2200, 400);
  // Sparkle dots
  const spark1 = usePulse(0.08, 0.25, 2000, 0);
  const spark2 = usePulse(0.1, 0.3, 1800, 600);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={78} fill={color} opacity={0.06} />

      {/* Main chat bubble */}
      <G>
        <Path
          d="M40 70c0-8.8 7.2-16 16-16h68c8.8 0 16 7.2 16 16v44c0 8.8-7.2 16-16 16H80l-20 18v-18H56c-8.8 0-16-7.2-16-16V70z"
          fill="#fff"
          stroke={color}
          strokeWidth={2}
        />
        <Rect x={58} y={80} width={50} height={4} rx={2} fill={color} opacity={0.3} />
        <Rect x={58} y={92} width={64} height={4} rx={2} fill="#E5E7EB" />
        <Rect x={58} y={104} width={38} height={4} rx={2} fill="#E5E7EB" />
      </G>

      {/* Secondary chat bubble — animated opacity */}
      <G>
        <Path
          d="M90 105c0-6.6 5.4-12 12-12h52c6.6 0 12 5.4 12 12v32c0 6.6-5.4 12-12 12h-8v14l-16-14h-28c-6.6 0-12-5.4-12-12v-32z"
          fill={color}
          opacity={0.15}
        />
        <Path
          d="M90 105c0-6.6 5.4-12 12-12h52c6.6 0 12 5.4 12 12v32c0 6.6-5.4 12-12 12h-8v14l-16-14h-28c-6.6 0-12-5.4-12-12v-32z"
          stroke={color}
          strokeWidth={1.5}
          fill="none"
        />
        <Rect x={104} y={114} width={42} height={4} rx={2} fill={color} opacity={0.3} />
        <Rect x={104} y={124} width={30} height={4} rx={2} fill={color} opacity={0.2} />
      </G>

      {/* Animated notification dot */}
      <ACircle animatedProps={dotPulse} cx={145} cy={60} fill={color} />
      <ARect animatedProps={replyPulse} x={142} y={57} width={6} height={6} rx={1} fill="#fff" />

      {/* Sparkles */}
      <ACircle animatedProps={spark1} cx={35} cy={55} r={4} fill={color} />
      <ACircle animatedProps={spark2} cx={170} cy={100} r={3} fill={color} />
    </Svg>
  );
}
