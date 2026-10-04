import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * LostTicket — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function LostTicket({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="lostticket-lt-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={72} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M26 64L74 50L126 64L174 50L174 150L126 164L74 150L26 164Z" fill="#4338CA" transform="translate(6 9)" />
        <Path d="M26 64L74 50L126 64L174 50L174 150L126 164L74 150L26 164Z" fill="url(#lostticket-lt-c)" />
        <Path d="M74 50L126 64V164L74 150Z" fill={color} fillOpacity={0.08} />
        <Path d="M126 64L174 50V150L126 164Z" fill={color} fillOpacity={0.03} />
        <Path d="M30 102C46 98 54 116 70 110M126 90C140 96 150 84 170 88M80 130C96 136 108 124 122 132" stroke="#E5E7EB" strokeWidth={4} strokeLinecap="round" />
        <Path d="M40 148C52 126 66 136 82 118C94 104 98 100 106 98" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="2 7" />
        <Path d="M26 64L74 50L126 64L174 50L174 150L126 164L74 150L26 164Z" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M74 50V150M126 64V164" stroke={color} strokeOpacity={0.5} strokeWidth={3} />
        <Path d="M110 100C102 92 98 86 98 80A12 12 0 0 1 122 80C122 86 118 92 110 100Z" stroke="#A855F7" strokeWidth={3.5} strokeDasharray="3 5" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={40} cy={148} r={5} fill={color} />
        <G id="anim-float-ticket">
          <G transform="rotate(18 158 26)">
            <Path d="M139 12H161A5 5 0 0 0 171 12H177Q184 12 184 19V35Q184 42 177 42H171A5 5 0 0 0 161 42H139Q132 42 132 35V19Q132 12 139 12Z" fill="#FF6B6B" />
            <Path d="M166 18V36" stroke="#FDFBF7" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 4" />
            <Path d="M140 22H156M140 31H150" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" />
          </G>
        </G>
        <Path d="M126 44C120 48 116 56 118 64" stroke="#FF6B6B" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 6" />
      </Svg>
  );
}
