import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * AccessDenied — closed lock with a giant coral X over it, dashed barrier behind.
 * AI Designer v2 (run e042927c).
 */
export default function AccessDenied({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={110} r={80} fill={color} fillOpacity={0.06} />
      {/* Dashed barrier behind */}
      <Path
        d="M20 180L180 140 M20 160L180 120"
        stroke={INDIGO_DARK}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="10 10"
      />
      {/* Lock body */}
      <Rect x={60} y={90} width={80} height={70} rx={12} fill={CREAM} stroke={color} strokeWidth={5} strokeLinejoin="round" />
      {/* Shackle */}
      <Path
        d="M75 90V60C75 40 125 40 125 60V90"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* Coral X */}
      <Path
        d="M80 110L120 140 M80 140L120 110"
        stroke={CORAL}
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* Warning curl */}
      <Path d="M30 40C40 20 60 30 70 50" stroke={color} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}
