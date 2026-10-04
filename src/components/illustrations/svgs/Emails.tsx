import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Emails — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Emails({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="emails-em-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={104} cy={172} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-8 100 110)">
          <Rect x={40} y={62} width={104} height={70} rx={10} fill="url(#emails-em-c)" stroke="#4338CA" strokeWidth={4} />
        </G>
        <Rect x={64} y={48} width={76} height={74} rx={8} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Path d="M76 64H118M76 76H128M76 88H108" stroke={color} strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
        <Rect x={56} y={96} width={120} height={74} rx={12} fill="#4338CA" />
        <Path d="M48 98Q48 86 60 86H156Q168 86 168 98V150Q168 162 156 162H60Q48 162 48 150Z" fill="url(#emails-em-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M52 92L102 128Q108 132 114 128L164 92" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M52 158L90 124M164 158L126 124" stroke={color} strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={166} cy={88} r={11} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <G id="anim-float-plane">
          <Path d="M18 52L52 40L40 70L34 58Z" fill="#FDFBF7" stroke="#A855F7" strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M34 58L52 40" stroke="#A855F7" strokeWidth={3} strokeLinecap="round" />
        </G>
        <Path d="M30 76C26 92 32 104 44 110" stroke="#A855F7" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 7" />
      </Svg>
  );
}
