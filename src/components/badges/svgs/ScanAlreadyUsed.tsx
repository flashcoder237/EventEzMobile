import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ScanAlreadyUsed — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ScanAlreadyUsed({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Rect x={11} y={11} width={80} height={80} rx={20} fill="#B45309" />
        <Rect x={8} y={8} width={80} height={80} rx={20} fill="#F59E0B" />
        <Path d="M30 34A22 22 0 1 1 26 52" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M22 28L29 35L37 29" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 36V49L57 55" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
