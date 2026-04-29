import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Conference — speaker behind podium with chart on screen, audience hints.
 * AI Designer v2 (run e042927c).
 */
export default function Conference({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M120 20C170 30 180 110 140 160C100 210 20 180 20 120C20 60 70 10 120 20Z"
        fill={color}
        fillOpacity={0.06}
      />
      <Rect x={80} y={30} width={100} height={70} rx={4} fill={CREAM} stroke={color} strokeWidth={5} />
      <Path d="M90 80L110 60L130 70L160 45" stroke={CORAL} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={160} cy={45} r={4} fill={CORAL} />
      <Path d="M50 160V120C50 100 80 100 80 120V160" fill={CREAM} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={65} cy={80} r={15} fill={CREAM} stroke={color} strokeWidth={5} />
      <Rect x={65} y={110} width={40} height={60} fill={CREAM} stroke={color} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M75 125H95 M75 140H85" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <Path d="M130 180C130 160 160 160 160 180" stroke={INDIGO_DARK} strokeWidth={5} strokeLinecap="round" fill={CREAM} />
      <Path d="M165 180C165 170 185 170 185 180" stroke={INDIGO_DARK} strokeWidth={5} strokeLinecap="round" fill={CREAM} />
    </Svg>
  );
}
