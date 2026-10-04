import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Agreement — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Agreement({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="agreement-ag-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={182} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-6 100 100)">
          <Path d="M54 26H128L144 42V152Q144 162 134 162H54Q44 162 44 152V36Q44 26 54 26Z" fill="#4338CA" transform="translate(7 9)" />
          <Path d="M54 26H128L144 42V152Q144 162 134 162H54Q44 162 44 152V36Q44 26 54 26Z" fill="url(#agreement-ag-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M128 26V42H144" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Path d="M60 54H116" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M60 68H124" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M60 82H104" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 128C66 116 72 136 80 124C86 116 90 132 100 124" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 140H112" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 6" />
        <Circle cx={132} cy={136} r={16} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <Path d="M132 129C133.5 134.5 133.5 134.5 139 136C133.5 137.5 133.5 137.5 132 143C130.5 137.5 130.5 137.5 125 136C130.5 134.5 130.5 134.5 132 129Z" fill="#FDFBF7" />
        <G id="anim-float-pen">
          <Path d="M150 60L176 34" stroke="#4338CA" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M150 60L176 34" stroke="#A855F7" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M146 66L150 60" stroke="#1E293B" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 52C31.8 58.2 31.8 58.2 38 60C31.8 61.8 31.8 61.8 30 68C28.2 61.8 28.2 61.8 22 60C28.2 58.2 28.2 58.2 30 52Z" fill="#A855F7" />
          <Path d="M172 114C173.3 118.7 173.3 118.7 178 120C173.3 121.3 173.3 121.3 172 126C170.7 121.3 170.7 121.3 166 120C170.7 118.7 170.7 118.7 172 114Z" fill={color} />
        </G>
      </Svg>
  );
}
