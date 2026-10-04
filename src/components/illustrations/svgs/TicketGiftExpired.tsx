import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TicketGiftExpired — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TicketGiftExpired({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="ticketgiftexpired-tx-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={66} ry={5} fill={color} fillOpacity={0.12} />
        <G opacity={0.55}>
          <Path d="M42 70H118A8 8 0 0 0 134 70H158Q170 70 170 82V130Q170 142 158 142H134A8 8 0 0 0 118 142H42Q30 142 30 130V82Q30 70 42 70Z" fill="#4338CA" transform="translate(7 9)" />
          <Path d="M42 70H118A8 8 0 0 0 134 70H158Q170 70 170 82V130Q170 142 158 142H134A8 8 0 0 0 118 142H42Q30 142 30 130V82Q30 70 42 70Z" fill="url(#ticketgiftexpired-tx-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M126 82V130" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 5" />
          <Path d="M44 92H84" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M44 106H98" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M44 120H74" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Path d="M140 70V142" stroke="#FF6B6B" strokeWidth={10} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-clock">
          <Circle cx={150} cy={58} r={22} fill="#FDFBF7" stroke="#A855F7" strokeWidth={4.5} />
          <Path d="M150 45.9V58L158.8 63.5" stroke="#A855F7" strokeWidth={4.0} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M36 37C37.5 42.5 37.5 42.5 43 44C37.5 45.5 37.5 45.5 36 51C34.5 45.5 34.5 45.5 29 44C34.5 42.5 34.5 42.5 36 37Z" fill={color} />
        </G>
      </Svg>
  );
}
