import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * PersonalEmail — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function PersonalEmail({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="personalemail-pe-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={46} y={30} width={108} height={100} rx={10} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={76} cy={62} r={14} fill={color} fillOpacity={0.15} />
        <Circle cx={76} cy={58} r={8} fill={color} />
        <Path d="M60.8 84.4Q60.8 69.6 76 69.6Q91.2 69.6 91.2 84.4Z" fill={color} />
        <Path d="M98 54H138" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M98 66H126" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M60 96H140" stroke={color} strokeWidth={4} strokeOpacity={0.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M60 108H120" stroke={color} strokeWidth={4} strokeOpacity={0.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M36 96L100 140L164 96V164Q164 176 152 176H48Q36 176 36 164Z" fill="#4338CA" transform="translate(6 6)" />
        <Path d="M36 96L100 140L164 96V164Q164 176 152 176H48Q36 176 36 164Z" fill="url(#personalemail-pe-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M40 172L84 134M160 172L116 134" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={160} cy={34} r={12} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <G id="anim-twinkle-sparkles">
          <Path d="M28 44C29.8 50.2 29.8 50.2 36 52C29.8 53.8 29.8 53.8 28 60C26.2 53.8 26.2 53.8 20 52C26.2 50.2 26.2 50.2 28 44Z" fill="#A855F7" />
          <Path d="M184 74C185.3 78.7 185.3 78.7 190 80C185.3 81.3 185.3 81.3 184 86C182.7 81.3 182.7 81.3 178 80C182.7 78.7 182.7 78.7 184 74Z" fill={color} />
        </G>
      </Svg>
  );
}
