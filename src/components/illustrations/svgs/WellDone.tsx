import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * WellDone — figure raising arms in celebration with a giant coral checkmark badge.
 * AI Designer v2 (run e042927c).
 */
export default function WellDone({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={85} fill={color} fillOpacity={0.06} />
      {/* Body */}
      <Path
        d="M70 180V120C70 100 130 100 130 120V180"
        fill={CREAM}
        stroke={INDIGO_DARK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* Arms raised */}
      <Path
        d="M80 110L40 60 M120 110L160 60"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* Head */}
      <Circle cx={100} cy={65} r={18} fill={CREAM} stroke={color} strokeWidth={5} />
      {/* Coral check badge */}
      <Circle cx={100} cy={130} r={28} fill={CORAL} stroke={color} strokeWidth={5} />
      <Path
        d="M88 130L96 138L112 122"
        stroke={CREAM}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Confetti stars */}
      <Path d="M40 30L45 40L55 42L48 50L50 60L40 55L30 60L32 50L25 42L35 40Z" fill={color} />
      <Path d="M150 20L153 28L160 30L155 36L157 44L150 40L143 44L145 36L139 30L147 28Z" fill={CORAL} />
      <Circle cx={170} cy={90} r={4} fill={INDIGO_DARK} />
      <Circle cx={30} cy={90} r={4} fill={CORAL} />
    </Svg>
  );
}
