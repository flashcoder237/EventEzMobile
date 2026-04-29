import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Alert — warning triangle with exclamation, abstract coral arm pointing.
 * AI Designer v2 (run e042927c).
 */
export default function Alert({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M50 180C10 180 -10 110 30 70C70 30 180 -10 180 60C180 130 90 180 50 180Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Triangle drop shadow */}
      <Path d="M110 50L180 160H40Z" fill={INDIGO_DARK} />
      {/* Triangle main */}
      <Path d="M100 40L170 150H30Z" fill={CREAM} stroke={color} strokeWidth={6} strokeLinejoin="round" />
      {/* Exclamation */}
      <Path d="M100 70V110" stroke={color} strokeWidth={8} strokeLinecap="round" />
      <Circle cx={100} cy={130} r={5} fill={CORAL} />
      {/* Arm pointing */}
      <Path
        d="M20 180C20 160 40 140 60 140L80 120"
        stroke={CORAL}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Circle cx={30} cy={130} r={10} fill={CREAM} stroke={color} strokeWidth={4} />
      {/* Warning curl */}
      <Path d="M140 60C150 40 160 30 180 40" stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}
