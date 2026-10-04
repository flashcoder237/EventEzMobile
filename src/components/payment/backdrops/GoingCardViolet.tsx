import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { color?: string };

/**
 * GoingCardViolet — fond de story (design-handoff/eventez-svg-redesign/redesign/fonds).
 * Remplit son conteneur (preserveAspectRatio slice) : la carte de
 * prévisualisation n'a pas le ratio 9:16 du format story final.
 */
export default function GoingCardViolet({ color = '#4F46E5' }: Props) {
  return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <Rect width={1080} height={1920} fill="#A855F7" />
        <Circle cx={980} cy={160} r={360} fill="#F0ABFC" fillOpacity={0.22} />
        <Circle cx={80} cy={1800} r={420} fill="#4C1D95" fillOpacity={0.14} />
        <Path d="M1018 1791C1021.5 1803.5 1021.5 1803.5 1034 1807C1021.5 1810.5 1021.5 1810.5 1018 1823C1014.5 1810.5 1014.5 1810.5 1002 1807C1014.5 1803.5 1014.5 1803.5 1018 1791Z" fill="#F0ABFC" />
        <Circle cx={895} cy={386} r={20} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={660} cy={474} r={6} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M394 1655H457A9 9 0 0 0 475 1655H490Q502 1655 502 1667V1703Q502 1715 490 1715H475A9 9 0 0 0 457 1715H394Q382 1715 382 1703V1667Q382 1655 394 1655Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(2 442 1685)" />
        <Circle cx={314} cy={113} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={969} cy={818} r={16.8} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={613} cy={403} r={8.4} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={64} cy={401} r={12} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M518 1391H581A9 9 0 0 0 599 1391H614Q626 1391 626 1403V1439Q626 1451 614 1451H599A9 9 0 0 0 581 1451H518Q506 1451 506 1439V1403Q506 1391 518 1391Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(20 566 1421)" />
        <Circle cx={464} cy={1544} r={20} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={410} cy={1799} r={16.8} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M969 1554H1032A9 9 0 0 0 1050 1554H1065Q1077 1554 1077 1566V1602Q1077 1614 1065 1614H1050A9 9 0 0 0 1032 1614H969Q957 1614 957 1602V1566Q957 1554 969 1554Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(11 1017 1584)" />
        <Path d="M939 1030H1002A9 9 0 0 0 1020 1030H1035Q1047 1030 1047 1042V1078Q1047 1090 1035 1090H1020A9 9 0 0 0 1002 1090H939Q927 1090 927 1078V1042Q927 1030 939 1030Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(27 987 1060)" />
        <Path d="M916 954H979A9 9 0 0 0 997 954H1012Q1024 954 1024 966V1002Q1024 1014 1012 1014H997A9 9 0 0 0 979 1014H916Q904 1014 904 1002V966Q904 954 916 954Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(1 964 984)" />
        <Circle cx={714} cy={494} r={12} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={314} cy={1623} r={28} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={350} cy={1676} r={28} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={788} cy={465} r={28} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={996} cy={1441} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Rect x={140} y={520} width={800} height={880} rx={56} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" />
      </Svg>
  );
}
