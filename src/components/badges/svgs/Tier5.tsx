import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Tier5 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Tier5({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path d="M26 40Q14 30 16 50" stroke="#B91C1C" strokeWidth={5} strokeOpacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M26 50Q8 42 10 62" stroke="#B91C1C" strokeWidth={5} strokeOpacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M26 60Q2 54 4 74" stroke="#B91C1C" strokeWidth={5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 40Q82 30 80 50" stroke="#B91C1C" strokeWidth={5} strokeOpacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 50Q88 42 86 62" stroke="#B91C1C" strokeWidth={5} strokeOpacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 60Q94 54 92 74" stroke="#B91C1C" strokeWidth={5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M22 70Q12 50 18 28" stroke="#B91C1C" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx={17} cy={62} rx={3} ry={6} fill="#EF4444" transform="rotate(30 17 62)" />
        <Ellipse cx={15.5} cy={50} rx={3} ry={6} fill="#EF4444" transform="rotate(30 15.5 50)" />
        <Ellipse cx={14} cy={38} rx={3} ry={6} fill="#EF4444" transform="rotate(30 14 38)" />
        <Path d="M74 70Q84 50 78 28" stroke="#B91C1C" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx={79} cy={62} rx={3} ry={6} fill="#EF4444" transform="rotate(-30 79 62)" />
        <Ellipse cx={80.5} cy={50} rx={3} ry={6} fill="#EF4444" transform="rotate(-30 80.5 50)" />
        <Ellipse cx={82} cy={38} rx={3} ry={6} fill="#EF4444" transform="rotate(-30 82 38)" />
        <Path d="M48 20L73 30.6V51.7C73 70.2 59 80.7 48 86C37 80.7 23 70.2 23 51.7V30.6Z" fill="#B91C1C" transform="translate(3 4)" />
        <Path d="M48 20L73 30.6V51.7C73 70.2 59 80.7 48 86C37 80.7 23 70.2 23 51.7V30.6Z" fill="#EF4444" stroke="#B91C1C" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 28L65 35.7V51C65 64.5 55.5 72.2 48 76C40.5 72.2 31 64.5 31 51V35.7Z" stroke="#FFFFFF" strokeWidth={2.5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 41L50.9 48L58.5 48.6L52.7 53.5L54.5 60.9L48 57L41.5 60.9L43.3 53.5L37.5 48.6L45.1 48Z" fill="#FFFFFF" />
        <Path d="M34 20L38 8L44 15L48 4L52 15L58 8L62 20Z" fill="#F5B841" stroke="#C98A12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={48} cy={4} r={2.5} fill="#FFFFFF" />
        <Circle cx={48} cy={78} r={4} fill="#FFFFFF" />
      </Svg>
  );
}
