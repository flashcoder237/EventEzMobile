import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * GroupVideo — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function GroupVideo({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="groupvideo-gv-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={29} y={39} width={156} height={120} rx={14} fill="#4338CA" />
        <Rect x={22} y={30} width={156} height={120} rx={14} fill="url(#groupvideo-gv-c)" stroke={color} strokeWidth={5} />
        <Rect x={32} y={40} width={66} height={46} rx={8} fill={color} fillOpacity={0.14} />
        <Circle cx={65} cy={58} r={7} fill={color} />
        <Path d="M51.7 81.1Q51.7 68.2 65 68.2Q78.3 68.2 78.3 81.1Z" fill={color} />
        <Rect x={102} y={40} width={66} height={46} rx={8} fill="#A855F7" fillOpacity={0.14} />
        <Circle cx={135} cy={58} r={7} fill="#A855F7" />
        <Path d="M121.7 81.1Q121.7 68.2 135 68.2Q148.3 68.2 148.3 81.1Z" fill="#A855F7" />
        <Rect x={32} y={94} width={66} height={46} rx={8} fill="#A855F7" fillOpacity={0.14} />
        <Circle cx={65} cy={112} r={7} fill="#A855F7" />
        <Path d="M51.7 135.1Q51.7 122.2 65 122.2Q78.3 122.2 78.3 135.1Z" fill="#A855F7" />
        <Rect x={102} y={94} width={66} height={46} rx={8} fill={color} fillOpacity={0.14} />
        <Circle cx={135} cy={112} r={7} fill={color} />
        <Path d="M121.7 135.1Q121.7 122.2 135 122.2Q148.3 122.2 148.3 135.1Z" fill={color} />
        <Rect x={102} y={40} width={66} height={46} rx={8} stroke="#FF6B6B" strokeWidth={3} />
        <Path d="M74 160H126" stroke="#4338CA" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M100 150V160" stroke="#4338CA" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-live">
          <Circle cx={160} cy={48} r={4.5} fill="#FF6B6B" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M180 15C181.5 20.5 181.5 20.5 187 22C181.5 23.5 181.5 23.5 180 29C178.5 23.5 178.5 23.5 173 22C178.5 20.5 178.5 20.5 180 15Z" fill="#A855F7" />
          <Path d="M18 158C19.3 162.7 19.3 162.7 24 164C19.3 165.3 19.3 165.3 18 170C16.7 165.3 16.7 165.3 12 164C16.7 162.7 16.7 162.7 18 158Z" fill={color} />
        </G>
      </Svg>
  );
}
