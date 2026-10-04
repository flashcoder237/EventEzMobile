import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ExhibitorReview — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ExhibitorReview({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="exhibitorreview-er-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={76} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={30} y={62} width={140} height={22} rx={6} fill={color} />
        <Path d="M44 73H156" stroke="#FDFBF7" strokeWidth={3} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M40 84V150M160 84V150" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 128H150V168H50Z" fill="#4338CA" transform="translate(5 6)" />
        <Path d="M50 128H150V168H50Z" fill="url(#exhibitorreview-er-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={64} y={140} width={72} height={10} rx={5} fill="#A855F7" fillOpacity={0.4} />
        <Rect x={146} y={90} width={26} height={76} rx={4} fill="#A855F7" />
        <Circle cx={159} cy={108} r={6} fill="#FDFBF7" />
        <Path d="M152 124H166M152 134H162" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-turn-hourglass">
          <Path d="M76 24Q76 38 86 44Q76 50 76 64H96Q96 50 86 44Q96 38 96 24Z" fill="#FDFBF7" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M80 30H92Q90 38 86 41Q82 38 80 30Z" fill="#FF6B6B" />
          <Path d="M72 23H100M72 65H100" stroke="#4338CA" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M130 29C131.5 34.5 131.5 34.5 137 36C131.5 37.5 131.5 37.5 130 43C128.5 37.5 128.5 37.5 123 36C128.5 34.5 128.5 34.5 130 29Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
