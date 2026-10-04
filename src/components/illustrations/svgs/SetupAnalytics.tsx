import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * SetupAnalytics — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function SetupAnalytics({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="setupanalytics-sa-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={29} y={45} width={146} height={112} rx={14} fill="#4338CA" />
        <Rect x={22} y={36} width={146} height={112} rx={14} fill="url(#setupanalytics-sa-c)" stroke={color} strokeWidth={5} />
        <Path d="M22 50Q22 36 36 36H154Q168 36 168 50V58H22Z" fill={color} fillOpacity={0.12} />
        <Rect x={34} y={70} width={54} height={30} rx={6} fill={color} fillOpacity={0.12} />
        <Path d="M40 92L52 82L62 88L80 74" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={98} y={70} width={58} height={30} rx={6} fill="#A855F7" fillOpacity={0.15} />
        <Rect x={34} y={110} width={122} height={26} rx={6} fill={color} fillOpacity={0.08} />
        <Path d="M44 123H94" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 123H74" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-spin-gear">
          <Path d="M182 142L181.5 146.7L174.6 148.9L173 152L175 159L171.3 162L164.9 158.6L161.5 159.7L158 166L153.3 165.5L151.1 158.6L148 157L141 159L138 155.3L141.4 148.9L140.3 145.5L134 142L134.5 137.3L141.4 135.1L143 132L141 125L144.7 122L151.1 125.4L154.5 124.3L158 118L162.7 118.5L164.9 125.4L168 127L175 125L178 128.7L174.6 135.1L175.7 138.5Z" fill={color} />
          <Circle cx={158} cy={142} r={9} fill="#FDFBF7" />
        </G>
        <Circle cx={126} cy={85} r={6} fill="#FF6B6B" />
        <G id="anim-twinkle-sparkles">
          <Path d="M176 26C177.8 32.2 177.8 32.2 184 34C177.8 35.8 177.8 35.8 176 42C174.2 35.8 174.2 35.8 168 34C174.2 32.2 174.2 32.2 176 26Z" fill="#A855F7" />
          <Path d="M20 164C21.3 168.7 21.3 168.7 26 170C21.3 171.3 21.3 171.3 20 176C18.7 171.3 18.7 171.3 14 170C18.7 168.7 18.7 168.7 20 164Z" fill={color} />
        </G>
      </Svg>
  );
}
