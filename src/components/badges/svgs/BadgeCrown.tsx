import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * BadgeCrown — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function BadgeCrown({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path d="M30 64L22 92L34 86L40 94L46 70Z" fill="#FF6B6B" />
        <Path d="M66 64L74 92L62 86L56 94L50 70Z" fill="#FF6B6B" fillOpacity={0.85} />
        <Path d="M48 6L56.8 11.2L67 11.1L72 20L80.9 25L80.8 35.2L86 44L80.8 52.8L80.9 63L72 68L67 76.9L56.8 76.8L48 82L39.2 76.8L29 76.9L24 68L15.1 63L15.2 52.8L10 44L15.2 35.2L15.1 25L24 20L29 11.1L39.2 11.2Z" fill="#4338CA" stroke="#4338CA" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" transform="translate(3 4)" />
        <Path d="M48 6L56.8 11.2L67 11.1L72 20L80.9 25L80.8 35.2L86 44L80.8 52.8L80.9 63L72 68L67 76.9L56.8 76.8L48 82L39.2 76.8L29 76.9L24 68L15.1 63L15.2 52.8L10 44L15.2 35.2L15.1 25L24 20L29 11.1L39.2 11.2Z" fill={color} stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={48} cy={44} r={27} stroke="#FFFFFF" strokeWidth={2} strokeOpacity={0.35} />
        <G transform="translate(27.6 23.6) scale(1.7)" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z" />
          <Path d="M6 21h12" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M84 8C85.3 12.7 85.3 12.7 90 14C85.3 15.3 85.3 15.3 84 20C82.7 15.3 82.7 15.3 78 14C82.7 12.7 82.7 12.7 84 8Z" fill="#A855F7" />
          <Path d="M12 18C12.9 21.1 12.9 21.1 16 22C12.9 22.9 12.9 22.9 12 26C11.1 22.9 11.1 22.9 8 22C11.1 21.1 11.1 21.1 12 18Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
