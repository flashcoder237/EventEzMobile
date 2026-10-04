import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeCheckCircle24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeCheckCircle24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={9} />
        <Path d="M8 12.5l2.8 2.8L16.5 9.5" />
      </Svg>
  );
}
