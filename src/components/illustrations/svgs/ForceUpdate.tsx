import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ForceUpdate — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ForceUpdate({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="forceupdate-fu-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={67} y={40} width={80} height={150} rx={16} fill="#4338CA" />
        <Rect x={60} y={30} width={80} height={150} rx={16} fill="url(#forceupdate-fu-c)" stroke={color} strokeWidth={5} />
        <Rect x={68} y={46} width={64} height={120} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={91} y={37} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={88} y={171} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Circle cx={100} cy={98} r={28} fill={color} fillOpacity={0.14} />
        <Path d="M100 80V112M88 102L100 114L112 102" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={76} y={136} width={48} height={12} rx={6} fill={color} fillOpacity={0.15} />
        <Rect x={76} y={136} width={30} height={12} rx={6} fill="#FF6B6B" />
        <G id="anim-twinkle-sparkles">
          <Path d="M150 44C152.6 53.4 152.6 53.4 162 56C152.6 58.6 152.6 58.6 150 68C147.4 58.6 147.4 58.6 138 56C147.4 53.4 147.4 53.4 150 44Z" fill="#A855F7" />
          <Path d="M168 77C169.5 82.5 169.5 82.5 175 84C169.5 85.5 169.5 85.5 168 91C166.5 85.5 166.5 85.5 161 84C166.5 82.5 166.5 82.5 168 77Z" fill="#FF6B6B" />
          <Path d="M40 63C41.5 68.5 41.5 68.5 47 70C41.5 71.5 41.5 71.5 40 77C38.5 71.5 38.5 71.5 33 70C38.5 68.5 38.5 68.5 40 63Z" fill={color} />
        </G>
      </Svg>
  );
}
