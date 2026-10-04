import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * FillIn — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function FillIn({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="fillin-fi-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={54} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={47} y={33} width={110} height={148} rx={14} fill="#4338CA" />
        <Rect x={40} y={24} width={110} height={148} rx={14} fill="url(#fillin-fi-c)" stroke={color} strokeWidth={5} />
        <Rect x={54} y={40} width={40} height={8} rx={4} fill={color} />
        <Path d="M54 64H90" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={54} y={72} width={82} height={16} rx={6} fill={color} fillOpacity={0.08} />
        <Rect x={54} y={72} width={82} height={16} rx={6} stroke={color} strokeWidth={2.5} strokeOpacity={0.4} />
        <Path d="M54 98H90" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={54} y={106} width={82} height={16} rx={6} fill={color} fillOpacity={0.08} />
        <Rect x={54} y={106} width={82} height={16} rx={6} stroke={color} strokeWidth={2.5} strokeOpacity={0.4} />
        <Rect x={54} y={136} width={50} height={18} rx={9} fill="#FF6B6B" />
        <G id="anim-float-pencil">
          <Path d="M120 126L170 76" stroke="#4338CA" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M120 126L170 76" stroke="#A855F7" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M114 132L120 126" stroke="#1E293B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M164 82L170 76" stroke="#FDFBF7" strokeWidth={9} strokeOpacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M172 31C174 38 174 38 181 40C174 42 174 42 172 49C170 42 170 42 163 40C170 38 170 38 172 31Z" fill="#A855F7" />
          <Path d="M24 84C25.3 88.7 25.3 88.7 30 90C25.3 91.3 25.3 91.3 24 96C22.7 91.3 22.7 91.3 18 90C22.7 88.7 22.7 88.7 24 84Z" fill={color} />
        </G>
      </Svg>
  );
}
