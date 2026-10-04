import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * AccessDenied — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function AccessDenied({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="accessdenied-ad-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Path d="M48 168V78C48 48 72 28 100 28C128 28 152 48 152 78V168" fill={color} fillOpacity={0.08} stroke={color} strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
        <Path d="M30 168H170" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <Ellipse cx={100} cy={160} rx={44} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M76 96V74C76 60 87 50 100 50C113 50 124 60 124 74V96" stroke="#4338CA" strokeWidth={12} strokeLinecap="round" />
        <Path d="M76 96V74C76 60 87 50 100 50C113 50 124 60 124 74V96" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <Path d="M81 78C81 66 88 58 96 56" stroke="#FDFBF7" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
        <Rect x={70} y={96} width={72} height={62} rx={14} fill="#4338CA" />
        <Rect x={62} y={88} width={76} height={62} rx={14} fill="url(#accessdenied-ad-c)" stroke={color} strokeWidth={5} />
        <Path d="M72 100H128" stroke={color} strokeOpacity={0.12} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={100} cy={114} r={8} fill="#FF6B6B" />
        <Path d="M100 118V132" stroke="#FF6B6B" strokeWidth={7} strokeLinecap="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M160 43C162 50 162 50 169 52C162 54 162 54 160 61C158 54 158 54 151 52C158 50 158 50 160 43Z" fill="#A855F7" />
          <Path d="M40 92C41.3 96.7 41.3 96.7 46 98C41.3 99.3 41.3 99.3 40 104C38.7 99.3 38.7 99.3 34 98C38.7 96.7 38.7 96.7 40 92Z" fill={color} />
          <Path d="M146 21C147.1 24.9 147.1 24.9 151 26C147.1 27.1 147.1 27.1 146 31C144.9 27.1 144.9 27.1 141 26C144.9 24.9 144.9 24.9 146 21Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
