import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Confirmed — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Confirmed({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="confirmed-cf-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M40 62H112A8 8 0 0 0 128 62H148Q160 62 160 74V126Q160 138 148 138H128A8 8 0 0 0 112 138H40Q28 138 28 126V74Q28 62 40 62Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M40 62H112A8 8 0 0 0 128 62H148Q160 62 160 74V126Q160 138 148 138H128A8 8 0 0 0 112 138H40Q28 138 28 126V74Q28 62 40 62Z" fill="url(#confirmed-cf-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 84H80" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 98H96" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 112H72" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M120 74V128" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 5" />
        <Circle cx={148} cy={74} r={26} fill={color} stroke="#FDFBF7" strokeWidth={5} />
        <Path id="anim-draw-check" d="M136 74L145 83L161 66" stroke="#FDFBF7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={136} cy={112} r={5} fill="#FF6B6B" />
        <G id="anim-wave-rings">
          <Circle cx={148} cy={74} r={36} stroke="#A855F7" strokeWidth={3} strokeOpacity={0.5} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M34 32C35.8 38.2 35.8 38.2 42 40C35.8 41.8 35.8 41.8 34 48C32.2 41.8 32.2 41.8 26 40C32.2 38.2 32.2 38.2 34 32Z" fill="#A855F7" />
          <Path d="M176 140C177.3 144.7 177.3 144.7 182 146C177.3 147.3 177.3 147.3 176 152C174.7 147.3 174.7 147.3 170 146C174.7 144.7 174.7 144.7 176 140Z" fill={color} />
        </G>
      </Svg>
  );
}
