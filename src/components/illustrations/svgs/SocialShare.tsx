import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * SocialShare — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function SocialShare({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="socialshare-ss-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={96} cy={186} rx={46} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={61} y={50} width={80} height={142} rx={16} fill="#4338CA" />
        <Rect x={54} y={40} width={80} height={142} rx={16} fill="url(#socialshare-ss-c)" stroke={color} strokeWidth={5} />
        <Rect x={62} y={56} width={64} height={112} rx={8} fill={color} fillOpacity={0.07} />
        <Rect x={85} y={47} width={18} height={4} rx={2} fill={color} fillOpacity={0.45} />
        <Rect x={82} y={173} width={24} height={3.5} rx={1.8} fill={color} fillOpacity={0.45} />
        <Rect x={64} y={60} width={60} height={40} rx={8} fill={color} fillOpacity={0.15} />
        <Path d="M64 92L82 76L96 88L108 80L124 92" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M66 114H116" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M66 126H98" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-hearts">
          <Path d="M152 77.7C135.1 67.3 137.7 53.6 145.5 53.6C149.4 53.6 152 56.2 152 59.5C152 56.2 154.6 53.6 158.5 53.6C166.3 53.6 168.9 67.3 152 77.7Z" fill="#FF6B6B" />
          <Path d="M170 111.2C159.6 104.8 161.2 96.4 166 96.4C168.4 96.4 170 98 170 100C170 98 171.6 96.4 174 96.4C178.8 96.4 180.4 104.8 170 111.2Z" fill="#A855F7" />
          <Circle cx={150} cy={132} r={12} fill={color} />
          <Path d="M145 132H155M150 127V137" stroke="#FDFBF7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-pulse-like">
          <Circle cx={40} cy={72} r={14} fill="#A855F7" fillOpacity={0.2} />
          <Path d="M40 78.3C30.9 72.7 32.3 65.3 36.5 65.3C38.6 65.3 40 66.8 40 68.5C40 66.8 41.4 65.3 43.5 65.3C47.7 65.3 49.1 72.7 40 78.3Z" fill="#A855F7" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 133C31.5 138.5 31.5 138.5 37 140C31.5 141.5 31.5 141.5 30 147C28.5 141.5 28.5 141.5 23 140C28.5 138.5 28.5 138.5 30 133Z" fill="#A855F7" />
          <Path d="M176 24C177.3 28.7 177.3 28.7 182 30C177.3 31.3 177.3 31.3 176 36C174.7 31.3 174.7 31.3 170 30C174.7 28.7 174.7 28.7 176 24Z" fill={color} />
        </G>
      </Svg>
  );
}
