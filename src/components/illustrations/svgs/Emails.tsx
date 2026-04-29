import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Emails — open envelope with letter sliding out, coral seal, paper stack.
 * AI Designer v2 (run e042927c).
 */
export default function Emails({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={110} cy={90} r={75} fill={color} fillOpacity={0.06} />
      {/* Letter */}
      <Rect x={65} y={25} width={70} height={90} rx={4} fill={CREAM} stroke={color} strokeWidth={5} />
      <Line x1={80} y1={45} x2={120} y2={45} stroke={CORAL} strokeWidth={5} strokeLinecap="round" />
      <Line x1={80} y1={65} x2={110} y2={65} stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
      {/* Envelope back */}
      <Path
        d="M30 80L170 80V150C170 155 165 160 160 160H40C35 160 30 155 30 150V80Z"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* V-flap */}
      <Path d="M30 80L100 130L170 80" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M40 160L90 120M160 160L110 120" stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
      {/* Coral seal */}
      <Circle cx={140} cy={130} r={14} fill={CORAL} />
      <Circle cx={140} cy={130} r={6} fill={CREAM} />
      {/* Floating dot */}
      <Circle cx={45} cy={40} r={4} fill={color} />
    </Svg>
  );
}
