import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * InteriorDesign — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function InteriorDesign({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="interiordesign-id-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={72} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={25} y={35} width={164} height={148} rx={16} fill="#4338CA" />
        <Rect x={18} y={26} width={164} height={148} rx={16} fill="url(#interiordesign-id-c)" stroke={color} strokeWidth={5} />
        <Rect x={30} y={38} width={140} height={22} rx={6} fill={color} />
        <Path d="M60 49H140" stroke="#FDFBF7" strokeWidth={3} strokeOpacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={82} cy={96} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={72} cy={113.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={52} cy={113.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={42} cy={96} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={52} cy={78.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={72} cy={78.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={62} cy={96} r={13} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={158} cy={96} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={148} cy={113.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={128} cy={113.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={118} cy={96} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={128} cy={78.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={148} cy={78.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={138} cy={96} r={13} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={82} cy={144} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={72} cy={161.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={52} cy={161.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={42} cy={144} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={52} cy={126.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={72} cy={126.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={62} cy={144} r={13} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={158} cy={144} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={148} cy={161.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={128} cy={161.3} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={118} cy={144} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={128} cy={126.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={148} cy={126.7} r={4.5} fill={color} fillOpacity={0.35} />
        <Circle cx={138} cy={144} r={13} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Path d="M100 70V170" stroke={color} strokeWidth={3} strokeOpacity={0.25} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 7" />
        <G id="anim-pulse-seat">
          <Circle cx={138} cy={146} r={6} fill="#FF6B6B" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M186 15C187.5 20.5 187.5 20.5 193 22C187.5 23.5 187.5 23.5 186 29C184.5 23.5 184.5 23.5 179 22C184.5 20.5 184.5 20.5 186 15Z" fill="#A855F7" />
          <Path d="M14 174C15.3 178.7 15.3 178.7 20 180C15.3 181.3 15.3 181.3 14 186C12.7 181.3 12.7 181.3 8 180C12.7 178.7 12.7 178.7 14 174Z" fill={color} />
        </G>
      </Svg>
  );
}
