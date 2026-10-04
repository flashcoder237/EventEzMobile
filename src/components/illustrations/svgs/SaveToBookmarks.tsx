import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * SaveToBookmarks — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function SaveToBookmarks({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="savetobookmarks-sb-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
          <ClipPath id="savetobookmarks-sb-k">
            <Rect x={48} y={60} width={92} height={52} rx={8} />
          </ClipPath>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={56} ry={5} fill={color} fillOpacity={0.12} />
        <G transform="rotate(-8 100 110)">
          <Rect x={46} y={46} width={104} height={116} rx={14} fill="#FDFBF7" stroke="#4338CA" strokeWidth={4} strokeOpacity={0.6} />
        </G>
        <Rect x={46} y={58} width={104} height={118} rx={14} fill="#4338CA" />
        <Rect x={38} y={50} width={104} height={118} rx={14} fill="url(#savetobookmarks-sb-c)" stroke={color} strokeWidth={5} />
        <G clipPath="url(#savetobookmarks-sb-k)">
          <Rect x={48} y={60} width={92} height={52} fill={color} fillOpacity={0.14} />
          <Path d="M44 112L72 84L90 100L104 90L144 112Z" fill={color} fillOpacity={0.45} />
          <Circle cx={72} cy={74} r={6} fill="#A855F7" fillOpacity={0.7} />
        </G>
        <Path d="M50 128H106M50 142H88" stroke={color} strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" />
        <Rect x={108} y={136} width={24} height={20} rx={6} fill={color} fillOpacity={0.12} />
        <Rect x={108} y={136} width={24} height={20} rx={6} stroke={color} strokeWidth={2.5} />
        <Path d="M122 38H152V96L137 84L122 96Z" fill="#4338CA" transform="translate(4 5)" />
        <Path d="M122 38H152V96L137 84L122 96Z" fill="#FF6B6B" stroke="#FF6B6B" strokeWidth={4} strokeLinejoin="round" />
        <Path d="M137 52V68M129 60H145" stroke="#FDFBF7" strokeWidth={3.5} strokeLinecap="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M172 56C173.8 62.2 173.8 62.2 180 64C173.8 65.8 173.8 65.8 172 72C170.2 65.8 170.2 65.8 164 64C170.2 62.2 170.2 62.2 172 56Z" fill="#A855F7" />
          <Path d="M26 28C27.3 32.7 27.3 32.7 32 34C27.3 35.3 27.3 35.3 26 40C24.7 35.3 24.7 35.3 20 34C24.7 32.7 24.7 32.7 26 28Z" fill={color} />
        </G>
      </Svg>
  );
}
