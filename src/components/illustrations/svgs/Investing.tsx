import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Investing — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Investing({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="investing-iv-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={54} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={62} y={158} width={76} height={14} rx={7} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Rect x={62} y={146} width={76} height={14} rx={7} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Rect x={62} y={134} width={76} height={14} rx={7} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Rect x={62} y={122} width={76} height={14} rx={7} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Path d="M100 112V72" stroke="#16A34A" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M100 92C84 92 74 80 74 64C90 64 100 76 100 92Z" fill="#22C55E" />
        <Path d="M100 80C100 62 112 50 130 50C130 66 118 80 100 80Z" fill="#16A34A" />
        <G id="anim-float-coin">
          <Circle cx={152} cy={64} r={14} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={152} cy={64} r={7} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
          <Circle cx={44} cy={92} r={10} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={44} cy={92} r={5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        </G>
        <G id="anim-float-arrow">
          <Path d="M150 30L172 12M162 12H172V22" stroke="#A855F7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
          <Path d="M176 114C177.3 118.7 177.3 118.7 182 120C177.3 121.3 177.3 121.3 176 126C174.7 121.3 174.7 121.3 170 120C174.7 118.7 174.7 118.7 176 114Z" fill={color} />
        </G>
      </Svg>
  );
}
