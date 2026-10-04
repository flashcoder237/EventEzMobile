import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * WelcomeBack — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function WelcomeBack({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Rect x={18} y={14} width={48} height={72} rx={6} fill={color} fillOpacity={0.12} />
        <Rect x={18} y={14} width={48} height={72} rx={6} stroke={color} strokeWidth={4} />
        <Path d="M18 14L52 22V82L18 86Z" fill="#FDFBF7" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={46} cy={52} r={3} fill={color} />
        <G id="anim-float-poster">
          <G transform="rotate(8 76 40)">
            <Rect x={62} y={18} width={28} height={38} rx={4} fill="#FF6B6B" />
            <Path d="M68 28H84M68 36H80" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </G>
        </G>
        <Path d="M66 84H86" stroke="#F5B841" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
