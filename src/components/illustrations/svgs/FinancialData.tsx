import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * FinancialData — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function FinancialData({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="financialdata-fd-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={31} y={47} width={140} height={116} rx={14} fill="#4338CA" />
        <Rect x={24} y={38} width={140} height={116} rx={14} fill="url(#financialdata-fd-c)" stroke={color} strokeWidth={5} />
        <Path d="M24 52Q24 38 38 38H150Q164 38 164 52V60H24Z" fill={color} fillOpacity={0.12} />
        <Circle cx={38} cy={49} r={3.5} fill="#FF6B6B" />
        <Circle cx={50} cy={49} r={3.5} fill="#A855F7" />
        <Circle cx={62} cy={49} r={3.5} fill={color} />
        <Rect x={42} y={108} width={14} height={30} rx={4} fill={color} />
        <Rect x={64} y={86} width={14} height={52} rx={4} fill={color} />
        <Rect x={86} y={98} width={14} height={40} rx={4} fill={color} />
        <Rect x={108} y={72} width={14} height={66} rx={4} fill="#A855F7" />
        <Rect x={130} y={88} width={14} height={50} rx={4} fill={color} />
        <Path d="M40 92L70 76L94 86L136 66" stroke="#FF6B6B" strokeWidth={3.5} strokeOpacity={0.8} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-coin">
          <Circle cx={166} cy={140} r={18} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={166} cy={140} r={9} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M176 32C177.8 38.2 177.8 38.2 184 40C177.8 41.8 177.8 41.8 176 48C174.2 41.8 174.2 41.8 168 40C174.2 38.2 174.2 38.2 176 32Z" fill="#A855F7" />
          <Path d="M22 154C23.3 158.7 23.3 158.7 28 160C23.3 161.3 23.3 161.3 22 166C20.7 161.3 20.7 161.3 16 160C20.7 158.7 20.7 158.7 22 154Z" fill={color} />
        </G>
      </Svg>
  );
}
