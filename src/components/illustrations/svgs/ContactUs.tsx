import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ContactUs — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ContactUs({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="contactus-cu-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={56} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M44 34H138Q156 34 156 52V102Q156 120 138 120H86L60 142L64 120H44Q26 120 26 102V52Q26 34 44 34Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M44 34H138Q156 34 156 52V102Q156 120 138 120H86L60 142L64 120H44Q26 120 26 102V52Q26 34 44 34Z" fill="url(#contactus-cu-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 60C70 56 74 54 77 55L83 58C85 59 86 62 84 64L80 68C83 75 89 81 96 84L100 80C102 78 105 79 106 81L109 87C110 90 108 94 104 94C84 94 70 80 70 60Z" fill={color} />
        <Path d="M118 66H136" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M118 78H130" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={118} y={128} width={60} height={40} rx={10} fill="url(#contactus-cu-c)" stroke={color} strokeWidth={4} />
        <Path d="M124 134L142 148.8Q148 151.2 154 148.8L172 134" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-dot">
          <Circle cx={176} cy={128} r={9} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M26 143C27.5 148.5 27.5 148.5 33 150C27.5 151.5 27.5 151.5 26 157C24.5 151.5 24.5 151.5 19 150C24.5 148.5 24.5 148.5 26 143Z" fill="#A855F7" />
          <Path d="M176 24C177.3 28.7 177.3 28.7 182 30C177.3 31.3 177.3 31.3 176 36C174.7 31.3 174.7 31.3 170 30C174.7 28.7 174.7 28.7 176 24Z" fill={color} />
        </G>
      </Svg>
  );
}
