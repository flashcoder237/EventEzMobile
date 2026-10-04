import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Schedule — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Schedule({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="schedule-sc-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={37} y={39} width={120} height={140} rx={14} fill="#4338CA" />
        <Rect x={30} y={30} width={120} height={140} rx={14} fill="url(#schedule-sc-c)" stroke={color} strokeWidth={5} />
        <Path d="M56 48V156" stroke={color} strokeWidth={3} strokeOpacity={0.25} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={56} cy={56} r={7} fill={color} stroke="#FDFBF7" strokeWidth={3} />
        <Rect x={70} y={44} width={66} height={24} rx={8} fill={color} fillOpacity={0.1} />
        <Path d="M80 56H116" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={56} cy={92} r={7} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3} />
        <Rect x={70} y={80} width={66} height={24} rx={8} fill={color} fillOpacity={0.9} />
        <Path d="M80 92H116" stroke="#FDFBF7" strokeWidth={3.5} strokeOpacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={56} cy={128} r={7} fill={color} stroke="#FDFBF7" strokeWidth={3} />
        <Rect x={70} y={116} width={66} height={24} rx={8} fill={color} fillOpacity={0.1} />
        <Path d="M80 128H116" stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-clock">
          <Circle cx={154} cy={52} r={22} fill="#FDFBF7" stroke={color} strokeWidth={4.5} />
          <Path d="M154 39.9V52L162.8 57.5" stroke={color} strokeWidth={4.0} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M182 112C183.8 118.2 183.8 118.2 190 120C183.8 121.8 183.8 121.8 182 128C180.2 121.8 180.2 121.8 174 120C180.2 118.2 180.2 118.2 182 112Z" fill="#A855F7" />
          <Path d="M20 94C21.3 98.7 21.3 98.7 26 100C21.3 101.3 21.3 101.3 20 106C18.7 101.3 18.7 101.3 14 100C18.7 98.7 18.7 98.7 20 94Z" fill={color} />
        </G>
      </Svg>
  );
}
