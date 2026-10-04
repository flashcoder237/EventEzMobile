import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TeamInvitation — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TeamInvitation({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="teaminvitation-ti-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={37} y={95} width={140} height={86} rx={10} fill="#4338CA" />
        <Rect x={30} y={86} width={140} height={86} rx={10} fill="url(#teaminvitation-ti-c)" stroke={color} strokeWidth={5} />
        <Path d="M36 92L94 130.7Q100 135.9 106 130.7L164 92" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-card">
          <Rect x={56} y={34} width={88} height={60} rx={8} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={80} cy={56} r={7} fill="#A855F7" />
          <Path d="M66.7 79.1Q66.7 66.2 80 66.2Q93.3 66.2 93.3 79.1Z" fill="#A855F7" />
          <Circle cx={100} cy={52} r={8} fill={color} />
          <Path d="M84.8 78.4Q84.8 63.6 100 63.6Q115.2 63.6 115.2 78.4Z" fill={color} />
          <Circle cx={120} cy={56} r={7} fill="#A855F7" />
          <Path d="M106.7 79.1Q106.7 66.2 120 66.2Q133.3 66.2 133.3 79.1Z" fill="#A855F7" />
        </G>
        <Circle cx={150} cy={100} r={12} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3.5} />
        <Path d="M150 94V106M144 100H156" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M30 42C31.8 48.2 31.8 48.2 38 50C31.8 51.8 31.8 51.8 30 58C28.2 51.8 28.2 51.8 22 50C28.2 48.2 28.2 48.2 30 42Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
