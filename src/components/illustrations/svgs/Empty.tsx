import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Empty — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Empty({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="empty-ep-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="empty-ep-s" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#E4DDD0" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={170} rx={60} ry={6} fill={color} fillOpacity={0.12} />
        <Path d="M44 96L100 78L156 96L100 114Z" fill="#4338CA" />
        <Path d="M44 96L100 78L84 52L26 70Z" fill="url(#empty-ep-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M100 78L156 96L176 72L118 54Z" fill="url(#empty-ep-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M44 96L100 114V168L44 150Z" fill="url(#empty-ep-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M100 114L156 96V150L100 168Z" fill="url(#empty-ep-s)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M58 118L86 127" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <Path d="M100 96C96 76 108 56 124 44" stroke={color} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 7" />
        <G id="anim-float-ticket">
          <Path d="M130 18H149.5A4.5 4.5 0 0 0 158.5 18H162Q168 18 168 24V38Q168 44 162 44H158.5A4.5 4.5 0 0 0 149.5 44H130Q124 44 124 38V24Q124 18 130 18Z" fill="#FF6B6B" transform="rotate(-16 146 31)" />
          <Path d="M154 22L157 38" stroke="#FDFBF7" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 4" transform="rotate(-16 146 31)" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M34 33C35.5 38.5 35.5 38.5 41 40C35.5 41.5 35.5 41.5 34 47C32.5 41.5 32.5 41.5 27 40C32.5 38.5 32.5 38.5 34 33Z" fill="#A855F7" />
          <Path d="M176 122C177.3 126.7 177.3 126.7 182 128C177.3 129.3 177.3 129.3 176 134C174.7 129.3 174.7 129.3 170 128C174.7 126.7 174.7 126.7 176 122Z" fill={color} />
        </G>
      </Svg>
  );
}
