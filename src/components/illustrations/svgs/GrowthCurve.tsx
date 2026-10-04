import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * GrowthCurve — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function GrowthCurve({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="growthcurve-gc-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M24 170V140H58V114H92V88H126V62H160V170Z" fill="#4338CA" transform="translate(6 6)" />
        <Path d="M24 170V140H58V114H92V88H126V62H160V170Z" fill="url(#growthcurve-gc-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M40 132C70 120 90 100 112 80C130 64 146 54 168 40" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />
        <Path d="M160 62V22" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M160 22H186L178 31L186 40H160Z" fill="#FF6B6B" />
        <G id="anim-float-person">
          <Circle cx={108} cy={64} r={7} fill={color} />
          <Path d="M94.7 87.1Q94.7 74.2 108 74.2Q121.3 74.2 121.3 87.1Z" fill={color} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M40 31C42 38 42 38 49 40C42 42 42 42 40 49C38 42 38 42 31 40C38 38 38 38 40 31Z" fill="#A855F7" />
          <Path d="M186 64C187.3 68.7 187.3 68.7 192 70C187.3 71.3 187.3 71.3 186 76C184.7 71.3 184.7 71.3 180 70C184.7 68.7 184.7 68.7 186 64Z" fill={color} />
        </G>
      </Svg>
  );
}
