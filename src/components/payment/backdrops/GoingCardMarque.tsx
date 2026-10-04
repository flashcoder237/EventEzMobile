import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string };

/**
 * GoingCardMarque — fond de story (design-handoff/eventez-svg-redesign/redesign/fonds).
 * Remplit son conteneur (preserveAspectRatio slice) : la carte de
 * prévisualisation n'a pas le ratio 9:16 du format story final.
 */
export default function GoingCardMarque({ color = '#4F46E5' }: Props) {
  return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <Defs>
          <LinearGradient id="goingcardmarque-st-g" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={1080} y2={1920}>
            <Stop offset={0} stopColor="#6D28D9" />
            <Stop offset={1} stopColor="#EC4899" />
          </LinearGradient>
        </Defs>
        <Rect width={1080} height={1920} fill="url(#goingcardmarque-st-g)" />
        <Circle cx={980} cy={160} r={360} fill="#FBCFE8" fillOpacity={0.22} />
        <Circle cx={80} cy={1800} r={420} fill="#6D28D9" fillOpacity={0.14} />
        <Path d="M97 1487H160A9 9 0 0 0 178 1487H193Q205 1487 205 1499V1535Q205 1547 193 1547H178A9 9 0 0 0 160 1547H97Q85 1547 85 1535V1499Q85 1487 97 1487Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-21 145 1517)" />
        <Path d="M84 146H147A9 9 0 0 0 165 146H180Q192 146 192 158V194Q192 206 180 206H165A9 9 0 0 0 147 206H84Q72 206 72 194V158Q72 146 84 146Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(5 132 176)" />
        <Circle cx={979} cy={632} r={6} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={838} cy={393} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={259} cy={92} r={20} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={238} cy={377} r={20} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Path d="M682 1784C689 1809 689 1809 714 1816C689 1823 689 1823 682 1848C675 1823 675 1823 650 1816C675 1809 675 1809 682 1784Z" fill="#FFFFFF" />
        <Circle cx={385} cy={1415} r={16.8} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M131 1683C138 1708 138 1708 163 1715C138 1722 138 1722 131 1747C124 1722 124 1722 99 1715C124 1708 124 1708 131 1683Z" fill="#FFFFFF" />
        <Circle cx={626} cy={1483} r={12} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={205} cy={517} r={20} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Path d="M872 1657C875.5 1669.5 875.5 1669.5 888 1673C875.5 1676.5 875.5 1676.5 872 1689C868.5 1676.5 868.5 1676.5 856 1673C868.5 1669.5 868.5 1669.5 872 1657Z" fill="#FBCFE8" />
        <Path d="M188 1396.6C192.9 1414.1 192.9 1414.1 210.4 1419C192.9 1423.9 192.9 1423.9 188 1441.4C183.1 1423.9 183.1 1423.9 165.6 1419C183.1 1414.1 183.1 1414.1 188 1396.6Z" fill="#FBCFE8" />
        <Rect x={140} y={520} width={800} height={880} rx={56} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" />
      </Svg>
  );
}
