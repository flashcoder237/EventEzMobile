import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * SecurityOn — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function SecurityOn({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="securityon-so-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={52} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M100 26L152 48.4V93.2C152 132.4 122.9 154.8 100 166C77.1 154.8 48 132.4 48 93.2V48.4Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M100 26L152 48.4V93.2C152 132.4 122.9 154.8 100 166C77.1 154.8 48 132.4 48 93.2V48.4Z" fill="url(#securityon-so-c)" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M100 42L138 58.6V91.9C138 121 116.7 137.7 100 146C83.3 137.7 62 121 62 91.9V58.6Z" fill={color} fillOpacity={0.1} />
        <Path d="M86 98V86A14 14 0 0 1 114 86V98" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={78} y={96} width={44} height={36} rx={9} fill={color} />
        <Circle cx={100} cy={112} r={5} fill="#FF6B6B" />
        <Path d="M100 114V122" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-wave-ring">
          <Path d="M38 72Q30 96 38 120" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M162 72Q170 96 162 120" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M168 30C169.8 36.2 169.8 36.2 176 38C169.8 39.8 169.8 39.8 168 46C166.2 39.8 166.2 39.8 160 38C166.2 36.2 166.2 36.2 168 30Z" fill="#A855F7" />
          <Path d="M30 154C31.3 158.7 31.3 158.7 36 160C31.3 161.3 31.3 161.3 30 166C28.7 161.3 28.7 161.3 24 160C28.7 158.7 28.7 158.7 30 154Z" fill={color} />
        </G>
      </Svg>
  );
}
