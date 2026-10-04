import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Offline — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Offline({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="offline-of-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={44} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={73} y={106} width={68} height={82} rx={14} fill="#4338CA" />
        <Rect x={66} y={96} width={68} height={82} rx={14} fill="url(#offline-of-c)" stroke={color} strokeWidth={5} />
        <Rect x={91} y={103} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={88} y={169} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Rect x={74} y={108} width={52} height={58} rx={7} fill={color} fillOpacity={0.07} />
        <Path d="M84 130H116M84 142H106" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={100} cy={80} r={7} fill="#FF6B6B" />
        <Path d="M84 64A23 23 0 0 1 116 64" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <Path d="M68 48A45 45 0 0 1 90 37" stroke={color} strokeOpacity={0.55} strokeWidth={7} strokeLinecap="round" />
        <Path d="M110 37A45 45 0 0 1 132 48" stroke={color} strokeOpacity={0.55} strokeWidth={7} strokeLinecap="round" />
        <G id="anim-wave-signal">
          <Path d="M52 32A68 68 0 0 1 148 32" stroke="#A855F7" strokeOpacity={0.55} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" />
        </G>
        <Circle cx={146} cy={150} r={20} fill="#FDFBF7" stroke="#A855F7" strokeWidth={4} />
        <G id="anim-spin-retry">
          <Path d="M154 144A10 10 0 1 0 155 156" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" />
          <Path d="M148 143L155 144L156 137" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 103C31.5 108.5 31.5 108.5 37 110C31.5 111.5 31.5 111.5 30 117C28.5 111.5 28.5 111.5 23 110C28.5 108.5 28.5 108.5 30 103Z" fill="#A855F7" />
          <Path d="M178 87C179.1 90.9 179.1 90.9 183 92C179.1 93.1 179.1 93.1 178 97C176.9 93.1 176.9 93.1 173 92C176.9 90.9 176.9 90.9 178 87Z" fill={color} />
        </G>
      </Svg>
  );
}
