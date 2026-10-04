import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * EmailPending — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function EmailPending({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="emailpending-ep2-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={180} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={33} y={79} width={116} height={80} rx={10} fill="#4338CA" />
        <Rect x={26} y={70} width={116} height={80} rx={10} fill="url(#emailpending-ep2-c)" stroke={color} strokeWidth={5} />
        <Path d="M32 76L78 111.6Q84 116.4 90 111.6L136 76" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-turn-hourglass">
          <Path d="M150 40Q150 62 162 70Q150 78 150 100H178Q178 78 166 70Q178 62 178 40Z" fill="#FDFBF7" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M155 48H173Q170 60 164 64Q158 60 155 48Z" fill="#FF6B6B" />
          <Path d="M154 96Q157 86 164 84Q171 86 174 96Z" fill="#FF6B6B" />
          <Path d="M144 39H184M144 101H184" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
