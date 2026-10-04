import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Percentages — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Percentages({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="percentages-pc-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M58 40H130L170 80L106 150L40 90V58Q40 40 58 40Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M58 40H130L170 80L106 150L40 90V58Q40 40 58 40Z" fill="url(#percentages-pc-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={62} cy={62} r={7} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={92} cy={82} r={8} stroke={color} strokeWidth={5} />
        <Circle cx={122} cy={112} r={8} stroke={color} strokeWidth={5} />
        <Path d="M128 76L86 118" stroke="#FF6B6B" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-coin">
          <Circle cx={164} cy={150} r={14} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={164} cy={150} r={7} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M174 32C175.8 38.2 175.8 38.2 182 40C175.8 41.8 175.8 41.8 174 48C172.2 41.8 172.2 41.8 166 40C172.2 38.2 172.2 38.2 174 32Z" fill="#A855F7" />
          <Path d="M26 134C27.3 138.7 27.3 138.7 32 140C27.3 141.3 27.3 141.3 26 146C24.7 141.3 24.7 141.3 20 140C24.7 138.7 24.7 138.7 26 134Z" fill={color} />
        </G>
      </Svg>
  );
}
