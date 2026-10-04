import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BecomeOrganizerSent — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BecomeOrganizerSent({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="becomeorganizersent-bs-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="becomeorganizersent-bs-b" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#A855F7" stopOpacity={0.3} />
            <Stop offset={1} stopColor="#A855F7" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Path d="M100 22L58 150H142Z" fill="url(#becomeorganizersent-bs-b)" />
        <Path d="M14 26H52Q44 74 54 128Q34 120 14 130Z" fill={color} />
        <Path d="M26 30Q22 76 28 124M40 30Q34 74 42 124" stroke="#4338CA" strokeWidth={3} strokeLinecap="round" />
        <Path d="M186 26H148Q156 74 146 128Q166 120 186 130Z" fill={color} />
        <Path d="M174 30Q178 76 172 124M160 30Q166 74 158 124" stroke="#4338CA" strokeWidth={3} strokeLinecap="round" />
        <Rect x={8} y={14} width={184} height={16} rx={8} fill="#4338CA" />
        <Path d="M26 150H174L188 170H12Z" fill="#4338CA" transform="translate(0 8)" />
        <Path d="M26 150H174L188 170H12Z" fill="url(#becomeorganizersent-bs-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Rect x={12} y={170} width={176} height={14} rx={4} fill={color} fillOpacity={0.18} />
        <Path d="M40 160H160" stroke={color} strokeOpacity={0.15} strokeWidth={3} strokeLinecap="round" />
        <G id="anim-float-envelope">
          <Rect x={70} y={94} width={72} height={50} rx={9} fill="#4338CA" transform="translate(5 7)" />
          <Rect x={64} y={90} width={72} height={50} rx={9} fill="#FDFBF7" stroke={color} strokeWidth={4.5} />
          <Path d="M68 96L96 118Q100 121 104 118L132 96" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={100} cy={122} r={9} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3} />
        </G>
        <Circle cx={140} cy={84} r={13} fill={color} stroke="#FDFBF7" strokeWidth={3.5} />
        <Path id="anim-draw-check" d="M134 84L138.5 88.5L146 80" stroke="#FDFBF7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M72 48C73.8 54.2 73.8 54.2 80 56C73.8 57.8 73.8 57.8 72 64C70.2 57.8 70.2 57.8 64 56C70.2 54.2 70.2 54.2 72 48Z" fill="#A855F7" />
          <Path d="M118 47C119.1 50.9 119.1 50.9 123 52C119.1 53.1 119.1 53.1 118 57C116.9 53.1 116.9 53.1 113 52C116.9 50.9 116.9 50.9 118 47Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
