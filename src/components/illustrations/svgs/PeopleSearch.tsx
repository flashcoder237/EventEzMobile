import React from 'react';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * PeopleSearch — two stylized figures with a search lens overlay, coral star.
 * AI Designer v2 (run e042927c).
 */
export default function PeopleSearch({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M50 30C150 20 180 80 160 140C140 200 50 180 30 120C10 60 10 40 50 30Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Figure 1 (back) */}
      <Path
        d="M40 180V140C40 110 90 110 90 140V180"
        fill={CREAM}
        stroke={INDIGO_DARK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Circle cx={65} cy={85} r={18} fill={CREAM} stroke={INDIGO_DARK} strokeWidth={5} />
      {/* Figure 2 (front) */}
      <Path
        d="M90 190V130C90 90 160 90 160 130V190"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Circle cx={125} cy={70} r={22} fill={CREAM} stroke={color} strokeWidth={5} />
      {/* Search lens */}
      <Ellipse
        cx={100}
        cy={110}
        rx={40}
        ry={25}
        fill={CORAL}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={4}
        transform="rotate(-15 100 110)"
      />
      <Path d="M50 130L30 150" stroke={color} strokeWidth={6} strokeLinecap="round" />
      {/* Coral star */}
      <Path d="M160 20L165 30L175 32L168 40L170 50L160 45L150 50L152 40L145 32L155 30Z" fill={CORAL} />
    </Svg>
  );
}
