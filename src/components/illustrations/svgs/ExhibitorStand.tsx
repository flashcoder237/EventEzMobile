import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ExhibitorStand — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ExhibitorStand({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="exhibitorstand-es-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={76} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={30} y={62} width={140} height={22} rx={6} fill={color} />
        <Path d="M44 73H156" stroke="#FDFBF7" strokeWidth={3} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M40 84V150M160 84V150" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 128H150V168H50Z" fill="#4338CA" transform="translate(5 6)" />
        <Path d="M50 128H150V168H50Z" fill="url(#exhibitorstand-es-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={64} y={140} width={72} height={10} rx={5} fill="#A855F7" fillOpacity={0.4} />
        <Rect x={146} y={90} width={26} height={76} rx={4} fill="#A855F7" />
        <Circle cx={159} cy={108} r={6} fill="#FDFBF7" />
        <Path d="M152 124H166M152 134H162" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-plane">
          <Path d="M70 38.4L110.8 24L96.4 60L89.2 45.6Z" fill="#FDFBF7" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M89.2 45.6L110.8 24" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Circle cx={56} cy={104} r={10} fill="#FF6B6B" />
        <G id="anim-twinkle-sparkles">
          <Path d="M28 33C29.5 38.5 29.5 38.5 35 40C29.5 41.5 29.5 41.5 28 47C26.5 41.5 26.5 41.5 21 40C26.5 38.5 26.5 38.5 28 33Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
