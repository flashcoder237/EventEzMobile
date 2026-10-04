import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Connection — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Connection({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="connection-cn-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={170} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={25} y={79} width={60} height={60} rx={14} fill="#4338CA" />
        <Rect x={18} y={70} width={60} height={60} rx={14} fill="url(#connection-cn-c)" stroke={color} strokeWidth={5} />
        <Rect x={32} y={84} width={32} height={32} rx={9} fill="#A855F7" />
        <Rect x={129} y={79} width={60} height={60} rx={14} fill="#4338CA" />
        <Rect x={122} y={70} width={60} height={60} rx={14} fill="url(#connection-cn-c)" stroke={color} strokeWidth={5} />
        <Rect x={136} y={84} width={32} height={32} rx={9} fill={color} />
        <Circle cx={152} cy={100} r={7} fill="#FDFBF7" />
        <Path d="M78 100H90" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={88} y={90} width={12} height={20} rx={3} fill={color} />
        <Path d="M110 100H122" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={100} y={92} width={12} height={16} rx={3} fill="#4338CA" />
        <Path d="M102 94V88M108 94V88" stroke="#4338CA" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-pulse-spark">
          <Path d="M105 60C107.2 67.8 107.2 67.8 115 70C107.2 72.2 107.2 72.2 105 80C102.8 72.2 102.8 72.2 95 70C102.8 67.8 102.8 67.8 105 60Z" fill="#FF6B6B" />
          <Circle cx={118} cy={62} r={3} fill="#FF6B6B" />
          <Circle cx={92} cy={62} r={3} fill="#FF6B6B" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M40 32C41.8 38.2 41.8 38.2 48 40C41.8 41.8 41.8 41.8 40 48C38.2 41.8 38.2 41.8 32 40C38.2 38.2 38.2 38.2 40 32Z" fill="#A855F7" />
          <Path d="M168 144C169.3 148.7 169.3 148.7 174 150C169.3 151.3 169.3 151.3 168 156C166.7 151.3 166.7 151.3 162 150C166.7 148.7 166.7 148.7 168 144Z" fill={color} />
        </G>
      </Svg>
  );
}
