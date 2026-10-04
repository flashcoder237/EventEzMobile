import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * PersonalFinance — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function PersonalFinance({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="personalfinance-pf-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={182} rx={52} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M52 22H140V170L129 162L118 170L107 162L96 170L85 162L74 170L63 162L52 170Z" fill="#4338CA" transform="translate(7 8)" />
        <Path d="M52 22H140V170L129 162L118 170L107 162L96 170L85 162L74 170L63 162L52 170Z" fill="url(#personalfinance-pf-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={66} y={38} width={40} height={8} rx={4} fill={color} />
        <Path d="M66 64H102" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M112 64H126" stroke={color} strokeWidth={3.5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M66 82H102" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M112 82H126" stroke={color} strokeWidth={3.5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M66 100H102" stroke={color} strokeWidth={3.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M112 100H126" stroke={color} strokeWidth={3.5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M66 122H126" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 5" />
        <Rect x={98} y={132} width={28} height={10} rx={5} fill="#FF6B6B" />
        <G id="anim-float-coin">
          <Circle cx={160} cy={136} r={16} fill="#FDFBF7" stroke={color} strokeWidth={4} />
          <Circle cx={160} cy={136} r={8} stroke={color} strokeWidth={3} strokeOpacity={0.35} />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M168 35C170 42 170 42 177 44C170 46 170 46 168 53C166 46 166 46 159 44C166 42 166 42 168 35Z" fill="#A855F7" />
          <Path d="M26 104C27.3 108.7 27.3 108.7 32 110C27.3 111.3 27.3 111.3 26 116C24.7 111.3 24.7 111.3 20 110C24.7 108.7 24.7 108.7 26 104Z" fill={color} />
        </G>
      </Svg>
  );
}
