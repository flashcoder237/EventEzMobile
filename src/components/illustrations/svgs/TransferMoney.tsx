import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * TransferMoney — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function TransferMoney({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="transfermoney-tr-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <LinearGradient id="transfermoney-tr-a" x1={0} y1={0} x2={1} y2={1}>
            <Stop offset={0} stopColor={color} />
            <Stop offset={1} stopColor="#4338CA" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={70} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={21} y={99} width={64} height={70} rx={12} fill="#4338CA" />
        <Rect x={14} y={90} width={64} height={70} rx={12} fill="url(#transfermoney-tr-c)" stroke={color} strokeWidth={5} />
        <Rect x={24} y={104} width={44} height={10} rx={5} fill={color} fillOpacity={0.3} />
        <Circle cx={46} cy={138} r={11} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={46} cy={138} r={5.5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        <Rect x={129} y={99} width={64} height={70} rx={12} fill="#4338CA" />
        <Rect x={122} y={90} width={64} height={70} rx={12} fill="url(#transfermoney-tr-a)" stroke={color} strokeWidth={5} />
        <Rect x={132} y={104} width={44} height={10} rx={5} fill="#FDFBF7" fillOpacity={0.4} />
        <Circle cx={154} cy={138} r={11} fill="#FDFBF7" />
        <Circle cx={154} cy={138} r={5} fill={color} />
        <Path d="M64 64C84 40 116 40 136 64" stroke="#A855F7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M126 62L136 64L134 54" stroke="#A855F7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M136 176C116 192 84 192 64 176" stroke={color} strokeWidth={4} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M74 178L64 176L66 166" stroke={color} strokeWidth={4} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-coin">
          <Circle cx={100} cy={58} r={13} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3.5} />
          <Circle cx={100} cy={58} r={5} fill="#FDFBF7" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M100 102C101.8 108.2 101.8 108.2 108 110C101.8 111.8 101.8 111.8 100 118C98.2 111.8 98.2 111.8 92 110C98.2 108.2 98.2 108.2 100 102Z" fill="#A855F7" />
          <Path d="M186 34C187.3 38.7 187.3 38.7 192 40C187.3 41.3 187.3 41.3 186 46C184.7 41.3 184.7 41.3 180 40C184.7 38.7 184.7 38.7 186 34Z" fill={color} />
        </G>
      </Svg>
  );
}
