import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TicketsSaveOffline — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TicketsSaveOffline({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="ticketssaveoffline-tso-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={110} cy={184} rx={48} ry={5} fill={color} fillOpacity={0.12} />
        <G id="anim-float-cloud">
          <Path d="M54 66Q44 66 44 56Q44 46 54 46Q56 34 70 34Q80 34 85 42Q88 40 92 40Q102 40 102 52Q110 54 110 60Q110 66 102 66Z" fill="#FDFBF7" stroke="#A855F7" strokeWidth={4} strokeLinejoin="round" transform="translate(-14 4)" />
        </G>
        <Rect x={91} y={44} width={82} height={146} rx={16} fill="#4338CA" />
        <Rect x={84} y={34} width={82} height={146} rx={16} fill="url(#ticketssaveoffline-tso-c)" stroke={color} strokeWidth={5} />
        <Rect x={92} y={50} width={66} height={116} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={116} y={41} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={113} y={171} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Path d="M107 60H143Q152 60 152 69V104.5A5.5 5.5 0 0 0 152 115.5V131Q152 140 143 140H107Q98 140 98 131V115.5A5.5 5.5 0 0 0 98 104.5V69Q98 60 107 60Z" fill="#FDFBF7" stroke={color} strokeWidth={4} strokeLinejoin="round" />
        <Rect x={108} y={70} width={34} height={26} rx={6} fill={color} fillOpacity={0.16} />
        <Path d="M112 90L120 82L127 88L133 84L140 90" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M108 104H136" stroke={color} strokeOpacity={0.4} strokeWidth={3.5} strokeLinecap="round" />
        <Path d="M106 110H144" stroke={color} strokeOpacity={0.4} strokeWidth={2.5} strokeDasharray="2 4" strokeLinecap="round" transform="translate(0 0)" />
        <Path d="M108 124H128" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" />
        <Path d="M66 76V110" stroke={color} strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 6" />
        <Circle cx={66} cy={132} r={18} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <Path d="M66 123V140M59 134L66 141L73 134" stroke="#FDFBF7" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M176 32C177.8 38.2 177.8 38.2 184 40C177.8 41.8 177.8 41.8 176 48C174.2 41.8 174.2 41.8 168 40C174.2 38.2 174.2 38.2 176 32Z" fill="#A855F7" />
          <Path d="M30 164C31.3 168.7 31.3 168.7 36 170C31.3 171.3 31.3 171.3 30 176C28.7 171.3 28.7 171.3 24 170C28.7 168.7 28.7 168.7 30 164Z" fill={color} />
        </G>
      </Svg>
  );
}
