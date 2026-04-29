import React from 'react';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * Authentication — "Hand + key + profile portal".
 * A dashed indigo circle (the user's profile portal) with a stylized silhouette
 * inside; a hand reaches in from the lower-left holding a key — the key teeth
 * are coral, the singular highlight. Used on the login screen.
 *
 * AI Designer v2.1 (run 219308b4) — variant B.
 */
export default function Authentication({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Soft ambient blob */}
      <Path
        d="M90 30C150 20 180 70 170 130C160 190 100 195 60 160C20 125 30 40 90 30Z"
        fill={color}
        fillOpacity={0.06}
      />
      {/* Tiny decorative accents */}
      <Circle cx={155} cy={140} r={3} fill={INDIGO_DARK} opacity={0.3} />
      <Line
        x1={30}
        y1={50}
        x2={45}
        y2={35}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.2}
      />
      {/* Profile portal — dashed indigo circle */}
      <Circle
        cx={120}
        cy={100}
        r={60}
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeDasharray="12 16"
      />
      {/* Silhouette inside the portal: head + shoulders */}
      <G stroke={color} strokeWidth={5} strokeLinejoin="round" fill={CREAM}>
        <Circle cx={120} cy={78} r={16} />
        <Path d="M 85 145 C 88 120 100 108 120 108 C 140 108 152 120 155 145 Z" />
      </G>
      {/* Reaching hand — wrist + 2 fingers */}
      <G stroke={color} strokeWidth={5} strokeLinecap="round" fill="none">
        <Path d="M 10 190 C 25 155 50 135 68 115" />
        <Path d="M 60 123 C 70 110 85 100 80 90" />
        <Path d="M 62 133 C 75 125 80 120 88 112" />
      </G>
      {/* Key bow + shaft */}
      <Circle cx={80} cy={80} r={10} fill={CREAM} stroke={color} strokeWidth={5} />
      <Line x1={88} y1={86} x2={112} y2={105} stroke={color} strokeWidth={5} strokeLinecap="round" />
      {/* Key teeth — the singular coral highlight */}
      <Path
        d="M 97 91 L 102 85 M 106 98 L 111 92"
        stroke={CORAL}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
