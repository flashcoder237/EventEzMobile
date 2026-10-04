import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * MemoriesEmpty — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function MemoriesEmpty({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="memoriesempty-me-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={66} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-12 58 100)">
          <Rect x={29} y={67} width={68} height={80} rx={6} fill="#4338CA" />
          <Rect x={24} y={60} width={68} height={80} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Rect x={32} y={68} width={52} height={46} rx={4} fill="#A855F7" fillOpacity={0.15} />
          <Rect x={32} y={68} width={52} height={46} rx={4} stroke="#A855F7" strokeWidth={2.5} strokeDasharray="3 5" />
        </G>
        <G transform="rotate(10 142 98)">
          <Rect x={113} y={65} width={68} height={80} rx={6} fill="#4338CA" />
          <Rect x={108} y={58} width={68} height={80} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Rect x={116} y={66} width={52} height={46} rx={4} fill={color} fillOpacity={0.15} />
          <Rect x={116} y={66} width={52} height={46} rx={4} stroke={color} strokeWidth={2.5} strokeDasharray="3 5" />
        </G>
        <G transform="rotate(-2 98 86)">
          <Rect x={69} y={53} width={68} height={80} rx={6} fill="#4338CA" />
          <Rect x={64} y={46} width={68} height={80} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Rect x={72} y={54} width={52} height={46} rx={4} fill={color} fillOpacity={0.15} />
          <Rect x={72} y={54} width={52} height={46} rx={4} stroke={color} strokeWidth={2.5} strokeDasharray="3 5" />
        </G>
        <Path d="M98 54V40" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={98} cy={38} r={6} fill="#FF6B6B" />
        <G id="anim-twinkle-sparkles">
          <Path d="M172 32C173.8 38.2 173.8 38.2 180 40C173.8 41.8 173.8 41.8 172 48C170.2 41.8 170.2 41.8 164 40C170.2 38.2 170.2 38.2 172 32Z" fill="#A855F7" />
          <Path d="M24 34C25.3 38.7 25.3 38.7 30 40C25.3 41.3 25.3 41.3 24 46C22.7 41.3 22.7 41.3 18 40C22.7 38.7 22.7 38.7 24 34Z" fill={color} />
        </G>
      </Svg>
  );
}
