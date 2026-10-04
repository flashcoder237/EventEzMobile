import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { color?: string };

/**
 * GoingCardIndigo — fond de story (design-handoff/eventez-svg-redesign/redesign/fonds).
 * Remplit son conteneur (preserveAspectRatio slice) : la carte de
 * prévisualisation n'a pas le ratio 9:16 du format story final.
 */
export default function GoingCardIndigo({ color = '#4F46E5' }: Props) {
  return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <Rect width={1080} height={1920} fill={color} />
        <Circle cx={980} cy={160} r={360} fill="#A5B4FC" fillOpacity={0.22} />
        <Circle cx={80} cy={1800} r={420} fill="#1E1B4B" fillOpacity={0.14} />
        <Path d="M816 1818.2C825.9 1853.1 825.9 1853.1 860.8 1863C825.9 1872.9 825.9 1872.9 816 1907.8C806.1 1872.9 806.1 1872.9 771.2 1863C806.1 1853.1 806.1 1853.1 816 1818.2Z" fill="#A5B4FC" />
        <Path d="M406 1615H469A9 9 0 0 0 487 1615H502Q514 1615 514 1627V1663Q514 1675 502 1675H487A9 9 0 0 0 469 1675H406Q394 1675 394 1663V1627Q394 1615 406 1615Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-8 454 1645)" />
        <Circle cx={637} cy={1866} r={8.4} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={328} cy={326} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={971} cy={1130} r={14} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={141} cy={1534} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Path d="M926 428H989A9 9 0 0 0 1007 428H1022Q1034 428 1034 440V476Q1034 488 1022 488H1007A9 9 0 0 0 989 488H926Q914 488 914 476V440Q914 428 926 428Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(25 974 458)" />
        <Path d="M103 1672C106.5 1684.5 106.5 1684.5 119 1688C106.5 1691.5 106.5 1691.5 103 1704C99.5 1691.5 99.5 1691.5 87 1688C99.5 1684.5 99.5 1684.5 103 1672Z" fill="#FFFFFF" />
        <Path d="M400 1464H463A9 9 0 0 0 481 1464H496Q508 1464 508 1476V1512Q508 1524 496 1524H481A9 9 0 0 0 463 1524H400Q388 1524 388 1512V1476Q388 1464 400 1464Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(22 448 1494)" />
        <Path d="M289 1503C296 1528 296 1528 321 1535C296 1542 296 1542 289 1567C282 1542 282 1542 257 1535C282 1528 282 1528 289 1503Z" fill="#A5B4FC" />
        <Circle cx={621} cy={494} r={8.4} fill="#FFFFFF" fillOpacity={0.5} />
        <Circle cx={498} cy={226} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={995} cy={1042} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={763} cy={295} r={12} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M978 1647H1041A9 9 0 0 0 1059 1647H1074Q1086 1647 1086 1659V1695Q1086 1707 1074 1707H1059A9 9 0 0 0 1041 1707H978Q966 1707 966 1695V1659Q966 1647 978 1647Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-25 1026 1677)" />
        <Rect x={140} y={520} width={800} height={880} rx={56} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" />
      </Svg>
  );
}
