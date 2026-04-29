import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * SaveToBookmarks — stacked event cards with a giant coral bookmark ribbon.
 * AI Designer v2 (run e042927c).
 */
export default function SaveToBookmarks({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M50 40C120 30 170 50 180 120C190 190 80 190 30 140C-20 90 -20 50 50 40Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Card behind (rotated) */}
      <Rect
        x={60}
        y={70}
        width={100}
        height={70}
        rx={8}
        fill={CREAM}
        stroke={INDIGO_DARK}
        strokeWidth={4}
        transform="rotate(-10 60 70)"
      />
      {/* Card front */}
      <Rect x={50} y={90} width={100} height={70} rx={8} fill={CREAM} stroke={color} strokeWidth={5} />
      <Path d="M60 110H100 M60 130H80" stroke={INDIGO_DARK} strokeWidth={4} strokeLinecap="round" />
      {/* Coral bookmark ribbon */}
      <Path
        d="M130 50V160L110 145L90 160V50H130Z"
        fill={CORAL}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* Hand pinning */}
      <Path
        d="M160 50C160 50 130 20 110 20C100 20 110 60 110 60"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
