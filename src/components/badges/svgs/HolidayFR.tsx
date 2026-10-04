import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * HolidayFR — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function HolidayFR({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={22} fill="#EFF6FF" />
        <Path d="M24 24L39 24" stroke="#1D4ED8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L34.6 34.6" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L24 39" stroke="#1D4ED8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L13.4 34.6" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L9 24" stroke="#1D4ED8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L13.4 13.4" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L24 9" stroke="#1D4ED8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L34.6 13.4" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={24} cy={24} r={3.5} fill="#FFFFFF" stroke="#1D4ED8" strokeWidth={2} />
        <Circle cx={12} cy={36} r={2} fill="#DC2626" />
        <Circle cx={36} cy={12} r={2} fill="#1D4ED8" />
      </Svg>
  );
}
