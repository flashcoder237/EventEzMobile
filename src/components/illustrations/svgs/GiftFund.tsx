import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * GiftFund — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function GiftFund({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="giftfund-gf-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={72} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={33} y={115} width={62} height={64} rx={8} fill="#4338CA" />
        <Rect x={26} y={106} width={62} height={64} rx={8} fill="url(#giftfund-gf-c)" stroke={color} strokeWidth={5} />
        <Rect x={20} y={90} width={74} height={20} rx={6} fill="url(#giftfund-gf-c)" stroke={color} strokeWidth={5} />
        <Rect x={49} y={90} width={16} height={80} rx={2} fill="#FF6B6B" />
        <Path d="M57 90C47 66 23 76 35 88" stroke="#FF6B6B" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M57 90C67 66 91 76 79 88" stroke="#FF6B6B" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M112 92H174V160Q174 176 158 176H128Q112 176 112 160Z" fill="#4338CA" transform="translate(6 6)" />
        <Path d="M112 92H174V160Q174 176 158 176H128Q112 176 112 160Z" fill="url(#giftfund-gf-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={126} y={84} width={34} height={8} rx={4} fill={color} />
        <Circle cx={134} cy={154} r={9} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={134} cy={154} r={4.5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        <Circle cx={152} cy={158} r={9} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={152} cy={158} r={4.5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        <Circle cx={144} cy={140} r={9} fill="#FDFBF7" stroke={color} strokeWidth={4} />
        <Circle cx={144} cy={140} r={4.5} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        <G id="anim-float-coin">
          <Circle cx={143} cy={56} r={12} fill="#F5B841" stroke="#FDFBF7" strokeWidth={3} />
          <Circle cx={143} cy={56} r={5} fill="#FDFBF7" fillOpacity={0.6} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 42C31.8 48.2 31.8 48.2 38 50C31.8 51.8 31.8 51.8 30 58C28.2 51.8 28.2 51.8 22 50C28.2 48.2 28.2 48.2 30 42Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
