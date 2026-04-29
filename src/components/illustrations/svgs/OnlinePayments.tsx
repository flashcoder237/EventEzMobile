import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * OnlinePayments — phone with screen + sliding card + coral coin + contactless waves.
 * AI Designer v2 (run e042927c).
 */
export default function OnlinePayments({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={75} fill={color} fillOpacity={0.06} />
      {/* Card sliding out */}
      <Path
        d="M20 110L120 60V100L20 150V110Z"
        fill={CREAM}
        stroke={INDIGO_DARK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* Phone */}
      <Rect x={80} y={80} width={80} height={100} rx={12} fill={CREAM} stroke={color} strokeWidth={5} />
      {/* Screen */}
      <Rect x={90} y={95} width={60} height={50} rx={4} stroke={INDIGO_DARK} strokeWidth={4} />
      <Path d="M110 160H130" stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
      {/* Coral coin */}
      <Circle cx={50} cy={60} r={16} fill={CORAL} stroke={color} strokeWidth={4} />
      <Path d="M45 55H55 M45 65H55" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
      {/* Contactless waves */}
      <Path
        d="M110 50C120 40 140 40 150 50 M120 70C130 65 140 65 150 70"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
