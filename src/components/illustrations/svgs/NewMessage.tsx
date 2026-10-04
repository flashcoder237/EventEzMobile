import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * NewMessage — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function NewMessage({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="newmessage-nm-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Path d="M48 40H128Q146 40 146 58V94Q146 112 128 112H72L48 132L52 111Q30 108 30 92V58Q30 40 48 40Z" fill="#4338CA" transform="translate(7 9)" />
        <Path d="M48 40H128Q146 40 146 58V94Q146 112 128 112H72L48 132L52 111Q30 108 30 92V58Q30 40 48 40Z" fill="url(#newmessage-nm-c)" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <G id="anim-pulse-typing">
          <Circle cx={64} cy={76} r={7} fill={color} />
          <Circle cx={88} cy={76} r={7} fill={color} fillOpacity={0.7} />
          <Circle cx={112} cy={76} r={7} fill={color} fillOpacity={0.4} />
        </G>
        <Path d="M106 118H160Q176 118 176 134V146Q176 160 164 163L172 178L146 164H106Q90 164 90 148V134Q90 118 106 118Z" fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" />
        <Path d="M106 135H158M106 147H136" stroke="#FDFBF7" strokeWidth={5} strokeLinecap="round" />
        <Circle cx={142} cy={44} r={10} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <G id="anim-twinkle-sparkles">
          <Path d="M170 64C171.8 70.2 171.8 70.2 178 72C171.8 73.8 171.8 73.8 170 80C168.2 73.8 168.2 73.8 162 72C168.2 70.2 168.2 70.2 170 64Z" fill="#A855F7" />
          <Path d="M32 148C33.3 152.7 33.3 152.7 38 154C33.3 155.3 33.3 155.3 32 160C30.7 155.3 30.7 155.3 26 154C30.7 152.7 30.7 152.7 32 148Z" fill={color} />
        </G>
      </Svg>
  );
}
