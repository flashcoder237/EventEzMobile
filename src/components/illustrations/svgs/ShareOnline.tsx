import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * ShareOnline — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function ShareOnline({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="shareonline-sn-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={29} y={39} width={156} height={120} rx={14} fill="#4338CA" />
        <Rect x={22} y={30} width={156} height={120} rx={14} fill="url(#shareonline-sn-c)" stroke={color} strokeWidth={5} />
        <Path d="M22 44Q22 30 36 30H164Q178 30 178 44V50H22Z" fill={color} fillOpacity={0.12} />
        <Circle cx={36} cy={40} r={3.5} fill="#FF6B6B" />
        <Circle cx={48} cy={40} r={3.5} fill="#A855F7" />
        <Circle cx={60} cy={40} r={3.5} fill={color} />
        <Path d="M72 104L124 78M72 104L124 130" stroke={color} strokeWidth={4} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={72} cy={104} r={14} fill={color} />
        <Circle cx={124} cy={78} r={12} fill="#A855F7" />
        <Circle cx={124} cy={130} r={12} fill="#FF6B6B" />
        <G id="anim-float-node">
          <Circle cx={156} cy={104} r={8} fill={color} fillOpacity={0.4} />
          <Path d="M136 80L150 98M136 128L150 110" stroke={color} strokeWidth={3} strokeOpacity={0.4} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M180 152C181.8 158.2 181.8 158.2 188 160C181.8 161.8 181.8 161.8 180 168C178.2 161.8 178.2 161.8 172 160C178.2 158.2 178.2 158.2 180 152Z" fill="#A855F7" />
          <Path d="M20 154C21.3 158.7 21.3 158.7 26 160C21.3 161.3 21.3 161.3 20 166C18.7 161.3 18.7 161.3 14 160C18.7 158.7 18.7 158.7 20 154Z" fill={color} />
        </G>
      </Svg>
  );
}
