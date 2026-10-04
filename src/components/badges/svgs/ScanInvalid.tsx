import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ScanInvalid — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ScanInvalid({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path d="M30 6H66L90 30V66L66 90H30L6 66V30Z" fill="#B91C1C" transform="translate(3 4)" />
        <Path d="M30 6H66L90 30V66L66 90H30L6 66V30Z" fill="#EF4444" stroke="#EF4444" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M33 33L63 63M63 33L33 63" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
