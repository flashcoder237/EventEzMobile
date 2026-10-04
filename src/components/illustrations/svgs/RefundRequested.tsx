import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * RefundRequested — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function RefundRequested({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="refundrequested-rq-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={182} rx={52} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M44 30H124V168L114 160L104 168L94 160L84 168L74 160L64 168L54 160L44 168Z" fill="#4338CA" transform="translate(7 8)" />
        <Path d="M44 30H124V168L114 160L104 168L94 160L84 168L74 160L64 168L54 160L44 168Z" fill="url(#refundrequested-rq-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={58} y={46} width={36} height={8} rx={4} fill={color} />
        <Path d="M58 74H108" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 90H98" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 106H104" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 126H110" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 5" />
        <Circle cx={146} cy={120} r={26} fill={color} fillOpacity={0.12} />
        <Path d="M158 110A14 14 0 1 0 160 126" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M150 108L159 110L160 101" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-plane">
          <Path d="M140 47.2L177.4 34L164.2 67L157.6 53.8Z" fill="#FDFBF7" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M157.6 53.8L177.4 34" stroke="#A855F7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M180 154C181.3 158.7 181.3 158.7 186 160C181.3 161.3 181.3 161.3 180 166C178.7 161.3 178.7 161.3 174 160C178.7 158.7 178.7 158.7 180 154Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
