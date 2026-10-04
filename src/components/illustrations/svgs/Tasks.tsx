import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Tasks — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Tasks({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="tasks-tk-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={72} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={21} y={39} width={172} height={140} rx={14} fill="#4338CA" />
        <Rect x={14} y={30} width={172} height={140} rx={14} fill="url(#tasks-tk-c)" stroke={color} strokeWidth={5} />
        <Rect x={26} y={42} width={42} height={8} rx={4} fill={color} />
        <Rect x={26} y={58} width={42} height={28} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={2.5} strokeOpacity={0.5} />
        <Path d="M33 68H59" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M33 77H49" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={26} y={92} width={42} height={28} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={2.5} strokeOpacity={0.5} />
        <Path d="M33 102H59" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M33 111H49" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={26} y={126} width={42} height={28} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={2.5} strokeOpacity={0.5} />
        <Path d="M33 136H59" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M33 145H49" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={80} y={42} width={42} height={8} rx={4} fill="#A855F7" />
        <Rect x={80} y={58} width={42} height={28} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={2.5} strokeOpacity={0.5} />
        <Path d="M87 68H113" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M87 77H103" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={80} y={92} width={42} height={28} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={2.5} strokeOpacity={0.5} />
        <Path d="M87 102H113" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M87 111H103" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={134} y={42} width={42} height={8} rx={4} fill="#FF6B6B" />
        <Rect x={134} y={58} width={42} height={28} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={2.5} strokeOpacity={0.5} />
        <Path d="M141 68H167" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M141 77H157" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-card">
          <G transform="rotate(6 156 150)">
            <Rect x={136} y={134} width={44} height={28} rx={6} fill="#FDFBF7" stroke="#FF6B6B" strokeWidth={3} />
            <Path d="M146 148L152 154L164 142" stroke="#FF6B6B" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          </G>
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M186 15C187.5 20.5 187.5 20.5 193 22C187.5 23.5 187.5 23.5 186 29C184.5 23.5 184.5 23.5 179 22C184.5 20.5 184.5 20.5 186 15Z" fill="#A855F7" />
          <Path d="M14 178C15.3 182.7 15.3 182.7 20 184C15.3 185.3 15.3 185.3 14 190C12.7 185.3 12.7 185.3 8 184C12.7 182.7 12.7 182.7 14 178Z" fill={color} />
        </G>
      </Svg>
  );
}
