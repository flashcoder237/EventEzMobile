import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Report — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Report({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="report-rp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={182} rx={54} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M54 22H136L152 38V158Q152 168 142 168H54Q44 168 44 158V32Q44 22 54 22Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M54 22H136L152 38V158Q152 168 142 168H54Q44 168 44 158V32Q44 22 54 22Z" fill="url(#report-rp-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M136 22V38H152" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={58} y={40} width={42} height={8} rx={4} fill={color} />
        <Circle cx={80} cy={86} r={22} fill={color} fillOpacity={0.15} />
        <Path d="M80 86V64A22 22 0 0 1 101 92Z" fill={color} />
        <Path d="M80 86L101 92A22 22 0 0 1 64 101Z" fill="#A855F7" />
        <Path d="M112 76H138" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M112 88H130" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M112 100H134" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={60} y={138} width={10} height={14} rx={3} fill={color} fillOpacity={0.6} />
        <Rect x={76} y={128} width={10} height={24} rx={3} fill={color} fillOpacity={0.6} />
        <Rect x={92} y={134} width={10} height={18} rx={3} fill={color} fillOpacity={0.6} />
        <Rect x={108} y={122} width={10} height={30} rx={3} fill={color} fillOpacity={0.6} />
        <Rect x={124} y={130} width={10} height={22} rx={3} fill={color} fillOpacity={0.6} />
        <G id="anim-pulse-dot">
          <Circle cx={152} cy={30} r={10} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M176 72C177.8 78.2 177.8 78.2 184 80C177.8 81.8 177.8 81.8 176 88C174.2 81.8 174.2 81.8 168 80C174.2 78.2 174.2 78.2 176 72Z" fill="#A855F7" />
          <Path d="M24 114C25.3 118.7 25.3 118.7 30 120C25.3 121.3 25.3 121.3 24 126C22.7 121.3 22.7 121.3 18 120C22.7 118.7 22.7 118.7 24 114Z" fill={color} />
        </G>
      </Svg>
  );
}
