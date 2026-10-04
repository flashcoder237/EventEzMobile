import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BiometricLock — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BiometricLock({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="biometriclock-bl-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={67} y={36} width={80} height={150} rx={16} fill="#4338CA" />
        <Rect x={60} y={26} width={80} height={150} rx={16} fill="url(#biometriclock-bl-c)" stroke={color} strokeWidth={5} />
        <Rect x={68} y={42} width={64} height={120} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={91} y={33} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={88} y={167} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Circle cx={100} cy={98} r={30} fill={color} fillOpacity={0.12} />
        <Path d="M92 101.2A8 8 0 0 1 108 101.2" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M86 103.6A14 14 0 0 1 114 103.6" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M80 106.0A20 20 0 0 1 120 106.0" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M74 108.4A26 26 0 0 1 126 108.4" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M100 92V112" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-wave-scan">
          <Path d="M70 98H130" stroke="#FF6B6B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Path d="M146 132V124A10 10 0 0 1 166 124V132" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={140} y={130} width={32} height={26} rx={7} fill="#A855F7" />
        <Circle cx={156} cy={143} r={4} fill="#FDFBF7" />
        <G id="anim-twinkle-sparkles">
          <Path d="M36 48C37.8 54.2 37.8 54.2 44 56C37.8 57.8 37.8 57.8 36 64C34.2 57.8 34.2 57.8 28 56C34.2 54.2 34.2 54.2 36 48Z" fill="#A855F7" />
          <Path d="M170 34C171.3 38.7 171.3 38.7 176 40C171.3 41.3 171.3 41.3 170 46C168.7 41.3 168.7 41.3 164 40C168.7 38.7 168.7 38.7 170 34Z" fill={color} />
        </G>
      </Svg>
  );
}
