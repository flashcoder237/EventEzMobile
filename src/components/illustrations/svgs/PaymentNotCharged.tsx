import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * PaymentNotCharged — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function PaymentNotCharged({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="paymentnotcharged-pn-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="paymentnotcharged-pn-a" x1={0} y1={0} x2={1} y2={1}>
            <Stop offset={0} stopColor={color} />
            <Stop offset={1} stopColor="#4338CA" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={104} cy={184} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={43} y={34} width={80} height={148} rx={16} fill="#4338CA" />
        <Rect x={36} y={24} width={80} height={148} rx={16} fill="url(#paymentnotcharged-pn-c)" stroke={color} strokeWidth={5} />
        <Rect x={44} y={40} width={64} height={118} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={67} y={31} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={64} y={163} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Circle cx={76} cy={84} r={24} fill={color} fillOpacity={0.1} />
        <Path d="M88 74A15 15 0 1 0 90 90" stroke={color} strokeWidth={5.5} strokeLinecap="round" />
        <Path d="M80 72L89 73L89 64" stroke={color} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 124H96M58 138H84" stroke={color} strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" />
        <G id="anim-float-coin">
          <Circle cx={146} cy={112} r={15} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={146} cy={112} r={7.5} stroke={color} strokeOpacity={0.35} strokeWidth={3} />
        </G>
        <Rect x={115} y={128} width={70} height={50} rx={12} fill="#4338CA" />
        <Rect x={108} y={120} width={70} height={50} rx={12} fill="url(#paymentnotcharged-pn-a)" />
        <Path d="M116 128H170" stroke="#FDFBF7" strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" />
        <Rect x={146} y={134} width={38} height={22} rx={8} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
        <Circle cx={160} cy={145} r={4.5} fill="#FF6B6B" />
        <Path d="M30 40L42 35L54 40V50C54 58 49 63 42 66C35 63 30 58 30 50Z" fill="#FDFBF7" stroke="#A855F7" strokeWidth={3.5} strokeLinejoin="round" transform="translate(116 -4)" />
        <Path d="M153 46L157 50L164 43" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
  );
}
