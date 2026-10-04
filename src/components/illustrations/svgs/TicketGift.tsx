import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TicketGift — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TicketGift({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="ticketgift-tg-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={66} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M42 70H118A8 8 0 0 0 134 70H158Q170 70 170 82V130Q170 142 158 142H134A8 8 0 0 0 118 142H42Q30 142 30 130V82Q30 70 42 70Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M42 70H118A8 8 0 0 0 134 70H158Q170 70 170 82V130Q170 142 158 142H134A8 8 0 0 0 118 142H42Q30 142 30 130V82Q30 70 42 70Z" fill="url(#ticketgift-tg-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M126 82V130" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 5" />
        <Path d="M44 92H84" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 106H98" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 120H74" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={140} y={70} width={12} height={72} rx={0} fill="#FF6B6B" fillOpacity={0.9} />
        <G id="anim-float-bow">
          <Path d="M146 70C138 48 116 54 126 68Z" fill="#FF6B6B" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M146 70C154 48 176 54 166 68Z" fill="#FF6B6B" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={146} cy={70} r={6} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={2.5} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M40 31C42 38 42 38 49 40C42 42 42 42 40 49C38 42 38 42 31 40C38 38 38 38 40 31Z" fill="#A855F7" />
          <Path d="M176 154C177.3 158.7 177.3 158.7 182 160C177.3 161.3 177.3 161.3 176 166C174.7 161.3 174.7 161.3 170 160C174.7 158.7 174.7 158.7 176 154Z" fill={color} />
          <Path d="M100 24C101.3 28.7 101.3 28.7 106 30C101.3 31.3 101.3 31.3 100 36C98.7 31.3 98.7 31.3 94 30C98.7 28.7 98.7 28.7 100 24Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
