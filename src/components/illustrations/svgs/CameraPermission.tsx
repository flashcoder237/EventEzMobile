import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * CameraPermission — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function CameraPermission({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="camerapermission-cm-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M48 66H118A8 8 0 0 0 134 66H152Q164 66 164 78V124Q164 136 152 136H134A8 8 0 0 0 118 136H48Q36 136 36 124V78Q36 66 48 66Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M48 66H118A8 8 0 0 0 134 66H152Q164 66 164 78V124Q164 136 152 136H134A8 8 0 0 0 118 136H48Q36 136 36 124V78Q36 66 48 66Z" fill="url(#camerapermission-cm-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={50} y={80} width={16} height={16} rx={4} stroke={color} strokeWidth={3.5} />
        <Rect x={55} y={85} width={6} height={6} rx={1.5} fill={color} />
        <Rect x={72} y={80} width={16} height={16} rx={4} stroke={color} strokeWidth={3.5} />
        <Rect x={77} y={85} width={6} height={6} rx={1.5} fill={color} />
        <Rect x={50} y={102} width={16} height={16} rx={4} stroke={color} strokeWidth={3.5} />
        <Rect x={55} y={107} width={6} height={6} rx={1.5} fill={color} />
        <Rect x={76} y={106} width={6} height={6} rx={1.5} fill="#FF6B6B" />
        <Path d="M102 88H114" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M102 100H122" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M102 112H110" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 72V50Q24 40 34 40H56" stroke="#A855F7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M144 40H166Q176 40 176 50V72" stroke="#A855F7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M176 132V150Q176 160 166 160H144" stroke="#A855F7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M56 160H34Q24 160 24 150V132" stroke="#A855F7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-wave-scan">
          <Path d="M30 100H170" stroke="#FF6B6B" strokeWidth={3.5} strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
  );
}
