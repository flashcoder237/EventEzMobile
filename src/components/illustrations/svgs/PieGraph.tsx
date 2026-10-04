import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * PieGraph — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function PieGraph({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="piegraph-pg-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={98} cy={108} r={58} fill="#4338CA" />
        <Circle cx={92} cy={100} r={58} fill="url(#piegraph-pg-c)" stroke={color} strokeWidth={5} />
        <Path d="M92 100L92 42A58 58 0 0 1 148 114Z" fill={color} />
        <Path d="M92 100L148 114A58 58 0 0 1 64 151Z" fill="#A855F7" fillOpacity={0.7} />
        <G id="anim-float-slice">
          <Path d="M104 92L104 30A62 62 0 0 1 162 66Z" fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" transform="translate(8 -2)" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
          <Path d="M176 154C177.3 158.7 177.3 158.7 182 160C177.3 161.3 177.3 161.3 176 166C174.7 161.3 174.7 161.3 170 160C174.7 158.7 174.7 158.7 176 154Z" fill={color} />
        </G>
      </Svg>
  );
}
