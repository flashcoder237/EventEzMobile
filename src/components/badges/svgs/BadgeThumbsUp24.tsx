import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeThumbsUp24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeThumbsUp24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 10v10H4V10z" />
        <Path d="M7 10l4-7c1.7 0 2.6 1.3 2.1 3L12 9h6.5c1.4 0 2.3 1.3 1.9 2.6l-1.8 6.8c-.3 1-1.2 1.6-2.2 1.6H7" />
      </Svg>
  );
}
