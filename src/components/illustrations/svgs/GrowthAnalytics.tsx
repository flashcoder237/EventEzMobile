import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * GrowthAnalytics — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function GrowthAnalytics({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="growthanalytics-ga-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={31} y={45} width={150} height={124} rx={14} fill="#4338CA" />
        <Rect x={24} y={36} width={150} height={124} rx={14} fill="url(#growthanalytics-ga-c)" stroke={color} strokeWidth={5} />
        <Path d="M40 140H158M40 56V140" stroke={color} strokeWidth={3} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 132L44 132L72 112L96 120L124 84L150 64V140H44Z" fill={color} fillOpacity={0.12} />
        <Path d="M44 132L72 112L96 120L124 84L150 64" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={72} cy={112} r={5} fill="#FDFBF7" stroke={color} strokeWidth={3} />
        <Circle cx={96} cy={120} r={5} fill="#FDFBF7" stroke={color} strokeWidth={3} />
        <Circle cx={124} cy={84} r={5} fill="#FDFBF7" stroke={color} strokeWidth={3} />
        <Circle cx={150} cy={64} r={8} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={3} />
        <G id="anim-float-arrow">
          <Path d="M156 34L176 20M168 20H176V28" stroke="#A855F7" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M26 14C27.8 20.2 27.8 20.2 34 22C27.8 23.8 27.8 23.8 26 30C24.2 23.8 24.2 23.8 18 22C24.2 20.2 24.2 20.2 26 14Z" fill="#A855F7" />
          <Path d="M184 144C185.3 148.7 185.3 148.7 190 150C185.3 151.3 185.3 151.3 184 156C182.7 151.3 182.7 151.3 178 150C182.7 148.7 182.7 148.7 184 144Z" fill={color} />
        </G>
      </Svg>
  );
}
