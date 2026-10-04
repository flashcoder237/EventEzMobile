import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * PeopleSearch — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function PeopleSearch({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="peoplesearch-ps-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={176} rx={64} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={27} y={80} width={46} height={62} rx={10} fill="#4338CA" fillOpacity={0.5} />
        <Rect x={22} y={72} width={46} height={62} rx={10} fill="url(#peoplesearch-ps-c)" stroke={color} strokeWidth={4} />
        <Circle cx={45} cy={94} r={8} fill={color} fillOpacity={0.35} />
        <Path d="M34 120H56" stroke={color} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" />
        <Rect x={139} y={80} width={46} height={62} rx={10} fill="#4338CA" fillOpacity={0.5} />
        <Rect x={134} y={72} width={46} height={62} rx={10} fill="url(#peoplesearch-ps-c)" stroke={color} strokeWidth={4} />
        <Circle cx={157} cy={94} r={8} fill={color} fillOpacity={0.35} />
        <Path d="M146 120H168" stroke={color} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" />
        <Path d="M126 128L158 160" stroke="#4338CA" strokeWidth={16} strokeLinecap="round" />
        <Path d="M134 136L154 156" stroke={color} strokeWidth={9} strokeLinecap="round" />
        <Circle cx={100} cy={100} r={40} fill="#4338CA" transform="translate(5 6)" />
        <Circle cx={100} cy={100} r={38} fill="url(#peoplesearch-ps-c)" stroke={color} strokeWidth={7} />
        <Circle cx={100} cy={92} r={12} fill={color} />
        <Path d="M78 122C80 110 88 106 100 106C112 106 120 110 122 122" fill={color} />
        <Path d="M74 86Q78 72 92 66" stroke={color} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={128} cy={70} r={9} fill="#FF6B6B" stroke="#FDFBF7" strokeWidth={4} />
        <G id="anim-twinkle-sparkles">
          <Path d="M40 32C41.8 38.2 41.8 38.2 48 40C41.8 41.8 41.8 41.8 40 48C38.2 41.8 38.2 41.8 32 40C38.2 38.2 38.2 38.2 40 32Z" fill="#A855F7" />
          <Path d="M166 38C167.3 42.7 167.3 42.7 172 44C167.3 45.3 167.3 45.3 166 50C164.7 45.3 164.7 45.3 160 44C164.7 42.7 164.7 42.7 166 38Z" fill={color} />
        </G>
      </Svg>
  );
}
