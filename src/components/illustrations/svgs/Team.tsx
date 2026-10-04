import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Team — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Team({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="team-tm-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={52} cy={96} r={22} fill="#A855F7" fillOpacity={0.15} />
        <Circle cx={52} cy={92} r={13} fill="#A855F7" />
        <Path d="M27.3 134.9Q27.3 110.8 52 110.8Q76.7 110.8 76.7 134.9Z" fill="#A855F7" />
        <Circle cx={148} cy={96} r={22} fill="#A855F7" fillOpacity={0.15} />
        <Circle cx={148} cy={92} r={13} fill="#A855F7" />
        <Path d="M123.3 134.9Q123.3 110.8 148 110.8Q172.7 110.8 172.7 134.9Z" fill="#A855F7" />
        <Circle cx={100} cy={82} r={30} fill={color} fillOpacity={0.15} />
        <Circle cx={100} cy={76} r={18} fill={color} />
        <Path d="M65.8 135.4Q65.8 102.1 100 102.1Q134.2 102.1 134.2 135.4Z" fill={color} />
        <Rect x={28} y={140} width={144} height={26} rx={13} fill="#4338CA" />
        <Rect x={24} y={134} width={152} height={26} rx={13} fill="url(#team-tm-c)" stroke={color} strokeWidth={4.5} />
        <Circle cx={100} cy={147} r={5} fill="#FF6B6B" />
        <Path d="M44 147H80" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M120 147H156" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M40 32C41.8 38.2 41.8 38.2 48 40C41.8 41.8 41.8 41.8 40 48C38.2 41.8 38.2 41.8 32 40C38.2 38.2 38.2 38.2 40 32Z" fill="#A855F7" />
          <Path d="M166 33C167.5 38.5 167.5 38.5 173 40C167.5 41.5 167.5 41.5 166 47C164.5 41.5 164.5 41.5 159 40C164.5 38.5 164.5 38.5 166 33Z" fill="#FF6B6B" />
          <Path d="M100 19C101.1 22.9 101.1 22.9 105 24C101.1 25.1 101.1 25.1 100 29C98.9 25.1 98.9 25.1 95 24C98.9 22.9 98.9 22.9 100 19Z" fill={color} />
        </G>
      </Svg>
  );
}
