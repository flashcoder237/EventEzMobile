import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * LeadsEmpty — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function LeadsEmpty({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="leadsempty-ld-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-10 70 100)">
          <Rect x={37} y={69} width={76} height={100} rx={10} fill="#4338CA" />
          <Rect x={30} y={60} width={76} height={100} rx={10} fill="url(#leadsempty-ld-c)" stroke={color} strokeWidth={5} />
          <Rect x={56} y={66} width={24} height={6} rx={3} fill={color} fillOpacity={0.4} />
          <Circle cx={68} cy={96} r={13} fill={color} fillOpacity={0.3} />
          <Path d="M46 126H90" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M46 137H76" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Rect x={103} y={101} width={86} height={54} rx={8} fill="#4338CA" />
        <Rect x={96} y={92} width={86} height={54} rx={8} fill="url(#leadsempty-ld-c)" stroke={color} strokeWidth={5} />
        <Circle cx={116} cy={112} r={8} fill="#A855F7" />
        <Path d="M130 108H168" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M130 119H156" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-wave-scan">
          <Path d="M92 76L120 60M124 76L120 60" stroke="#FF6B6B" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={140} cy={52} r={10} stroke="#FF6B6B" strokeWidth={3.5} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M176 33C177.5 38.5 177.5 38.5 183 40C177.5 41.5 177.5 41.5 176 47C174.5 41.5 174.5 41.5 169 40C174.5 38.5 174.5 38.5 176 33Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
