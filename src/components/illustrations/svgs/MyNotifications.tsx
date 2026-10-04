import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * MyNotifications — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function MyNotifications({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="mynotifications-mn-c" x1={0} y1={0} x2={1} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#ECE6F8" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={104} cy={172} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={104} cy={156} r={10} fill="#4338CA" />
        <Path d="M66 134Q76 122 76 100Q76 64 104 60Q132 64 132 100Q132 122 142 134Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M66 134Q76 122 76 100Q76 64 104 60Q132 64 132 100Q132 122 142 134Z" fill="url(#mynotifications-mn-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Rect x={58} y={132} width={92} height={12} rx={6} fill={color} />
        <Circle cx={104} cy={52} r={7} fill={color} />
        <Path d="M90 82Q92 72 100 70" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={130} cy={70} r={10} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <G id="anim-wave-ring">
          <Path d="M156 82Q164 98 156 114" stroke="#A855F7" strokeWidth={4} strokeLinecap="round" />
          <Path d="M168 74Q180 98 168 122" stroke="#A855F7" strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" />
        </G>
        <G id="anim-float-card">
          <Rect x={18} y={28} width={62} height={28} rx={9} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
          <Circle cx={32} cy={42} r={6.5} fill="#A855F7" />
          <Path d="M45 37H70M45 47H60" stroke={color} strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" />
        </G>
      </Svg>
  );
}
