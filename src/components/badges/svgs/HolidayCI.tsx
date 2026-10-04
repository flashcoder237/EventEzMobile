import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * HolidayCI — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function HolidayCI({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={22} fill="#FFF7ED" />
        <Circle cx={24} cy={28} r={10} fill="#F97316" />
        <Path d="M2 30H46V46H2Z" fill="#FFF7ED" />
        <Path d="M6 32Q15 28 24 32T42 32" stroke="#16A34A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10 38Q19 34 28 38T44 38" stroke="#16A34A" strokeWidth={3} strokeOpacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 10V14M12 15L15 18M36 15L33 18" stroke="#F97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
