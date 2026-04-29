import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * MyNotifications — bell with motion lines, coral badge with "$" / count detail.
 * AI Designer v2 (run e042927c).
 */
export default function MyNotifications({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M100 20C150 20 180 80 180 140C180 190 20 190 20 140C20 80 50 20 100 20Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Motion lines */}
      <Path
        d="M40 80C30 90 25 110 30 130M160 80C170 90 175 110 170 130"
        stroke={INDIGO_DARK}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d="M20 95C10 105 10 120 15 130M180 95C190 105 190 120 185 130"
        stroke={INDIGO_DARK}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      {/* Bell body */}
      <Path
        d="M100 40C70 40 60 70 60 110C60 130 50 140 50 140H150C150 140 140 130 140 110C140 70 130 40 100 40Z"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* Clapper */}
      <Circle cx={100} cy={160} r={10} fill={color} />
      {/* Coral badge */}
      <Circle cx={145} cy={55} r={20} fill={CORAL} />
      <Path
        d="M138 50H152L145 55C148 55 152 58 152 62C152 66 148 70 145 70C142 70 138 68 138 65"
        stroke={CREAM}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
