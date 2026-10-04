import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * UnexpectedError — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function UnexpectedError({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="unexpectederror-ue-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M30 92C26 52 64 24 108 26C152 28 184 58 178 104C172 150 136 182 92 176C48 170 34 132 30 92Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={180} rx={58} ry={5} fill={color} fillOpacity={0.12} />
        <Path d="M144 104L143.2 113L129.6 117.7L126.6 124L131.8 137.4L125.4 143.8L112 138.6L105.7 141.6L101 155.2L92 156L85.1 143.4L78.3 141.6L66 149L58.6 143.8L61.4 129.7L57.4 124L43.1 121.8L40.8 113L52 104L52.6 97.1L43.1 86.2L47 78L61.4 78.3L66.3 73.4L66 59L74.2 55.1L85.1 64.6L92 64L101 52.8L109.8 55.1L112 69.4L117.7 73.4L131.8 70.6L137 78L129.6 90.3L131.4 97.1Z" fill="#4338CA" transform="translate(6 8)" />
        <Path d="M144 104L143.2 113L129.6 117.7L126.6 124L131.8 137.4L125.4 143.8L112 138.6L105.7 141.6L101 155.2L92 156L85.1 143.4L78.3 141.6L66 149L58.6 143.8L61.4 129.7L57.4 124L43.1 121.8L40.8 113L52 104L52.6 97.1L43.1 86.2L47 78L61.4 78.3L66.3 73.4L66 59L74.2 55.1L85.1 64.6L92 64L101 52.8L109.8 55.1L112 69.4L117.7 73.4L131.8 70.6L137 78L129.6 90.3L131.4 97.1Z" fill="url(#unexpectederror-ue-c)" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={92} cy={104} r={18} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={5} />
        <Path d="M120 64L132 52" stroke="#FDFBF7" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-wrench">
          <Path d="M148 120L178 150" stroke="#4338CA" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M148 120L178 150" stroke="#A855F7" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={146} cy={118} r={10} fill="#A855F7" />
          <Circle cx={146} cy={118} r={4} fill="#FDFBF7" />
        </G>
        <G id="anim-spin-retry">
          <Path d="M164 52A14 14 0 1 0 166 68" stroke="#FF6B6B" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M157 50L166 52L166 43" stroke="#FF6B6B" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
        </G>
      </Svg>
  );
}
