import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * LocationPermission — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function LocationPermission({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="locationpermission-lp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M22 70L70 54L130 70L178 54V158L130 174L70 158L22 174Z" fill="#4338CA" transform="translate(5 7)" />
        <Path d="M22 70L70 54L130 70L178 54V158L130 174L70 158L22 174Z" fill="url(#locationpermission-lp-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 54V158M130 70V174" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M30 120C60 110 90 140 170 104" stroke="#E5E7EB" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-ring">
          <Circle cx={100} cy={130} r={20} fill="#FF6B6B" fillOpacity={0.2} />
          <Circle cx={100} cy={130} r={32} stroke="#FF6B6B" strokeWidth={2.5} strokeOpacity={0.4} />
        </G>
        <Path d="M100 132C88 118 80 108 80 96A20 20 0 0 1 120 96C120 108 112 118 100 132Z" fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={100} cy={96} r={7} fill="#FDFBF7" />
        <G id="anim-twinkle-sparkles">
          <Path d="M172 22C173.8 28.2 173.8 28.2 180 30C173.8 31.8 173.8 31.8 172 38C170.2 31.8 170.2 31.8 164 30C170.2 28.2 170.2 28.2 172 22Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
