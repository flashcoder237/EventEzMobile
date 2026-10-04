import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * EmailCapture — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function EmailCapture({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="emailcapture-ec-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={59} y={43} width={96} height={66} rx={10} fill="#4338CA" />
        <Rect x={52} y={34} width={96} height={66} rx={10} fill="url(#emailcapture-ec-c)" stroke={color} strokeWidth={5} />
        <Path d="M58 40L94 68.3Q100 72.3 106 68.3L142 40" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={26} y={124} width={150} height={40} rx={20} fill="#4338CA" />
        <Rect x={20} y={116} width={150} height={40} rx={20} fill="url(#emailcapture-ec-c)" stroke={color} strokeWidth={5} />
        <Path d="M40 136H102" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={122} y={122} width={42} height={28} rx={14} fill="#FF6B6B" />
        <Path d="M134 136H150M144 130L150 136L144 142" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-plane">
          <Path d="M150 40.8L180.6 30L169.8 57L164.4 46.2Z" fill="#FDFBF7" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M164.4 46.2L180.6 30" stroke="#A855F7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 52C31.8 58.2 31.8 58.2 38 60C31.8 61.8 31.8 61.8 30 68C28.2 61.8 28.2 61.8 22 60C28.2 58.2 28.2 58.2 30 52Z" fill="#A855F7" />
          <Path d="M180 90C181.3 94.7 181.3 94.7 186 96C181.3 97.3 181.3 97.3 180 102C178.7 97.3 178.7 97.3 174 96C178.7 94.7 178.7 94.7 180 90Z" fill={color} />
        </G>
      </Svg>
  );
}
