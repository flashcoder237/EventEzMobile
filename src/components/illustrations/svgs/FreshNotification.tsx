import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * FreshNotification — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function FreshNotification({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="freshnotification-fn-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={67} y={40} width={80} height={150} rx={16} fill="#4338CA" />
        <Rect x={60} y={30} width={80} height={150} rx={16} fill="url(#freshnotification-fn-c)" stroke={color} strokeWidth={5} />
        <Rect x={68} y={46} width={64} height={120} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={91} y={37} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={88} y={171} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <G id="anim-float-card">
          <Rect x={46} y={54} width={108} height={36} rx={10} fill="#4338CA" transform="translate(4 5)" />
          <Rect x={46} y={54} width={108} height={36} rx={10} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Path d="M60 62H70Q74 62 74 66V69A3 3 0 0 0 74 75V78Q74 82 70 82H60Q56 82 56 78V75A3 3 0 0 0 56 69V66Q56 62 60 62Z" fill="#A855F7" />
          <Path d="M82 66H134" stroke={color} strokeWidth={3.5} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M82 77H114" stroke={color} strokeWidth={3.5} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Path d="M90 124Q92 108 100 106Q108 108 110 124L114 132H86Z" fill={color} />
        <Circle cx={100} cy={138} r={4} fill={color} />
        <Circle cx={112} cy={108} r={6} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={2.5} />
        <G id="anim-wave-ring">
          <Path d="M122 110Q128 120 122 130" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M78 110Q72 120 78 130" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M170 32C171.8 38.2 171.8 38.2 178 40C171.8 41.8 171.8 41.8 170 48C168.2 41.8 168.2 41.8 162 40C168.2 38.2 168.2 38.2 170 32Z" fill="#A855F7" />
          <Path d="M30 124C31.3 128.7 31.3 128.7 36 130C31.3 131.3 31.3 131.3 30 136C28.7 131.3 28.7 131.3 24 130C28.7 128.7 28.7 128.7 30 124Z" fill={color} />
        </G>
      </Svg>
  );
}
