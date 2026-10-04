import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Observations — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Observations({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="observations-ob-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M38 24H116L132 40V154Q132 164 122 164H38Q28 164 28 154V34Q28 24 38 24Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M38 24H116L132 40V154Q132 164 122 164H38Q28 164 28 154V34Q28 24 38 24Z" fill="url(#observations-ob-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M116 24V40H132" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={44} cy={52} r={4} fill={color} fillOpacity={0.35} />
        <Path d="M56 52H108" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={44} cy={74} r={4} fill={color} fillOpacity={0.35} />
        <Path d="M56 74H94" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={44} cy={96} r={4} fill="#FF6B6B" />
        <Path d="M56 96H108" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={44} cy={118} r={4} fill={color} fillOpacity={0.35} />
        <Path d="M56 118H94" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={44} cy={140} r={4} fill={color} fillOpacity={0.35} />
        <Path d="M56 140H108" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M149.6 127.6L170 150" stroke="#4338CA" strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M155 133.5L168.7 148.5" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={133} cy={110} r={30} fill="#4338CA" />
        <Circle cx={128} cy={104} r={28} fill="url(#observations-ob-c)" stroke={color} strokeWidth={7} />
        <Path d="M111.2 98.4Q114 87.2 125.2 84.4" stroke={color} strokeWidth={4} strokeOpacity={0.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M114 104Q128 90 142 104Q128 118 114 104Z" fill={color} />
        <Circle cx={128} cy={104} r={4.5} fill="#FDFBF7" />
        <G id="anim-twinkle-sparkles">
          <Path d="M170 27C172 34 172 34 179 36C172 38 172 38 170 45C168 38 168 38 161 36C168 34 168 34 170 27Z" fill="#A855F7" />
          <Path d="M20 166C21.3 170.7 21.3 170.7 26 172C21.3 173.3 21.3 173.3 20 178C18.7 173.3 18.7 173.3 14 172C18.7 170.7 18.7 170.7 20 166Z" fill={color} />
        </G>
      </Svg>
  );
}
