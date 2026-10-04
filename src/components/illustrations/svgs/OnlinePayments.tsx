import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * OnlinePayments — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function OnlinePayments({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="onlinepayments-op-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="onlinepayments-op-a" x1={0} y1={0} x2={1} y2={1}>
            <Stop offset={0} stopColor={color} />
            <Stop offset={1} stopColor="#4338CA" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={104} cy={180} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={111} y={36} width={70} height={132} rx={14} fill="#4338CA" />
        <Rect x={104} y={26} width={70} height={132} rx={14} fill="url(#onlinepayments-op-c)" stroke={color} strokeWidth={5} />
        <Rect x={112} y={42} width={54} height={102} rx={6} fill={color} fillOpacity={0.07} />
        <Rect x={130} y={33} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={127} y={149} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Rect x={116} y={48} width={46} height={22} rx={6} fill={color} fillOpacity={0.14} />
        <Path d="M124 59H150" stroke={color} strokeWidth={5} strokeLinecap="round" />
        <Path d="M118 84H160M118 96H148M118 108H156" stroke={color} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" />
        <Rect x={116} y={124} width={46} height={14} rx={7} fill="#FF6B6B" />
        <G transform="rotate(-10 78 132)">
          <Rect x={32} y={106} width={100} height={62} rx={11} fill="#4338CA" transform="translate(6 8)" />
          <Rect x={32} y={106} width={100} height={62} rx={11} fill="url(#onlinepayments-op-a)" />
          <Rect x={44} y={120} width={18} height={14} rx={3.5} fill="#FDFBF7" fillOpacity={0.9} />
          <Path d="M53 120V134M44 127H62" stroke="#4338CA" strokeOpacity={0.5} strokeWidth={2} />
          <Path d="M72 121Q76 127 72 133M78 118Q84 127 78 136" stroke="#FDFBF7" strokeOpacity={0.8} strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M44 150H70M78 150H104" stroke="#FDFBF7" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
          <Path d="M36 112L126 112" stroke="#FDFBF7" strokeOpacity={0.18} strokeWidth={3} />
        </G>
        <G id="anim-float-coin">
          <Circle cx={54} cy={58} r={16} fill="#A855F7" />
          <Circle cx={54} cy={58} r={9.5} stroke="#FDFBF7" strokeOpacity={0.7} strokeWidth={3} />
          <Path d="M46 48Q50 44 56 44" stroke="#FDFBF7" strokeOpacity={0.8} strokeWidth={2.5} strokeLinecap="round" />
        </G>
        <Path d="M72 64C84 66 94 60 100 52" stroke="#A855F7" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 6" />
      </Svg>
  );
}
