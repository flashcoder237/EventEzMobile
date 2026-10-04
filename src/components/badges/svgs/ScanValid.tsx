import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ScanValid — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ScanValid({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Circle cx={51} cy={52} r={40} fill="#047857" />
        <Circle cx={48} cy={48} r={40} fill="#10B981" />
        <Circle cx={48} cy={48} r={31} stroke="#FFFFFF" strokeWidth={3} strokeOpacity={0.35} />
        <Path d="M31 49L43 61L66 37" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
