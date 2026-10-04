import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * HolidaySN — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function HolidaySN({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={22} fill="#FEFCE8" />
        <Path d="M22 40V24Q20 18 14 16M24 26Q28 18 34 16M23 30Q18 26 12 26" stroke="#78350F" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={14} cy={14} r={6} fill="#16A34A" />
        <Circle cx={34} cy={14} r={7} fill="#16A34A" />
        <Circle cx={24} cy={12} r={7} fill="#15803D" />
        <Circle cx={11} cy={25} r={4} fill="#16A34A" />
        <Path d="M37 28L38.3 31.2L41.8 31.5L39.1 33.7L39.9 37L37 35.2L34.1 37L34.9 33.7L32.2 31.5L35.7 31.2Z" fill="#16A34A" />
        <Path d="M8 40H40" stroke="#DC2626" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
