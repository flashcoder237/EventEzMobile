import React from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * SeatingPlan — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function SeatingPlan({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="seatingplan-sp-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M38 62C58 26 118 18 154 40C190 62 192 120 166 152C140 184 76 190 44 162C12 134 18 98 38 62Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={186} rx={76} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={21} y={31} width={172} height={156} rx={14} fill="#4338CA" />
        <Rect x={14} y={22} width={172} height={156} rx={14} fill="url(#seatingplan-sp-c)" stroke={color} strokeWidth={5} />
        <Rect x={64} y={32} width={72} height={14} rx={7} fill="#F5B841" fillOpacity={0.85} />
        <Circle cx={71} cy={82} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={61.5} cy={98.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={42.5} cy={98.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={33} cy={82} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={42.5} cy={65.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={61.5} cy={65.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={52} cy={82} r={13} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
        <Rect x={43} y={79} width={18} height={6} rx={2} fill="#A855F7" fillOpacity={0.5} />
        <Circle cx={119} cy={82} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={109.5} cy={98.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={90.5} cy={98.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={81} cy={82} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={90.5} cy={65.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={109.5} cy={65.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={100} cy={82} r={13} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
        <Rect x={91} y={79} width={18} height={6} rx={2} fill="#A855F7" fillOpacity={0.5} />
        <Circle cx={167} cy={82} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={157.5} cy={98.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={138.5} cy={98.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={129} cy={82} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={138.5} cy={65.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={157.5} cy={65.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={148} cy={82} r={13} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
        <Rect x={139} y={79} width={18} height={6} rx={2} fill="#A855F7" fillOpacity={0.5} />
        <Circle cx={71} cy={138} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={61.5} cy={154.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={42.5} cy={154.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={33} cy={138} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={42.5} cy={121.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={61.5} cy={121.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={52} cy={138} r={13} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
        <Rect x={43} y={135} width={18} height={6} rx={2} fill="#A855F7" fillOpacity={0.5} />
        <Circle cx={119} cy={138} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={109.5} cy={154.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={90.5} cy={154.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={81} cy={138} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={90.5} cy={121.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={109.5} cy={121.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={100} cy={138} r={13} fill="#FF6B6B" stroke={color} strokeWidth={3.5} />
        <Rect x={91} y={135} width={18} height={6} rx={2} fill="#FDFBF7" />
        <Circle cx={167} cy={138} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={157.5} cy={154.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={138.5} cy={154.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={129} cy={138} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={138.5} cy={121.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={157.5} cy={121.5} r={4} fill={color} fillOpacity={0.35} />
        <Circle cx={148} cy={138} r={13} fill="#FDFBF7" stroke={color} strokeWidth={3.5} />
        <Rect x={139} y={135} width={18} height={6} rx={2} fill="#A855F7" fillOpacity={0.5} />
      </Svg>
  );
}
