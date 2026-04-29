import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Events — editorial calendar with one highlighted day (coral),
 * stacked paper shadow, dashed accent line.
 * AI Designer v2 (run e042927c).
 */
export default function Events({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Background blob */}
      <Path
        d="M150.5 45.5C180 75 160 145 110.5 165.5C61 186 10 135 15.5 85.5C21 36 121 16 150.5 45.5Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Paper shadow offset */}
      <Rect x={65} y={55} width={90} height={110} rx={8} fill={INDIGO_DARK} />
      {/* Main calendar */}
      <Rect x={50} y={45} width={90} height={110} rx={8} fill={CREAM} stroke={color} strokeWidth={5} strokeLinejoin="round" />
      {/* Top tabs */}
      <Path d="M70 30V55M110 30V55M90 60H120" stroke={color} strokeWidth={5} strokeLinecap="round" />
      {/* Coral highlighted day */}
      <Rect x={95} y={90} width={25} height={25} rx={4} fill={CORAL} />
      {/* Accent dot */}
      <Circle cx={165} cy={80} r={5} fill={color} />
      {/* Abstract dashed line */}
      <Path d="M30 110C40 90 20 80 40 60" stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" strokeDasharray="4 8" />
    </Svg>
  );
}
