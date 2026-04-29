import React from 'react';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Empty — open isometric box with a single coral dot floating above (nothing here).
 * AI Designer v2 (run e042927c).
 */
export default function Empty({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={120} r={70} fill={color} fillOpacity={0.06} />
      <Polygon
        points="50,110 100,140 150,110 100,80"
        fill={INDIGO_DARK}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Polygon
        points="50,110 100,140 100,170 50,140"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Polygon
        points="100,140 150,110 150,140 100,170"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Polygon
        points="50,110 40,60 90,40 100,80"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Polygon
        points="150,110 170,70 120,45 100,80"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* The Nothingness Dot */}
      <Circle cx={100} cy={40} r={10} fill={CORAL} />
      <Path d="M100 80C100 50 60 60 70 30" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray="4 6" />
      <Path d="M140 20 L145 25" stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}
