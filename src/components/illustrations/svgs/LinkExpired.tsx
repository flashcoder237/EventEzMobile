import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * LinkExpired — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function LinkExpired({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="linkexpired-le-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-35 66 112)">
          <Rect x={30} y={96} width={70} height={32} rx={16} stroke={color} strokeWidth={10} />
        </G>
        <G transform="rotate(-35 136 82)">
          <Rect x={102} y={66} width={70} height={32} rx={16} stroke="#A855F7" strokeWidth={10} />
        </G>
        <Path d="M96 76L88 66M104 70L104 58M108 82L120 80" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-clock">
          <Circle cx={150} cy={146} r={22} fill="#FDFBF7" stroke={color} strokeWidth={4.5} />
          <Path d="M150 133.9V146L158.8 151.5" stroke={color} strokeWidth={4.0} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M36 42C37.8 48.2 37.8 48.2 44 50C37.8 51.8 37.8 51.8 36 58C34.2 51.8 34.2 51.8 28 50C34.2 48.2 34.2 48.2 36 42Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
