import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * CheckinWelcome — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function CheckinWelcome({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="checkinwelcome-cw-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={74} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M30 178V70Q30 30 70 30H130Q170 30 170 70V178" stroke="#4338CA" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M30 178V70Q30 30 70 30H130Q170 30 170 70V178" stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={54} cy={56} r={4} fill="#FDFBF7" />
        <Circle cx={78} cy={46} r={4} fill="#A855F7" />
        <Circle cx={100} cy={46} r={4} fill="#FF6B6B" />
        <Circle cx={122} cy={46} r={4} fill="#FF6B6B" />
        <Circle cx={146} cy={56} r={4} fill="#A855F7" />
        <G transform="rotate(-8 100 120)">
          <Rect x={52} y={104} width={96} height={34} rx={17} fill="#FF6B6B" />
          <Rect x={70} y={112} width={36} height={18} rx={5} fill="#FDFBF7" />
          <Path d="M78 121H98" stroke="#FF6B6B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={130} cy={121} r={5} fill="#FDFBF7" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M60 75C62 82 62 82 69 84C62 86 62 86 60 93C58 86 58 86 51 84C58 82 58 82 60 75Z" fill="#A855F7" />
          <Path d="M146 81C147.5 86.5 147.5 86.5 153 88C147.5 89.5 147.5 89.5 146 95C144.5 89.5 144.5 89.5 139 88C144.5 86.5 144.5 86.5 146 81Z" fill={color} />
          <Path d="M100 154C101.3 158.7 101.3 158.7 106 160C101.3 161.3 101.3 161.3 100 166C98.7 161.3 98.7 161.3 94 160C98.7 158.7 98.7 158.7 100 154Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
