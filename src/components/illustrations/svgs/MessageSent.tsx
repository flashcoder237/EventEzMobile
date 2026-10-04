import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * MessageSent — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function MessageSent({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="messagesent-ms-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={90} cy={180} rx={52} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={37} y={105} width={108} height={72} rx={10} fill="#4338CA" />
        <Rect x={30} y={96} width={108} height={72} rx={10} fill="url(#messagesent-ms-c)" stroke={color} strokeWidth={5} />
        <Path d="M36 102L78 133.4Q84 137.8 90 133.4L132 102" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M40 92C60 70 96 76 120 56" stroke="#A855F7" strokeWidth={3} strokeOpacity={0.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 7" />
        <G id="anim-float-plane">
          <Path d="M120 40L171 22L153 67L144 49Z" fill="#FDFBF7" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M144 49L171 22" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Circle cx={138} cy={104} r={13} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <Path d="M132 104L136 108L144 100" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M176 102C177.8 108.2 177.8 108.2 184 110C177.8 111.8 177.8 111.8 176 118C174.2 111.8 174.2 111.8 168 110C174.2 108.2 174.2 108.2 176 102Z" fill="#A855F7" />
          <Path d="M26 44C27.3 48.7 27.3 48.7 32 50C27.3 51.3 27.3 51.3 26 56C24.7 51.3 24.7 51.3 20 50C24.7 48.7 24.7 48.7 26 44Z" fill={color} />
        </G>
      </Svg>
  );
}
