import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * AcceptTasks — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function AcceptTasks({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="accepttasks-at-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={56} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={47} y={39} width={104} height={140} rx={12} fill="#4338CA" />
        <Rect x={40} y={30} width={104} height={140} rx={12} fill="url(#accepttasks-at-c)" stroke={color} strokeWidth={5} />
        <Rect x={54} y={49} width={18} height={18} rx={5} fill={color} />
        <Path d="M58 58L62 62L68 55" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M82 58H130" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={54} y={83} width={18} height={18} rx={5} fill={color} />
        <Path d="M58 92L62 96L68 89" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M82 92H130" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={54} y={117} width={18} height={18} rx={5} fill="#FDFBF7" stroke="#FF6B6B" strokeWidth={3.5} />
        <Path d="M82 126H118" stroke={color} strokeWidth={4} strokeOpacity={0.2} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-badge">
          <Circle cx={150} cy={140} r={22} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
          <Path d="M140 140L147 147L160 133" stroke="#FDFBF7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M170 45C172 52 172 52 179 54C172 56 172 56 170 63C168 56 168 56 161 54C168 52 168 52 170 45Z" fill="#A855F7" />
          <Path d="M26 106C27.3 110.7 27.3 110.7 32 112C27.3 113.3 27.3 113.3 26 118C24.7 113.3 24.7 113.3 20 112C24.7 110.7 24.7 110.7 26 106Z" fill={color} />
        </G>
      </Svg>
  );
}
