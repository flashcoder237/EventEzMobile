import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Searching — figure with magnifying glass over a document with a coral pin.
 * AI Designer v2 (run e042927c).
 */
export default function Searching({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M50 170C15 150 25 80 60 50C95 20 170 30 180 80C190 130 85 190 50 170Z"
        fill={color}
        fillOpacity={0.06}
      />
      <Path
        d="M30 60L140 30V150L60 170ZM60 80L110 70 M65 100L95 95"
        stroke={INDIGO_DARK}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M60 130C60 145 75 160 75 160C75 160 90 145 90 130C90 115 60 115 60 130Z" fill={CORAL} />
      <Circle cx={75} cy={130} r={6} fill={CREAM} />
      <Circle cx={120} cy={100} r={40} fill={CREAM} stroke={color} strokeWidth={5} />
      <Path d="M148 128L185 165" stroke={color} strokeWidth={7} strokeLinecap="round" />
      <Rect
        x={165}
        y={145}
        width={25}
        height={15}
        rx={6}
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        transform="rotate(45 165 145)"
      />
    </Svg>
  );
}
