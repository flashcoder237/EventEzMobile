import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeTrophy24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeTrophy24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 3h10v7a5 5 0 0 1-10 0z" />
        <Path d="M7 5H4v2a3 3 0 0 0 3.2 3M17 5h3v2a3 3 0 0 1-3.2 3M12 15v4M8 21h8" />
      </Svg>
  );
}
