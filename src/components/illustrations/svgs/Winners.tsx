import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Winners — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Winners({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="winners-wn-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={76} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={78} y={104} width={48} height={82} rx={6} fill="#4338CA" />
        <Rect x={72} y={98} width={48} height={82} rx={6} fill={color} stroke={color} strokeWidth={4} />
        <Circle cx={96} cy={116} r={4} fill="#FDFBF7" />
        <Rect x={32} y={132} width={48} height={54} rx={6} fill="#4338CA" />
        <Rect x={26} y={126} width={48} height={54} rx={6} fill="url(#winners-wn-c)" stroke={color} strokeWidth={4} />
        <Circle cx={44} cy={144} r={4} fill={color} />
        <Circle cx={56} cy={144} r={4} fill={color} />
        <Rect x={132} y={146} width={48} height={40} rx={6} fill="#4338CA" />
        <Rect x={126} y={140} width={48} height={40} rx={6} fill="url(#winners-wn-c)" stroke={color} strokeWidth={4} />
        <Circle cx={138} cy={158} r={4} fill={color} />
        <Circle cx={150} cy={158} r={4} fill={color} />
        <Circle cx={162} cy={158} r={4} fill={color} />
        <Path d="M84 46H116V58A16 16 0 0 1 84 58Z" fill="#FF6B6B" />
        <Path d="M84 50H76V54A8 8 0 0 0 86 62M116 50H124V54A8 8 0 0 1 114 62" stroke="#FF6B6B" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M100 74V84M90 88H110" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M56 45C58 52 58 52 65 54C58 56 58 56 56 63C54 56 54 56 47 54C54 52 54 52 56 45Z" fill="#A855F7" />
          <Path d="M146 54C147.8 60.2 147.8 60.2 154 62C147.8 63.8 147.8 63.8 146 70C144.2 63.8 144.2 63.8 138 62C144.2 60.2 144.2 60.2 146 54Z" fill={color} />
          <Path d="M100 20C101.3 24.7 101.3 24.7 106 26C101.3 27.3 101.3 27.3 100 32C98.7 27.3 98.7 27.3 94 26C98.7 24.7 98.7 24.7 100 20Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
