import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Anniversary — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Anniversary({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Rect x={14} y={34} width={36} height={22} rx={6} fill="#FDFBF7" stroke={color} strokeWidth={3} />
        <Path d="M14 42Q23 47 32 42Q41 47 50 42" stroke="#FF6B6B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={14} y={50} width={36} height={6} rx={3} fill="#F5B841" />
        <Path d="M32 34V22" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-flame-core">
          <Path d="M32 20C28 16 30 11 32 8C34 11 36 16 32 20Z" fill="#FF9F43" />
        </G>
        <Path d="M6 58H58" stroke="#F5B841" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M52 11C53.1 14.9 53.1 14.9 57 16C53.1 17.1 53.1 17.1 52 21C50.9 17.1 50.9 17.1 47 16C50.9 14.9 50.9 14.9 52 11Z" fill="#F5B841" />
          <Path d="M12 18C12.9 21.1 12.9 21.1 16 22C12.9 22.9 12.9 22.9 12 26C11.1 22.9 11.1 22.9 8 22C11.1 21.1 11.1 21.1 12 18Z" fill="#F5B841" />
        </G>
      </Svg>
  );
}
