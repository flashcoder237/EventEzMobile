import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * RsvpConfirmed — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function RsvpConfirmed({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="rsvpconfirmed-rs-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={56} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={49} y={37} width={116} height={146} rx={6} fill="#4338CA" />
        <Rect x={42} y={28} width={116} height={146} rx={6} fill="url(#rsvpconfirmed-rs-c)" stroke={color} strokeWidth={5} />
        <Rect x={52} y={38} width={96} height={126} rx={4} stroke="#F5B841" strokeWidth={2.5} />
        <Path d="M74 62Q100 50 126 62" stroke="#F5B841" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 84H130" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 98H114" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 112H122" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={100} cy={140} r={18} fill="#F5B841" stroke="#FDFBF7" strokeWidth={3.5} />
        <Path id="anim-draw-check" d="M91 140L97 146L110 133" stroke="#FDFBF7" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M162 35C164 42 164 42 171 44C164 46 164 46 162 53C160 46 160 46 153 44C160 42 160 42 162 35Z" fill="#F5B841" />
          <Path d="M32 74C33.3 78.7 33.3 78.7 38 80C33.3 81.3 33.3 81.3 32 86C30.7 81.3 30.7 81.3 26 80C30.7 78.7 30.7 78.7 32 74Z" fill="#A855F7" />
          <Path d="M170 144C171.3 148.7 171.3 148.7 176 150C171.3 151.3 171.3 151.3 170 156C168.7 151.3 168.7 151.3 164 150C168.7 148.7 168.7 148.7 170 144Z" fill="#F5B841" />
        </G>
      </Svg>
  );
}
