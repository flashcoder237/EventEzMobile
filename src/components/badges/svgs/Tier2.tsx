import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Tier2 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Tier2({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path d="M48 14L73 24.6V45.7C73 64.2 59 74.7 48 80C37 74.7 23 64.2 23 45.7V24.6Z" fill="#8A94A6" transform="translate(3 4)" />
        <Path d="M48 14L73 24.6V45.7C73 64.2 59 74.7 48 80C37 74.7 23 64.2 23 45.7V24.6Z" fill="#C3CAD5" stroke="#8A94A6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 22L65 29.7V45C65 58.5 55.5 66.2 48 70C40.5 66.2 31 58.5 31 45V29.7Z" stroke="#FFFFFF" strokeWidth={2.5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 37L50.4 42.7L56.6 43.2L51.9 47.3L53.3 53.3L48 50L42.7 53.3L44.1 47.3L39.4 43.2L45.6 42.7Z" fill="#FFFFFF" />
      </Svg>
  );
}
