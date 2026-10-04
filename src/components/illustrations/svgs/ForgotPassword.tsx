import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ForgotPassword — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ForgotPassword({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="forgotpassword-fp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={37} y={93} width={140} height={52} rx={26} fill="#4338CA" />
        <Rect x={30} y={84} width={140} height={52} rx={26} fill="url(#forgotpassword-fp-c)" stroke={color} strokeWidth={5} />
        <Circle cx={58} cy={110} r={6} fill={color} />
        <Circle cx={80} cy={110} r={6} fill={color} />
        <Circle cx={102} cy={110} r={6} fill={color} />
        <Circle cx={124} cy={110} r={6} fill={color} />
        <Path d="M140 104V116" stroke="#FF6B6B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M100 30A26 26 0 1 1 74 56" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 44L74 56L86 52" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-key">
          <Circle cx={150} cy={160} r={12} fill="#FDFBF7" stroke="#FF6B6B" strokeWidth={5} />
          <Path d="M140 168L120 186M128 178L124 174M124 182L120 178" stroke="#FF6B6B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M168 41C170 48 170 48 177 50C170 52 170 52 168 59C166 52 166 52 159 50C166 48 166 48 168 41Z" fill="#A855F7" />
          <Path d="M30 154C31.3 158.7 31.3 158.7 36 160C31.3 161.3 31.3 161.3 30 166C28.7 161.3 28.7 161.3 24 160C28.7 158.7 28.7 158.7 30 154Z" fill={color} />
        </G>
      </Svg>
  );
}
