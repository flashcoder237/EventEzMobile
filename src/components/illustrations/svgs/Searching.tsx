import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Searching — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Searching({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="searching-se-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={30} y={38} width={96} height={30} rx={9} stroke={color} strokeWidth={3.5} strokeOpacity={0.5} />
        <Circle cx={46} cy={53} r={6} fill={color} fillOpacity={0.35} />
        <Path d="M60 53H100" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <Rect x={30} y={78} width={96} height={30} rx={9} stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeDasharray="3 7" strokeLinecap="round" />
        <Rect x={30} y={118} width={96} height={30} rx={9} stroke={color} strokeWidth={3.5} strokeOpacity={0.35} strokeDasharray="3 7" strokeLinecap="round" />
        <Path d="M136 132L166 162" stroke="#4338CA" strokeWidth={16} strokeLinecap="round" />
        <Path d="M144 140L162 158" stroke={color} strokeWidth={9} strokeLinecap="round" />
        <Circle cx={114} cy={110} r={36} fill="#4338CA" transform="translate(5 6)" />
        <Circle cx={114} cy={110} r={34} fill="url(#searching-se-c)" stroke={color} strokeWidth={7} />
        <Path d="M94 98Q98 84 112 80" stroke={color} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={114} cy={112} r={7} fill="#FF6B6B" />
        <G id="anim-pulse-dots">
          <Circle cx={100} cy={112} r={3} fill={color} fillOpacity={0.5} />
          <Circle cx={128} cy={112} r={3} fill={color} fillOpacity={0.5} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M170 39C172 46 172 46 179 48C172 50 172 50 170 57C168 50 168 50 161 48C168 46 168 46 170 39Z" fill="#A855F7" />
          <Path d="M160 77C161.1 80.9 161.1 80.9 165 82C161.1 83.1 161.1 83.1 160 87C158.9 83.1 158.9 83.1 155 82C158.9 80.9 158.9 80.9 160 77Z" fill={color} />
        </G>
      </Svg>
  );
}
