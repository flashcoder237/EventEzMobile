import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * NewMessage — phone with overlapping chat bubbles, coral notification ping.
 * AI Designer v2 (run e042927c).
 */
export default function NewMessage({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M170 120C180 160 140 180 90 170C40 160 20 120 50 60C80 0 160 80 170 120Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Phone tilted */}
      <Rect
        x={70}
        y={40}
        width={70}
        height={130}
        rx={12}
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        transform="rotate(-15 105 105)"
      />
      <Line x1={90} y1={52} x2={110} y2={47} stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
      {/* Bubble back */}
      <Path
        d="M40 70H100C105 70 110 75 110 80V110C110 115 105 120 100 120H60L40 140V70Z"
        fill={CREAM}
        stroke={INDIGO_DARK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* Bubble front */}
      <Path
        d="M70 110H140C145 110 150 115 150 120V150C150 155 145 160 140 160H110L80 180V160H70C65 160 60 155 60 150V120C60 115 65 110 70 110Z"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Circle cx={95} cy={135} r={4} fill={color} />
      <Circle cx={110} cy={135} r={4} fill={color} />
      <Circle cx={125} cy={135} r={4} fill={color} />
      {/* Notification ping */}
      <Circle cx={160} cy={50} r={12} fill={CORAL} />
      <Path d="M160 30C170 30 180 40 180 50" stroke={CORAL} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}
