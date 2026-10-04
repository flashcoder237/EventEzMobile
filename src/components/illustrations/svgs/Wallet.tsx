import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Wallet — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Wallet({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="wallet-wt-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="wallet-wt-a" x1={0} y1={0} x2={1} y2={1}>
            <Stop offset={0} stopColor={color} />
            <Stop offset={1} stopColor="#4338CA" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-10 100 70)">
          <Rect x={52} y={40} width={92} height={56} rx={9} fill="#A855F7" />
          <Rect x={52} y={40} width={92} height={56} rx={9} stroke="#4338CA" strokeWidth={3} />
          <Rect x={62} y={52} width={16} height={12} rx={3} fill="#FDFBF7" fillOpacity={0.85} />
        </G>
        <Rect x={44} y={76} width={124} height={90} rx={16} fill="#4338CA" />
        <Rect x={34} y={68} width={124} height={90} rx={16} fill="url(#wallet-wt-a)" />
        <Path d="M44 80H148" stroke="#FDFBF7" strokeWidth={3} strokeOpacity={0.2} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={116} y={98} width={54} height={32} rx={12} fill="url(#wallet-wt-c)" stroke={color} strokeWidth={4} />
        <Circle cx={134} cy={114} r={6} fill="#FF6B6B" />
        <G id="anim-float-coin">
          <Circle cx={36} cy={56} r={14} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={36} cy={56} r={7} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M172 44C173.8 50.2 173.8 50.2 180 52C173.8 53.8 173.8 53.8 172 60C170.2 53.8 170.2 53.8 164 52C170.2 50.2 170.2 50.2 172 44Z" fill="#A855F7" />
          <Path d="M24 114C25.3 118.7 25.3 118.7 30 120C25.3 121.3 25.3 121.3 24 126C22.7 121.3 22.7 121.3 18 120C22.7 118.7 22.7 118.7 24 114Z" fill={color} />
        </G>
      </Svg>
  );
}
