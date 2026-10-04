import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeUsers24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeUsers24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={9} cy={8} r={3.5} />
        <Path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6" />
        <Path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c1.9.8 3 2.8 3 5.7" />
      </Svg>
  );
}
