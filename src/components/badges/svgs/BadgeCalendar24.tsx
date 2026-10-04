import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeCalendar24 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeCalendar24({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={3} y={5} width={18} height={16} rx={3} />
        <Path d="M3 10h18M8 3v4M16 3v4" />
        <Path d="M8 15h2" />
      </Svg>
  );
}
