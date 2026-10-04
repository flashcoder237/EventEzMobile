import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * RefundUnavailable — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function RefundUnavailable({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="refundunavailable-ru-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={182} rx={52} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M44 30H124V168L114 160L104 168L94 160L84 168L74 160L64 168L54 160L44 168Z" fill="#4338CA" transform="translate(7 8)" />
        <Path d="M44 30H124V168L114 160L104 168L94 160L84 168L74 160L64 168L54 160L44 168Z" fill="url(#refundunavailable-ru-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={58} y={46} width={36} height={8} rx={4} fill={color} />
        <Path d="M58 74H108" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 90H98" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 106H104" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={148} cy={116} r={24} fill="#FDFBF7" stroke="#A855F7" strokeWidth={5} />
        <Circle cx={148} cy={104} r={3.5} fill="#A855F7" />
        <Path d="M148 114V128" stroke="#A855F7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M172 42C173.8 48.2 173.8 48.2 180 50C173.8 51.8 173.8 51.8 172 58C170.2 51.8 170.2 51.8 164 50C170.2 48.2 170.2 48.2 172 42Z" fill="#A855F7" />
          <Path d="M24 114C25.3 118.7 25.3 118.7 30 120C25.3 121.3 25.3 121.3 24 126C22.7 121.3 22.7 121.3 18 120C22.7 118.7 22.7 118.7 24 114Z" fill={color} />
        </G>
      </Svg>
  );
}
