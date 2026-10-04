import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Events — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Events({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="events-ev-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={56} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={48} y={50} width={104} height={116} rx={14} fill="#4338CA" />
        <Rect x={40} y={42} width={104} height={116} rx={14} fill="url(#events-ev-c)" stroke={color} strokeWidth={5} />
        <Path d="M40 56Q40 42 54 42H130Q144 42 144 56V70H40Z" fill={color} />
        <Path d="M66 32V50M118 32V50" stroke="#4338CA" strokeWidth={7} strokeLinecap="round" />
        <Path d="M66 32V48M118 32V48" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={58} cy={88} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={78} cy={88} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={98} cy={88} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={118} cy={88} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={58} cy={108} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={78} cy={108} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={118} cy={108} r={4} fill={color} fillOpacity={0.22} />
        <Circle cx={58} cy={128} r={4} fill={color} fillOpacity={0.12} />
        <Circle cx={78} cy={128} r={4} fill={color} fillOpacity={0.12} />
        <Circle cx={98} cy={128} r={4} fill={color} fillOpacity={0.12} />
        <Circle cx={118} cy={128} r={4} fill={color} fillOpacity={0.12} />
        <Rect x={88} y={98} width={20} height={20} rx={6} fill="#FF6B6B" />
        <G transform="rotate(-12 150 138)">
          <Path d="M125 120H156.5A5.5 5.5 0 0 0 167.5 120H177Q184 120 184 127V151Q184 158 177 158H167.5A5.5 5.5 0 0 0 156.5 158H125Q118 158 118 151V127Q118 120 125 120Z" fill="#4338CA" transform="translate(5 6)" />
          <Path d="M125 120H156.5A5.5 5.5 0 0 0 167.5 120H177Q184 120 184 127V151Q184 158 177 158H167.5A5.5 5.5 0 0 0 156.5 158H125Q118 158 118 151V127Q118 120 125 120Z" fill="#FDFBF7" stroke={color} strokeWidth={4.5} strokeLinejoin="round" />
          <Path d="M162 128V150" stroke={color} strokeOpacity={0.45} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 4" />
          <Path d="M128 133H150M128 144H142" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M170 45C172 52 172 52 179 54C172 56 172 56 170 63C168 56 168 56 161 54C168 52 168 52 170 45Z" fill="#A855F7" />
          <Path d="M24 98C25.3 102.7 25.3 102.7 30 104C25.3 105.3 25.3 105.3 24 110C22.7 105.3 22.7 105.3 18 104C22.7 102.7 22.7 102.7 24 98Z" fill={color} />
        </G>
      </Svg>
  );
}
