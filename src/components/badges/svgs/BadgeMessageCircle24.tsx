import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeMessageCircle24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeMessageCircle24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20.5 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.3A8.5 8.5 0 1 1 20.5 11.5z" />
      </Svg>
  );
}
