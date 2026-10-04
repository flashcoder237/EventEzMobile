import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Selecting — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Selecting({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="selecting-sl-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-8 54 108)">
          <Rect x={31} y={75} width={60} height={84} rx={12} fill="#4338CA" />
          <Rect x={24} y={66} width={60} height={84} rx={12} fill="url(#selecting-sl-c)" stroke={color} strokeWidth={5} />
          <Circle cx={54} cy={96} r={12} fill={color} fillOpacity={0.3} />
          <Path d="M40 126H68" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G transform="rotate(0 100 94)">
          <Rect x={77} y={61} width={60} height={84} rx={12} fill="#4338CA" />
          <Rect x={70} y={52} width={60} height={84} rx={12} fill="url(#selecting-sl-c)" stroke="#FF6B6B" strokeWidth={5} />
          <Circle cx={100} cy={82} r={12} fill="#A855F7" />
          <Path d="M86 112H114" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G transform="rotate(8 146 108)">
          <Rect x={123} y={75} width={60} height={84} rx={12} fill="#4338CA" />
          <Rect x={116} y={66} width={60} height={84} rx={12} fill="url(#selecting-sl-c)" stroke={color} strokeWidth={5} />
          <Circle cx={146} cy={96} r={12} fill={color} fillOpacity={0.3} />
          <Path d="M132 126H160" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Path d="M118 134L118 172L128 162L136 178L144 174L136 158L150 158Z" fill={color} stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-star">
          <Path d="M100 24L102.6 30.4L109.5 30.9L104.3 35.4L105.9 42.1L100 38.5L94.1 42.1L95.7 35.4L90.5 30.9L97.4 30.4Z" fill="#FF6B6B" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
          <Path d="M176 34C177.3 38.7 177.3 38.7 182 40C177.3 41.3 177.3 41.3 176 46C174.7 41.3 174.7 41.3 170 40C174.7 38.7 174.7 38.7 176 34Z" fill={color} />
        </G>
      </Svg>
  );
}
