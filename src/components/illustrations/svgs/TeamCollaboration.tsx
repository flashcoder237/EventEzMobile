import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TeamCollaboration — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TeamCollaboration({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="teamcollaboration-tc-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={72} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={61} y={35} width={92} height={74} rx={10} fill="#4338CA" />
        <Rect x={54} y={26} width={92} height={74} rx={10} fill="url(#teamcollaboration-tc-c)" stroke={color} strokeWidth={5} />
        <Rect x={66} y={40} width={30} height={22} rx={4} fill="#A855F7" fillOpacity={0.6} />
        <Rect x={104} y={40} width={30} height={22} rx={4} fill="#FF6B6B" fillOpacity={0.8} />
        <Rect x={66} y={70} width={68} height={14} rx={4} fill={color} fillOpacity={0.3} />
        <Circle cx={40} cy={118} r={14} fill={color} />
        <Path d="M13.4 164.2Q13.4 138.3 40 138.3Q66.6 138.3 66.6 164.2Z" fill={color} />
        <Path d="M56 140L80 100" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={160} cy={118} r={14} fill="#A855F7" />
        <Path d="M133.4 164.2Q133.4 138.3 160 138.3Q186.6 138.3 186.6 164.2Z" fill="#A855F7" />
        <Path d="M144 140L120 100" stroke="#A855F7" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={20} y={160} width={160} height={12} rx={6} fill={color} fillOpacity={0.2} />
        <G id="anim-pulse-spark">
          <Path d="M100 107C102 114 102 114 109 116C102 118 102 118 100 125C98 118 98 118 91 116C98 114 98 114 100 107Z" fill="#FF6B6B" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 42C31.8 48.2 31.8 48.2 38 50C31.8 51.8 31.8 51.8 30 58C28.2 51.8 28.2 51.8 22 50C28.2 48.2 28.2 48.2 30 42Z" fill="#A855F7" />
          <Path d="M176 44C177.3 48.7 177.3 48.7 182 50C177.3 51.3 177.3 51.3 176 56C174.7 51.3 174.7 51.3 170 50C174.7 48.7 174.7 48.7 176 44Z" fill={color} />
        </G>
      </Svg>
  );
}
