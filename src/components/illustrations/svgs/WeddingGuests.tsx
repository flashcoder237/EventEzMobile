import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * WeddingGuests — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function WeddingGuests({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="weddingguests-wg-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={100} cy={42} r={10} fill={color} fillOpacity={0.35} />
        <Rect x={86} y={24} width={28} height={9} rx={2.5} fill="#FDFBF7" stroke={color} strokeWidth={2} />
        <Circle cx={141} cy={59} r={10} fill="#A855F7" fillOpacity={0.35} />
        <Circle cx={158} cy={100} r={10} fill={color} fillOpacity={0.35} />
        <Rect x={144} y={82} width={28} height={9} rx={2.5} fill="#FDFBF7" stroke={color} strokeWidth={2} />
        <Circle cx={141} cy={141} r={10} fill="#A855F7" fillOpacity={0.35} />
        <Circle cx={100} cy={158} r={10} fill={color} fillOpacity={0.35} />
        <Rect x={86} y={168} width={28} height={9} rx={2.5} fill="#FDFBF7" stroke={color} strokeWidth={2} />
        <Circle cx={59} cy={141} r={10} fill="#A855F7" fillOpacity={0.35} />
        <Circle cx={42} cy={100} r={10} fill={color} fillOpacity={0.35} />
        <Rect x={28} y={82} width={28} height={9} rx={2.5} fill="#FDFBF7" stroke={color} strokeWidth={2} />
        <Circle cx={59} cy={59} r={10} fill="#A855F7" fillOpacity={0.35} />
        <Circle cx={104} cy={105} r={40} fill="#4338CA" />
        <Circle cx={100} cy={100} r={40} fill="url(#weddingguests-wg-c)" stroke={color} strokeWidth={5} />
        <G id="anim-pulse-heart">
          <Path d="M100 110.8C84.4 101.2 86.8 88.6 94 88.6C97.6 88.6 100 91 100 94C100 91 102.4 88.6 106 88.6C113.2 88.6 115.6 101.2 100 110.8Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
