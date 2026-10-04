import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TicketInPocket — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TicketInPocket({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="ticketinpocket-tp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <G id="anim-slide-ticket">
          <Path d="M77 18H123Q132 18 132 27V54A6 6 0 0 0 132 66V105Q132 114 123 114H77Q68 114 68 105V66A6 6 0 0 0 68 54V27Q68 18 77 18Z" fill="#4338CA" transform="translate(6 6)" />
          <Path d="M77 18H123Q132 18 132 27V54A6 6 0 0 0 132 66V105Q132 114 123 114H77Q68 114 68 105V66A6 6 0 0 0 68 54V27Q68 18 77 18Z" fill="#FDFBF7" stroke={color} strokeWidth={5} strokeLinejoin="round" />
          <Rect x={78} y={26} width={12} height={12} rx={3} stroke={color} strokeWidth={3} />
          <Rect x={82} y={30} width={4} height={4} rx={1} fill={color} />
          <Rect x={102} y={26} width={12} height={12} rx={3} stroke={color} strokeWidth={3} />
          <Rect x={106} y={30} width={4} height={4} rx={1} fill={color} />
          <Rect x={78} y={44} width={4} height={4} rx={1} fill={color} />
          <Rect x={86} y={44} width={4} height={4} rx={1} fill={color} />
          <Rect x={102} y={44} width={4} height={4} rx={1} fill={color} />
          <Rect x={110} y={48} width={4} height={4} rx={1} fill={color} />
          <Rect x={118} y={40} width={4} height={4} rx={1} fill="#FF6B6B" />
          <Path d="M80 60H120" stroke={color} strokeOpacity={0.45} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 5" />
          <Path d="M80 70H110" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" />
        </G>
        <Rect x={63} y={82} width={84} height={104} rx={16} fill="#4338CA" />
        <Rect x={56} y={72} width={84} height={104} rx={16} fill="url(#ticketinpocket-tp-c)" stroke={color} strokeWidth={5} />
        <Path d="M70 74H126" stroke={color} strokeWidth={5} strokeLinecap="round" />
        <Rect x={66} y={86} width={64} height={74} rx={8} fill={color} fillOpacity={0.07} />
        <Circle cx={98} cy={114} r={17} fill={color} fillOpacity={0.14} />
        <Path id="anim-draw-check" d="M90 114L96 120L107 108" stroke={color} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M80 144H116" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <Rect x={86} y={166} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <G id="anim-twinkle-sparkles">
          <Path d="M160 35C162 42 162 42 169 44C162 46 162 46 160 53C158 46 158 46 151 44C158 42 158 42 160 35Z" fill="#A855F7" />
          <Path d="M38 52C39.3 56.7 39.3 56.7 44 58C39.3 59.3 39.3 59.3 38 64C36.7 59.3 36.7 59.3 32 58C36.7 56.7 36.7 56.7 38 52Z" fill={color} />
        </G>
      </Svg>
  );
}
