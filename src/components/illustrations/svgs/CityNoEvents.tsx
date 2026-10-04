import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * CityNoEvents — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function CityNoEvents({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="citynoevents-ce-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={74} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={25} y={39} width={164} height={140} rx={16} fill="#4338CA" />
        <Rect x={18} y={30} width={164} height={140} rx={16} fill="url(#citynoevents-ce-c)" stroke={color} strokeWidth={5} />
        <Path d="M18 90H182M90 30V170M18 140C60 130 120 150 182 120" stroke="#E5E7EB" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 70C42 62 41 58 41 54A9 9 0 0 1 59 54C59 58 58 62 50 70Z" fill={color} fillOpacity={0.25} />
        <Path d="M140 74C132 66 131 62 131 58A9 9 0 0 1 149 58C149 62 148 66 140 74Z" fill={color} fillOpacity={0.25} />
        <Path d="M130 160C122 152 121 148 121 144A9 9 0 0 1 139 144C139 148 138 152 130 160Z" fill={color} fillOpacity={0.25} />
        <G id="anim-wave-radius">
          <Circle cx={96} cy={104} r={40} stroke="#A855F7" strokeWidth={3.5} strokeDasharray="3 8" />
        </G>
        <Path d="M96 104L132 68M124 68H132V76" stroke="#FF6B6B" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={96} cy={104} r={7} fill={color} stroke="#FDFBF7" strokeWidth={3} />
      </Svg>
  );
}
