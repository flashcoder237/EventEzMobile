import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeHeart24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeHeart24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 20C5 15.2 3 11.6 3 8.6 3 6 5 4 7.6 4c1.8 0 3.4 1 4.4 2.6C13 5 14.6 4 16.4 4 19 4 21 6 21 8.6c0 3-2 6.6-9 11.4z" />
      </Svg>
  );
}
