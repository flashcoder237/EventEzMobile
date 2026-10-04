import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * AddFriends — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function AddFriends({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="addfriends-af-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={62} ry={5} fill={color} fillOpacity={0.12} />
        <Circle cx={74} cy={64} r={22} fill="#A855F7" fillOpacity={0.15} />
        <Circle cx={74} cy={82} r={15} fill="#A855F7" />
        <Path d="M45.5 131.5Q45.5 103.8 74 103.8Q102.5 103.8 102.5 131.5Z" fill="#A855F7" />
        <Rect x={34} y={128} width={136} height={44} rx={22} fill="#4338CA" />
        <Rect x={28} y={120} width={136} height={44} rx={22} fill="url(#addfriends-af-c)" stroke={color} strokeWidth={5} />
        <Circle cx={56} cy={132} r={8} fill={color} />
        <Path d="M40.8 158.4Q40.8 143.6 56 143.6Q71.2 143.6 71.2 158.4Z" fill={color} />
        <Path d="M78 136H138" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M78 148H118" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={118} cy={70} r={24} fill={color} fillOpacity={0.15} />
        <Circle cx={118} cy={66} r={17} fill={color} />
        <Path d="M85.7 122.1Q85.7 90.7 118 90.7Q150.3 90.7 150.3 122.1Z" fill={color} />
        <G id="anim-pulse-plus">
          <Circle cx={160} cy={54} r={18} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
          <Path d="M160 46V62M152 54H168" stroke="#FDFBF7" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M30 32C31.8 38.2 31.8 38.2 38 40C31.8 41.8 31.8 41.8 30 48C28.2 41.8 28.2 41.8 22 40C28.2 38.2 28.2 38.2 30 32Z" fill="#A855F7" />
          <Path d="M178 104C179.3 108.7 179.3 108.7 184 110C179.3 111.3 179.3 111.3 178 116C176.7 111.3 176.7 111.3 172 110C176.7 108.7 176.7 108.7 178 104Z" fill={color} />
        </G>
      </Svg>
  );
}
