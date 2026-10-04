import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeAward24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeAward24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={9} r={6} />
        <Path d="M8.6 13.8L7 22l5-3 5 3-1.6-8.2" />
      </Svg>
  );
}
