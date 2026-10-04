import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * HolidayCM — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function HolidayCM({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={22} fill="#ECFDF5" />
        <Path d="M4 38L18 18L26 28L32 22L44 38Z" fill="#15803D" />
        <Path d="M18 18L22 24L14 24Z" fill="#FFFFFF" />
        <Path d="M34 6L35.6 9.8L39.7 10.1L36.6 12.8L37.5 16.9L34 14.7L30.5 16.9L31.4 12.8L28.3 10.1L32.4 9.8Z" fill="#FACC15" />
        <Path d="M4 38H44" stroke="#DC2626" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
