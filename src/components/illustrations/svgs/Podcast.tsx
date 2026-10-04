import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Podcast — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Podcast({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="podcast-pd-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={44} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M100 140V176M76 178H124" stroke="#4338CA" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M64 98A36 36 0 0 0 136 98" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={81} y={34} width={46} height={92} rx={23} fill="#4338CA" />
        <Rect x={76} y={28} width={46} height={92} rx={23} fill="url(#podcast-pd-c)" stroke={color} strokeWidth={5} />
        <Path d="M88 48H110" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M88 62H110" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M88 76H110" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={99} cy={100} r={6} fill="#FF6B6B" />
        <G id="anim-wave-sound">
          <Path d="M146 56Q156 74 146 92" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M160 46Q176 74 160 102" stroke="#A855F7" strokeWidth={4} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M52 56Q42 74 52 92" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M38 46Q22 74 38 102" stroke="#A855F7" strokeWidth={4} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M172 143C173.5 148.5 173.5 148.5 179 150C173.5 151.5 173.5 151.5 172 157C170.5 151.5 170.5 151.5 165 150C170.5 148.5 170.5 148.5 172 143Z" fill="#A855F7" />
          <Path d="M28 144C29.3 148.7 29.3 148.7 34 150C29.3 151.3 29.3 151.3 28 156C26.7 151.3 26.7 151.3 22 150C26.7 148.7 26.7 148.7 28 144Z" fill={color} />
        </G>
      </Svg>
  );
}
