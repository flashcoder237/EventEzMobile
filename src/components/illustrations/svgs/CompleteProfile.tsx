import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * CompleteProfile — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function CompleteProfile({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="completeprofile-cp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={50} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={100} cy={96} r={58} stroke="#E5E7EB" strokeWidth={10} />
        <Path d="M100 38A58 58 0 1 1 46 118" stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={100} cy={96} r={44} fill="url(#completeprofile-cp-c)" />
        <Path d="M100 96m-44 0a44 44 0 0 0 88 0Z" fill="#A855F7" fillOpacity={0.15} />
        <Circle cx={100} cy={82} r={14} fill={color} />
        <Path d="M74 126Q76 104 100 102Q124 104 126 126Z" fill="#FF6B6B" />
        <G id="anim-pulse-dot">
          <Circle cx={46} cy={118} r={8} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M168 31C170 38 170 38 177 40C170 42 170 42 168 49C166 42 166 42 159 40C166 38 166 38 168 31Z" fill="#A855F7" />
          <Path d="M30 34C31.3 38.7 31.3 38.7 36 40C31.3 41.3 31.3 41.3 30 46C28.7 41.3 28.7 41.3 24 40C28.7 38.7 28.7 38.7 30 34Z" fill={color} />
        </G>
      </Svg>
  );
}
