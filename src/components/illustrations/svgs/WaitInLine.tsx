import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * WaitInLine — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function WaitInLine({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="waitinline-wl-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={76} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={137} y={59} width={52} height={120} rx={10} fill="#4338CA" />
        <Rect x={130} y={50} width={52} height={120} rx={10} fill="url(#waitinline-wl-c)" stroke={color} strokeWidth={5} />
        <Rect x={138} y={60} width={36} height={26} rx={5} fill={color} />
        <Circle cx={156} cy={108} r={6} fill="#FF6B6B" />
        <Path d="M140 130H172" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M140 142H160" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <G opacity={1}>
          <Circle cx={104} cy={86} r={11} fill={color} />
          <Path d="M83.1 122.3Q83.1 102 104 102Q124.9 102 124.9 122.3Z" fill={color} />
          <Rect x={89} y={122} width={30} height={48} rx={12} fill={color} />
        </G>
        <G opacity={0.8}>
          <Circle cx={72} cy={86} r={11} fill="#A855F7" />
          <Path d="M51.1 122.3Q51.1 102 72 102Q92.9 102 92.9 122.3Z" fill="#A855F7" />
          <Rect x={57} y={122} width={30} height={48} rx={12} fill="#A855F7" />
        </G>
        <G opacity={0.5}>
          <Circle cx={40} cy={86} r={11} fill={color} />
          <Path d="M19.1 122.3Q19.1 102 40 102Q60.9 102 60.9 122.3Z" fill={color} />
          <Rect x={25} y={122} width={30} height={48} rx={12} fill={color} />
        </G>
        <G id="anim-float-ticket">
          <G transform="rotate(-12 106 44)">
            <Path d="M93 32H112A4 4 0 0 0 120 32H123Q128 32 128 37V51Q128 56 123 56H120A4 4 0 0 0 112 56H93Q88 56 88 51V37Q88 32 93 32Z" fill="#FF6B6B" />
          </G>
        </G>
        <G id="anim-turn-hourglass">
          <Path d="M24 32Q24 42 30 46Q24 50 24 60H38Q38 50 32 46Q38 42 38 32Z" fill="#FDFBF7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M21 32H41M21 60H41" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
  );
}
