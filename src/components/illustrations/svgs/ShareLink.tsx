import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ShareLink — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ShareLink({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="sharelink-sk-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={172} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <G opacity={0.6} transform="rotate(-35 68 108)">
          <Rect x={34} y={92} width={68} height={32} rx={16} stroke="#4338CA" strokeWidth={10} />
        </G>
        <G transform="rotate(-35 64 104)">
          <Rect x={30} y={88} width={68} height={32} rx={16} stroke={color} strokeWidth={10} />
        </G>
        <G transform="rotate(-35 118 72)">
          <Rect x={84} y={56} width={68} height={32} rx={16} stroke="#A855F7" strokeWidth={10} />
        </G>
        <Circle cx={150} cy={136} r={22} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <Path d="M142 136H158M152 130L158 136L152 142" stroke="#FDFBF7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-dots">
          <Circle cx={40} cy={48} r={4} fill="#A855F7" />
          <Circle cx={54} cy={40} r={4} fill="#A855F7" />
          <Circle cx={68} cy={34} r={4} fill="#A855F7" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M174 32C175.8 38.2 175.8 38.2 182 40C175.8 41.8 175.8 41.8 174 48C172.2 41.8 172.2 41.8 166 40C172.2 38.2 172.2 38.2 174 32Z" fill="#A855F7" />
          <Path d="M24 144C25.3 148.7 25.3 148.7 30 150C25.3 151.3 25.3 151.3 24 156C22.7 151.3 22.7 151.3 18 150C22.7 148.7 22.7 148.7 24 144Z" fill={color} />
        </G>
      </Svg>
  );
}
