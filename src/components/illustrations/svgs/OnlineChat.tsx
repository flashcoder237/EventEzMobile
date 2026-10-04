import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * OnlineChat — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function OnlineChat({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="onlinechat-oc-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={36} cy={66} r={16} fill="#A855F7" fillOpacity={0.18} />
        <Circle cx={36} cy={62} r={9} fill="#A855F7" />
        <Path d="M18.9 91.7Q18.9 75 36 75Q53.1 75 53.1 91.7Z" fill="#A855F7" />
        <Path d="M62 38H150Q164 38 164 52V74Q164 88 150 88H76L62 98Z" fill="#4338CA" transform="translate(5 7)" />
        <Path d="M62 38H150Q164 38 164 52V74Q164 88 150 88H76L62 98Z" fill="url(#onlinechat-oc-c)" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M78 56H140" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M78 70H118" stroke={color} strokeWidth={4} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={164} cy={140} r={16} fill={color} fillOpacity={0.18} />
        <Circle cx={164} cy={136} r={9} fill={color} />
        <Path d="M146.9 165.7Q146.9 149.1 164 149.1Q181.1 149.1 181.1 165.7Z" fill={color} />
        <Path d="M138 110H50Q36 110 36 124V146Q36 160 50 160H124L138 170Z" fill={color} />
        <G id="anim-pulse-typing">
          <Circle cx={64} cy={135} r={5} fill="#FDFBF7" />
          <Circle cx={84} cy={135} r={5} fill="#FDFBF7" />
          <Circle cx={104} cy={135} r={5} fill="#FDFBF7" />
        </G>
        <Circle cx={150} cy={40} r={7} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3} />
        <G id="anim-twinkle-sparkles">
          <Path d="M22 113C23.5 118.5 23.5 118.5 29 120C23.5 121.5 23.5 121.5 22 127C20.5 121.5 20.5 121.5 15 120C20.5 118.5 20.5 118.5 22 113Z" fill="#A855F7" />
          <Path d="M186 84C187.3 88.7 187.3 88.7 192 90C187.3 91.3 187.3 91.3 186 96C184.7 91.3 184.7 91.3 180 90C184.7 88.7 184.7 88.7 186 84Z" fill={color} />
        </G>
      </Svg>
  );
}
