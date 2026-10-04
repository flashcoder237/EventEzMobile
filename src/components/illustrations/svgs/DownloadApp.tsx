import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * DownloadApp — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function DownloadApp({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="downloadapp-da-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="downloadapp-da-g" x1={0} y1={0} x2={1} y2={0}>
            <Stop offset={0} stopColor="#6D28D9" />
            <Stop offset={1} stopColor="#EC4899" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={50} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={63} y={34} width={88} height={156} rx={16} fill="#4338CA" />
        <Rect x={56} y={24} width={88} height={156} rx={16} fill="url(#downloadapp-da-c)" stroke={color} strokeWidth={5} />
        <Rect x={64} y={40} width={72} height={126} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={91} y={31} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={88} y={171} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Path d="M80 50H120Q128 50 128 58V103A5 5 0 0 0 128 113V126Q128 134 120 134H80Q72 134 72 126V113A5 5 0 0 0 72 103V58Q72 50 80 50Z" fill="#FDFBF7" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={80} y={60} width={40} height={30} rx={5} fill="url(#downloadapp-da-g)" />
        <Path d="M82 102H112" stroke={color} strokeWidth={3.5} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M90 118H110" stroke={color} strokeWidth={2.5} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 4" />
        <Circle cx={100} cy={156} r={12} fill="#FF6B6B" />
        <Path d="M100 150V161M95 157L100 162L105 157" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-arrow">
          <Path d="M164 40V70M154 60L164 70L174 60" stroke="#A855F7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 52C31.8 58.2 31.8 58.2 38 60C31.8 61.8 31.8 61.8 30 68C28.2 61.8 28.2 61.8 22 60C28.2 58.2 28.2 58.2 30 52Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
