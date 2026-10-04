import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Tier4 — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Tier4({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path d="M26 40Q14 30 16 50" stroke="#7E22CE" strokeWidth={5} strokeOpacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M26 50Q8 42 10 62" stroke="#7E22CE" strokeWidth={5} strokeOpacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M26 60Q2 54 4 74" stroke="#7E22CE" strokeWidth={5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 40Q82 30 80 50" stroke="#7E22CE" strokeWidth={5} strokeOpacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 50Q88 42 86 62" stroke="#7E22CE" strokeWidth={5} strokeOpacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M70 60Q94 54 92 74" stroke="#7E22CE" strokeWidth={5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M22 70Q12 50 18 28" stroke="#7E22CE" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx={17} cy={62} rx={3} ry={6} fill="#A855F7" transform="rotate(30 17 62)" />
        <Ellipse cx={15.5} cy={50} rx={3} ry={6} fill="#A855F7" transform="rotate(30 15.5 50)" />
        <Ellipse cx={14} cy={38} rx={3} ry={6} fill="#A855F7" transform="rotate(30 14 38)" />
        <Path d="M74 70Q84 50 78 28" stroke="#7E22CE" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx={79} cy={62} rx={3} ry={6} fill="#A855F7" transform="rotate(-30 79 62)" />
        <Ellipse cx={80.5} cy={50} rx={3} ry={6} fill="#A855F7" transform="rotate(-30 80.5 50)" />
        <Ellipse cx={82} cy={38} rx={3} ry={6} fill="#A855F7" transform="rotate(-30 82 38)" />
        <Path d="M48 14L73 24.6V45.7C73 64.2 59 74.7 48 80C37 74.7 23 64.2 23 45.7V24.6Z" fill="#7E22CE" transform="translate(3 4)" />
        <Path d="M48 14L73 24.6V45.7C73 64.2 59 74.7 48 80C37 74.7 23 64.2 23 45.7V24.6Z" fill="#A855F7" stroke="#7E22CE" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 22L65 29.7V45C65 58.5 55.5 66.2 48 70C40.5 66.2 31 58.5 31 45V29.7Z" stroke="#FFFFFF" strokeWidth={2.5} strokeOpacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M48 35L50.9 42L58.5 42.6L52.7 47.5L54.5 54.9L48 51L41.5 54.9L43.3 47.5L37.5 42.6L45.1 42Z" fill="#FFFFFF" />
        <Circle cx={48} cy={72} r={4} fill="#FFFFFF" />
      </Svg>
  );
}
