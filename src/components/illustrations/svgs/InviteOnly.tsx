import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * InviteOnly — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function InviteOnly({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="inviteonly-io-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M44 176V64Q44 30 78 30H122Q156 30 156 64V176" fill="#4338CA" transform="translate(6 0)" />
        <Path d="M44 176V64Q44 30 78 30H122Q156 30 156 64V176Z" fill="url(#inviteonly-io-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={58} y={50} width={84} height={50} rx={8} fill={color} fillOpacity={0.08} />
        <Rect x={58} y={110} width={84} height={50} rx={8} fill={color} fillOpacity={0.08} />
        <Circle cx={134} cy={128} r={5} fill={color} />
        <G id="anim-float-card">
          <G transform="rotate(-10 100 108)">
            <Rect x={70} y={88} width={64} height={42} rx={6} fill="#FDFBF7" stroke="#A855F7" strokeWidth={4} />
            <Path d="M80 104H112M80 116H100" stroke="#A855F7" strokeWidth={3.5} strokeOpacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={122} cy={98} r={6} fill="#FF6B6B" />
          </G>
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M172 41C174 48 174 48 181 50C174 52 174 52 172 59C170 52 170 52 163 50C170 48 170 48 172 41Z" fill="#A855F7" />
          <Path d="M24 74C25.3 78.7 25.3 78.7 30 80C25.3 81.3 25.3 81.3 24 86C22.7 81.3 22.7 81.3 18 80C22.7 78.7 22.7 78.7 24 74Z" fill="#FF6B6B" />
        </G>
      </Svg>
  );
}
