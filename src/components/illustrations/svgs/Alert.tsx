import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Alert — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Alert({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="alert-al-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={50} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M78 141L70 174M122 141L130 174" stroke="#4338CA" strokeWidth={6} strokeLinecap="round" />
        <Path d="M92 40Q100 27 108 40L159 128Q166 141 151 141H49Q34 141 41 128Z" fill="#4338CA" transform="translate(7 10)" />
        <Path d="M92 40Q100 27 108 40L159 128Q166 141 151 141H49Q34 141 41 128Z" fill="url(#alert-al-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M100 70V104" stroke={color} strokeWidth={10} strokeLinecap="round" />
        <Circle cx={100} cy={122} r={6.5} fill="#FF6B6B" />
        <Path d="M58 124L94 62" stroke="#FDFBF7" strokeOpacity={0.9} strokeWidth={3} strokeLinecap="round" />
        <G id="anim-float-dots">
          <Circle cx={164} cy={64} r={6} fill="#A855F7" fillOpacity={0.8} />
          <Circle cx={178} cy={44} r={3.5} fill={color} fillOpacity={0.6} />
          <Circle cx={30} cy={70} r={4.5} fill={color} fillOpacity={0.45} />
        </G>
        <Path d="M150 92C162 84 170 74 172 60" stroke={color} strokeOpacity={0.4} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 7" />
      </Svg>
  );
}
