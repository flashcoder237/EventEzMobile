import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * EmailLinkInvalid — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function EmailLinkInvalid({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="emaillinkinvalid-el-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={180} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={33} y={79} width={116} height={80} rx={10} fill="#4338CA" />
        <Rect x={26} y={70} width={116} height={80} rx={10} fill="url(#emaillinkinvalid-el-c)" stroke={color} strokeWidth={5} />
        <Path d="M32 76L78 111.6Q84 116.4 90 111.6L136 76" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G transform="rotate(-35 150 60)">
          <Rect x={130} y={50} width={40} height={20} rx={10} stroke="#A855F7" strokeWidth={7} />
        </G>
        <G transform="rotate(-35 172 38)">
          <Rect x={158} y={28} width={34} height={20} rx={10} stroke="#A855F7" strokeWidth={7} strokeOpacity={0.5} />
        </G>
        <Path d="M160 26L156 18M168 32L178 28" stroke="#FF6B6B" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
