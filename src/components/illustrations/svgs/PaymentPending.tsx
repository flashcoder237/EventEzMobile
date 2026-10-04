import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * PaymentPending — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function PaymentPending({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="paymentpending-pp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={186} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <G id="anim-vibrate-phone">
          <Rect x={61} y={36} width={80} height={148} rx={16} fill="#4338CA" />
          <Rect x={54} y={26} width={80} height={148} rx={16} fill="url(#paymentpending-pp-c)" stroke={color} strokeWidth={5} />
          <Rect x={62} y={42} width={64} height={118} rx={8} fill={color} fillOpacity={0.07} />
          <Rect x={85} y={33} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
          <Rect x={82} y={165} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
          <Rect x={62} y={46} width={64} height={24} rx={7} fill="#FDFBF7" stroke={color} strokeWidth={3} />
          <Rect x={67} y={52} width={12} height={12} rx={3.5} fill="#A855F7" />
          <Path d="M85 54H118M85 62H104" stroke={color} strokeOpacity={0.5} strokeWidth={3.5} strokeLinecap="round" />
          <Circle cx={73} cy={94} r={5} fill={color} />
          <Circle cx={87} cy={94} r={5} fill={color} />
          <Circle cx={101} cy={94} r={4.5} stroke={color} strokeWidth={2.5} />
          <Circle cx={115} cy={94} r={4.5} stroke={color} strokeWidth={2.5} />
          <Circle cx={76} cy={118} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={94} cy={118} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={112} cy={118} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={76} cy={134} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={94} cy={134} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={112} cy={134} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={76} cy={150} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={94} cy={150} r={4.5} fill={color} fillOpacity={0.16} />
          <Circle cx={112} cy={150} r={4.5} fill={color} fillOpacity={0.16} />
        </G>
        <G id="anim-wave-vibe">
          <Path d="M42 72L36 78L42 84L36 90" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M148 56L154 62L148 68L154 74" stroke="#A855F7" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-turn-hourglass">
          <Path d="M153 120Q153 136 163 142Q153 148 153 164H173Q173 148 163 142Q173 136 173 120Z" fill="#FDFBF7" stroke={color} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M157 126H169Q167 134 163 137Q159 134 157 126Z" fill="#FF6B6B" />
          <Path d="M156 160Q158 152 163 150Q168 152 170 160Z" fill="#FF6B6B" />
          <Path d="M149 119H177M149 165H177" stroke="#4338CA" strokeWidth={5} strokeLinecap="round" />
        </G>
      </Svg>
  );
}
