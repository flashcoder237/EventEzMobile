import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TicketsOffline — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TicketsOffline({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="ticketsoffline-to-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={168} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <G id="anim-float-cloud">
          <Path d="M54 66Q44 66 44 56Q44 46 54 46Q56 34 70 34Q80 34 85 42Q88 40 92 40Q102 40 102 52Q110 54 110 60Q110 66 102 66Z" fill="#FDFBF7" stroke={color} strokeOpacity={0.45} strokeWidth={4} strokeLinejoin="round" transform="translate(60 -10)" />
          <Path d="M112 26L166 62" stroke={color} strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" />
        </G>
        <Path d="M38 80H122A8 8 0 0 0 138 80H162Q174 80 174 92V142Q174 154 162 154H138A8 8 0 0 0 122 154H38Q26 154 26 142V92Q26 80 38 80Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M38 80H122A8 8 0 0 0 138 80H162Q174 80 174 92V142Q174 154 162 154H138A8 8 0 0 0 122 154H38Q26 154 26 142V92Q26 80 38 80Z" fill="url(#ticketsoffline-to-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M130 92V142" stroke={color} strokeOpacity={0.4} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 5" />
        <Path d="M42 100H96M42 114H82" stroke={color} strokeWidth={5} strokeLinecap="round" />
        <Path d="M42 134H70" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" />
        <Rect x={140} y={98} width={12} height={12} rx={3} stroke={color} strokeWidth={3} />
        <Rect x={140} y={122} width={12} height={12} rx={3} stroke={color} strokeWidth={3} />
        <Rect x={156} y={98} width={12} height={12} rx={3} stroke={color} strokeWidth={3} />
        <Rect x={158} y={124} width={8} height={8} rx={2} fill="#FF6B6B" />
        <Circle cx={88} cy={140} r={12} fill={color} />
        <Path d="M82 140L86 144L94 136" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M30 44C31.8 50.2 31.8 50.2 38 52C31.8 53.8 31.8 53.8 30 60C28.2 53.8 28.2 53.8 22 52C28.2 50.2 28.2 50.2 30 44Z" fill="#A855F7" />
          <Path d="M176 170C177.3 174.7 177.3 174.7 182 176C177.3 177.3 177.3 177.3 176 182C174.7 177.3 174.7 177.3 170 176C174.7 174.7 174.7 174.7 176 170Z" fill={color} />
        </G>
      </Svg>
  );
}
