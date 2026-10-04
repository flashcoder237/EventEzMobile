import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ConnectionBump — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ConnectionBump({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="connectionbump-cb-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={46} cy={76} r={16} fill={color} />
        <Path d="M15.6 128.8Q15.6 99.2 46 99.2Q76.4 99.2 76.4 128.8Z" fill={color} />
        <Path d="M70 124L92 108" stroke={color} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={94} cy={106} r={10} fill={color} />
        <Circle cx={154} cy={76} r={16} fill="#A855F7" />
        <Path d="M123.6 128.8Q123.6 99.2 154 99.2Q184.4 99.2 184.4 128.8Z" fill="#A855F7" />
        <Path d="M130 124L108 108" stroke="#A855F7" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={106} cy={106} r={10} fill="#A855F7" />
        <G id="anim-pulse-burst">
          <Path d="M100 84V74M86 88L80 80M114 88L120 80M100 128V138" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M100 31C102 38 102 38 109 40C102 42 102 42 100 49C98 42 98 42 91 40C98 38 98 38 100 31Z" fill="#FF6B6B" />
          <Path d="M30 34C31.3 38.7 31.3 38.7 36 40C31.3 41.3 31.3 41.3 30 46C28.7 41.3 28.7 41.3 24 40C28.7 38.7 28.7 38.7 30 34Z" fill="#A855F7" />
          <Path d="M176 34C177.3 38.7 177.3 38.7 182 40C177.3 41.3 177.3 41.3 176 46C174.7 41.3 174.7 41.3 170 40C174.7 38.7 174.7 38.7 176 34Z" fill={color} />
        </G>
      </Svg>
  );
}
