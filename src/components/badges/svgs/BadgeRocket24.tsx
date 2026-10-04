import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeRocket24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeRocket24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 2.5c4 2 6 6 5 11.5l-3 3h-4l-3-3C6 8.5 8 4.5 12 2.5z" />
        <Circle cx={12} cy={9.5} r={2} />
        <Path d="M7 14l-3 3 3.5 1M17 14l3 3-3.5 1M10.5 20l1.5 2 1.5-2" />
      </Svg>
  );
}
