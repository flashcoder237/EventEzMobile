import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Revenue — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Revenue({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="revenue-rv-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={42} y={136} width={22} height={40} rx={6} fill="#4338CA" />
        <Rect x={36} y={130} width={22} height={40} rx={6} fill="url(#revenue-rv-c)" stroke={color} strokeWidth={4} />
        <Rect x={72} y={112} width={22} height={64} rx={6} fill="#4338CA" />
        <Rect x={66} y={106} width={22} height={64} rx={6} fill="url(#revenue-rv-c)" stroke={color} strokeWidth={4} />
        <Rect x={102} y={124} width={22} height={52} rx={6} fill="#4338CA" />
        <Rect x={96} y={118} width={22} height={52} rx={6} fill="url(#revenue-rv-c)" stroke={color} strokeWidth={4} />
        <Rect x={132} y={84} width={22} height={92} rx={6} fill="#4338CA" />
        <Rect x={126} y={78} width={22} height={92} rx={6} fill={color} stroke={color} strokeWidth={4} />
        <Path d="M40 118L76 92L104 104L150 54" stroke="#FF6B6B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M134 52H152V70" stroke="#FF6B6B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-coin">
          <Circle cx={172} cy={120} r={13} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={172} cy={120} r={6.5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
          <Circle cx={172} cy={150} r={13} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={172} cy={150} r={6.5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 42C31.8 48.2 31.8 48.2 38 50C31.8 51.8 31.8 51.8 30 58C28.2 51.8 28.2 51.8 22 50C28.2 48.2 28.2 48.2 30 42Z" fill="#A855F7" />
          <Path d="M180 34C181.3 38.7 181.3 38.7 186 40C181.3 41.3 181.3 41.3 180 46C178.7 41.3 178.7 41.3 174 40C178.7 38.7 178.7 38.7 180 34Z" fill={color} />
        </G>
      </Svg>
  );
}
