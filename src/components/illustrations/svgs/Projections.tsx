import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Projections — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Projections({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="projections-pj-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={50} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M100 130L80 182M100 130L120 182M100 130V184" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={28} y={22} width={144} height={6} rx={3} fill="#4338CA" />
        <Rect x={41} y={37} width={132} height={98} rx={8} fill="#4338CA" />
        <Rect x={34} y={28} width={132} height={98} rx={8} fill="url(#projections-pj-c)" stroke={color} strokeWidth={5} />
        <Rect x={48} y={48} width={92} height={14} rx={7} fill={color} />
        <Circle cx={154} cy={55} r={4} fill={color} fillOpacity={0.5} />
        <Rect x={48} y={70} width={64} height={14} rx={7} fill="#A855F7" />
        <Circle cx={126} cy={77} r={4} fill="#A855F7" fillOpacity={0.5} />
        <Rect x={48} y={92} width={40} height={14} rx={7} fill="#FF6B6B" />
        <Circle cx={102} cy={99} r={4} fill="#FF6B6B" fillOpacity={0.5} />
        <G id="anim-float-hand">
          <Circle cx={162} cy={150} r={8} fill="#A855F7" />
          <Path d="M146.8 176.4Q146.8 161.6 162 161.6Q177.2 161.6 177.2 176.4Z" fill="#A855F7" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M180 42C181.8 48.2 181.8 48.2 188 50C181.8 51.8 181.8 51.8 180 58C178.2 51.8 178.2 51.8 172 50C178.2 48.2 178.2 48.2 180 42Z" fill="#A855F7" />
          <Path d="M20 134C21.3 138.7 21.3 138.7 26 140C21.3 141.3 21.3 141.3 20 146C18.7 141.3 18.7 141.3 14 140C18.7 138.7 18.7 138.7 20 134Z" fill={color} />
        </G>
      </Svg>
  );
}
