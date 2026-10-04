import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Maintenance — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Maintenance({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="maintenance-mt-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={74} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M20 120H180L170 170H30Z" fill="#4338CA" transform="translate(0 7)" />
        <Path d="M20 120H180L170 170H30Z" fill="url(#maintenance-mt-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 132V160" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={38} y={140} width={12} height={8} rx={3} fill={color} />
        <Path d="M64 132V160" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={58} y={134} width={12} height={8} rx={3} fill={color} />
        <Path d="M84 132V160" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={78} y={128} width={12} height={8} rx={3} fill="#FF6B6B" />
        <Path d="M104 132V160" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={98} y={140} width={12} height={8} rx={3} fill={color} />
        <Circle cx={140} cy={146} r={12} stroke="#A855F7" strokeWidth={4} />
        <Path d="M140 146L146 138" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={61} y={49} width={92} height={60} rx={8} fill="#4338CA" />
        <Rect x={54} y={40} width={92} height={60} rx={8} fill="url(#maintenance-mt-c)" stroke={color} strokeWidth={5} />
        <Path d="M68 80L84 66L98 76L130 54" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M30 120C22 100 40 92 34 70M170 120C178 104 160 96 168 76" stroke={color} strokeWidth={4} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-leds">
          <Circle cx={150} cy={132} r={3} fill="#FF6B6B" />
          <Circle cx={160} cy={132} r={3} fill="#A855F7" />
          <Circle cx={170} cy={132} r={3} fill={color} />
        </G>
        <Path d="M74 24Q100 4 126 24" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={66} y={22} width={12} height={18} rx={5} fill="#4338CA" />
        <Rect x={122} y={22} width={12} height={18} rx={5} fill="#4338CA" />
      </Svg>
  );
}
