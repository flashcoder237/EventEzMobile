import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * CalendarPermission — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function CalendarPermission({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="calendarpermission-cl-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={47} y={49} width={116} height={124} rx={12} fill="#4338CA" />
        <Rect x={40} y={40} width={116} height={124} rx={12} fill="url(#calendarpermission-cl-c)" stroke={color} strokeWidth={5} />
        <Path d="M40 52Q40 40 52 40H144Q156 40 156 52V62H40Z" fill={color} />
        <Path d="M70.2 31V48M125.8 31V48" stroke="#4338CA" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={60.9} cy={78} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={85.8} cy={78} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={110.8} cy={78} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={135.7} cy={78} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={60.9} cy={102.7} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={85.8} cy={102.7} r={3.5} fill={color} fillOpacity={0.2} />
        <Rect x={102.8} y={94.7} width={16} height={16} rx={5} fill="#FF6B6B" />
        <Circle cx={135.7} cy={102.7} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={60.9} cy={127.3} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={85.8} cy={127.3} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={110.8} cy={127.3} r={3.5} fill={color} fillOpacity={0.2} />
        <Circle cx={135.7} cy={127.3} r={3.5} fill={color} fillOpacity={0.2} />
        <G id="anim-float-ticket">
          <G transform="rotate(14 150 140)">
            <Path d="M130 124H157A5 5 0 0 0 167 124H174Q180 124 180 130V150Q180 156 174 156H167A5 5 0 0 0 157 156H130Q124 156 124 150V130Q124 124 130 124Z" fill="#A855F7" />
            <Path d="M136 134H154M136 144H148" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </G>
        </G>
        <Path d="M132 128L138 120" stroke="#1E293B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M174 32C175.8 38.2 175.8 38.2 182 40C175.8 41.8 175.8 41.8 174 48C172.2 41.8 172.2 41.8 166 40C172.2 38.2 172.2 38.2 174 32Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
