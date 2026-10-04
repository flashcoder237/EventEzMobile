import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * WellDone — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function WellDone({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="welldone-wd-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={184} rx={40} ry={4} fill={color} fillOpacity={0.12} />
        <Path d="M84 120L70 178L86 168L96 182L104 128Z" fill="#FF6B6B" />
        <Path d="M116 120L130 178L114 168L104 182L96 128Z" fill="#FF6B6B" fillOpacity={0.85} />
        <Path d="M100 36L110.9 44.2L124.3 41.5L130.6 53.7L143.8 57.1L144.1 70.7L154.6 79.5L149 92L154.6 104.5L144.1 113.3L143.8 126.9L130.6 130.3L124.3 142.5L110.9 139.8L100 148L89.1 139.8L75.7 142.5L69.4 130.3L56.2 126.9L55.9 113.3L45.4 104.5L51 92L45.4 79.5L55.9 70.7L56.2 57.1L69.4 53.7L75.7 41.5L89.1 44.2Z" fill="#4338CA" stroke="#4338CA" strokeWidth={6} strokeLinejoin="round" transform="translate(6 8)" />
        <Path d="M100 36L110.9 44.2L124.3 41.5L130.6 53.7L143.8 57.1L144.1 70.7L154.6 79.5L149 92L154.6 104.5L144.1 113.3L143.8 126.9L130.6 130.3L124.3 142.5L110.9 139.8L100 148L89.1 139.8L75.7 142.5L69.4 130.3L56.2 126.9L55.9 113.3L45.4 104.5L51 92L45.4 79.5L55.9 70.7L56.2 57.1L69.4 53.7L75.7 41.5L89.1 44.2Z" fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" />
        <Circle cx={100} cy={92} r={36} fill="url(#welldone-wd-c)" />
        <Circle cx={100} cy={92} r={28} stroke={color} strokeOpacity={0.15} strokeWidth={3} />
        <Path id="anim-draw-check" d="M84 92L96 104L118 80" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-twinkle-sparkles">
          <Path d="M30 36C32.2 43.8 32.2 43.8 40 46C32.2 48.2 32.2 48.2 30 56C27.8 48.2 27.8 48.2 20 46C27.8 43.8 27.8 43.8 30 36Z" fill="#A855F7" />
          <Path d="M170 32C171.8 38.2 171.8 38.2 178 40C171.8 41.8 171.8 41.8 170 48C168.2 41.8 168.2 41.8 162 40C168.2 38.2 168.2 38.2 170 32Z" fill="#FF6B6B" />
          <Path d="M176 114C177.3 118.7 177.3 118.7 182 120C177.3 121.3 177.3 121.3 176 126C174.7 121.3 174.7 121.3 170 120C174.7 118.7 174.7 118.7 176 114Z" fill={color} />
          <Path d="M24 125C25.1 128.9 25.1 128.9 29 130C25.1 131.1 25.1 131.1 24 135C22.9 131.1 22.9 131.1 19 130C22.9 128.9 22.9 128.9 24 125Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
