import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeFlagLocked — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeFlagLocked({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path d="M30 64L22 92L34 86L40 94L46 70Z" fill="#CBD5E1" />
        <Path d="M66 64L74 92L62 86L56 94L50 70Z" fill="#CBD5E1" fillOpacity={0.85} />
        <Path d="M48 6L56.8 11.2L67 11.1L72 20L80.9 25L80.8 35.2L86 44L80.8 52.8L80.9 63L72 68L67 76.9L56.8 76.8L48 82L39.2 76.8L29 76.9L24 68L15.1 63L15.2 52.8L10 44L15.2 35.2L15.1 25L24 20L29 11.1L39.2 11.2Z" fill="#94A3B8" stroke="#94A3B8" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" transform="translate(3 4)" />
        <Path d="M48 6L56.8 11.2L67 11.1L72 20L80.9 25L80.8 35.2L86 44L80.8 52.8L80.9 63L72 68L67 76.9L56.8 76.8L48 82L39.2 76.8L29 76.9L24 68L15.1 63L15.2 52.8L10 44L15.2 35.2L15.1 25L24 20L29 11.1L39.2 11.2Z" fill="#CBD5E1" stroke="#CBD5E1" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={48} cy={44} r={27} stroke="#FFFFFF" strokeWidth={2} strokeOpacity={0.35} />
        <G transform="translate(27.6 23.6) scale(1.7)" fill="none" stroke="#F8FAFC" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 22V3" />
          <Path d="M5 4h12l-2.5 4.5L17 13H5" />
        </G>
        <Circle cx={76} cy={72} r={13} fill="#64748B" stroke="#FFFFFF" strokeWidth={3} />
        <Path d="M71.5 71V68.5A4.5 4.5 0 0 1 80.5 68.5V71" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={70} y={70.5} width={12} height={9} rx={2.5} fill="#FFFFFF" />
      </Svg>
  );
}
