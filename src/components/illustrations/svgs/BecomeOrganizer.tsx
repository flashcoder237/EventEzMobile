import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BecomeOrganizer — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BecomeOrganizer({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="becomeorganizer-bo-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="becomeorganizer-bo-b" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#A855F7" stopOpacity={0.3} />
            <Stop offset={1} stopColor="#A855F7" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Path d="M100 22L58 150H142Z" fill="url(#becomeorganizer-bo-b)" />
        <Path d="M14 26H52Q44 74 54 128Q34 120 14 130Z" fill={color} />
        <Path d="M26 30Q22 76 28 124M40 30Q34 74 42 124" stroke="#4338CA" strokeWidth={3} strokeLinecap="round" />
        <Path d="M186 26H148Q156 74 146 128Q166 120 186 130Z" fill={color} />
        <Path d="M174 30Q178 76 172 124M160 30Q166 74 158 124" stroke="#4338CA" strokeWidth={3} strokeLinecap="round" />
        <Rect x={8} y={14} width={184} height={16} rx={8} fill="#4338CA" />
        <Path d="M26 150H174L188 170H12Z" fill="#4338CA" transform="translate(0 8)" />
        <Path d="M26 150H174L188 170H12Z" fill="url(#becomeorganizer-bo-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Rect x={12} y={170} width={176} height={14} rx={4} fill={color} fillOpacity={0.18} />
        <Path d="M40 160H160" stroke={color} strokeOpacity={0.15} strokeWidth={3} strokeLinecap="round" />
        <Path d="M126 150V112" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" />
        <Path d="M116 150H136" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" />
        <Rect x={119} y={92} width={14} height={22} rx={7} fill="#4338CA" />
        <Path d="M122 100H130" stroke="#FDFBF7" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M86 150V138M96 150V138" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <Path d="M78 140V112Q78 100 91 100Q104 100 104 112V140Z" fill="#FF6B6B" />
        <Path d="M100 108L116 90" stroke="#FF6B6B" strokeWidth={7} strokeLinecap="round" />
        <Path d="M80 110L70 124" stroke="#FF6B6B" strokeWidth={7} strokeLinecap="round" />
        <Circle cx={91} cy={86} r={11} fill={color} />
        <G id="anim-twinkle-sparkles">
          <Path d="M72 42C73.8 48.2 73.8 48.2 80 50C73.8 51.8 73.8 51.8 72 58C70.2 51.8 70.2 51.8 64 50C70.2 48.2 70.2 48.2 72 42Z" fill="#A855F7" />
          <Path d="M132 54C133.3 58.7 133.3 58.7 138 60C133.3 61.3 133.3 61.3 132 66C130.7 61.3 130.7 61.3 126 60C130.7 58.7 130.7 58.7 132 54Z" fill="#FDFBF7" />
          <Path d="M100 35C101.1 38.9 101.1 38.9 105 40C101.1 41.1 101.1 41.1 100 45C98.9 41.1 98.9 41.1 95 40C98.9 38.9 98.9 38.9 100 35Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
