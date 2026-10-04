import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Conference — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Conference({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="conference-co-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="conference-co-b" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#A855F7" stopOpacity={0.28} />
            <Stop offset={1} stopColor="#A855F7" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Path d="M24 92L50 100M176 92L150 100" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" />
        <Rect x={40} y={22} width={128} height={72} rx={10} fill="#4338CA" />
        <Rect x={34} y={16} width={128} height={72} rx={10} fill="url(#conference-co-c)" stroke={color} strokeWidth={5} />
        <Path d="M52 70V58M66 70V48M80 70V54" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <Path d="M98 60C106 46 120 44 128 52C134 58 140 50 146 40" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" />
        <Circle cx={146} cy={40} r={5} fill="#FF6B6B" />
        <Path d="M100 88L66 186H134Z" fill="url(#conference-co-b)" />
        <Circle cx={100} cy={112} r={11} fill={color} />
        <Path d="M80 146C80 130 89 124 100 124C111 124 120 130 120 146" fill={color} />
        <Path d="M117 142L124 126" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" />
        <Circle cx={125} cy={123} r={4.5} fill="#4338CA" />
        <Ellipse cx={100} cy={184} rx={40} ry={4} fill={color} fillOpacity={0.12} />
        <Path d="M74 140H126L120 182H80Z" fill="#4338CA" transform="translate(6 2)" />
        <Path d="M74 140H126L120 182H80Z" fill="url(#conference-co-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M80 152H120" stroke={color} strokeOpacity={0.2} strokeWidth={4} strokeLinecap="round" />
        <G id="anim-pulse-heads">
          <Circle cx={34} cy={168} r={8} fill={color} fillOpacity={0.3} />
          <Circle cx={166} cy={168} r={8} fill={color} fillOpacity={0.3} />
        </G>
      </Svg>
  );
}
