import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Authentication — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Authentication({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="authentication-au-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={44} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={67} y={42} width={80} height={144} rx={16} fill="#4338CA" />
        <Rect x={60} y={32} width={80} height={144} rx={16} fill="url(#authentication-au-c)" stroke={color} strokeWidth={5} />
        <Rect x={68} y={48} width={64} height={114} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={91} y={39} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={88} y={167} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Circle cx={100} cy={74} r={14} fill={color} fillOpacity={0.14} />
        <Circle cx={100} cy={70} r={5.5} fill={color} />
        <Path d="M90 84C91 78 95 76 100 76C105 76 109 78 110 84" fill={color} />
        <Rect x={76} y={98} width={48} height={10} rx={5} fill="#E5E7EB" />
        <Rect x={76} y={114} width={48} height={10} rx={5} fill="#E5E7EB" />
        <Circle cx={83} cy={119} r={2.2} fill={color} />
        <Circle cx={90} cy={119} r={2.2} fill={color} />
        <Circle cx={97} cy={119} r={2.2} fill={color} />
        <Circle cx={104} cy={119} r={2.2} fill={color} />
        <Rect x={76} y={134} width={48} height={13} rx={6.5} fill={color} />
        <Path d="M95 140.5H105" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" />
        <G id="anim-float-key">
          <Path d="M159 71L181 93M171 83L177 77M176 88L182 82" stroke="#4338CA" strokeWidth={7} strokeLinecap="round" transform="translate(3 4)" />
          <Path d="M159 71L181 93M171 83L177 77M176 88L182 82" stroke="#FF6B6B" strokeWidth={6} strokeLinecap="round" />
          <Circle cx={151} cy={63} r={13} fill="#FDFBF7" stroke="#FF6B6B" strokeWidth={6} />
          <Circle cx={151} cy={63} r={4} fill="#FF6B6B" />
        </G>
        <Path d="M140 98C150 98 156 92 158 84" stroke={color} strokeOpacity={0.4} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 6" />
        <G id="anim-twinkle-sparkles">
          <Path d="M36 52C37.8 58.2 37.8 58.2 44 60C37.8 61.8 37.8 61.8 36 68C34.2 61.8 34.2 61.8 28 60C34.2 58.2 34.2 58.2 36 52Z" fill="#A855F7" />
          <Path d="M44 135C45.1 138.9 45.1 138.9 49 140C45.1 141.1 45.1 141.1 44 145C42.9 141.1 42.9 141.1 39 140C42.9 138.9 42.9 138.9 44 135Z" fill={color} />
        </G>
      </Svg>
  );
}
