import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { color?: string };

/**
 * GoingCardCorail — fond de story (design-handoff/eventez-svg-redesign/redesign/fonds).
 * Remplit son conteneur (preserveAspectRatio slice) : la carte de
 * prévisualisation n'a pas le ratio 9:16 du format story final.
 */
export default function GoingCardCorail({ color = '#4F46E5' }: Props) {
  return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <Rect width={1080} height={1920} fill="#FF6B6B" />
        <Circle cx={980} cy={160} r={360} fill="#FFE4E6" fillOpacity={0.22} />
        <Circle cx={80} cy={1800} r={420} fill="#9F1239" fillOpacity={0.14} />
        <Circle cx={907} cy={1683} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Path d="M428 1632.6C432.9 1650.1 432.9 1650.1 450.4 1655C432.9 1659.9 432.9 1659.9 428 1677.4C423.1 1659.9 423.1 1659.9 405.6 1655C423.1 1650.1 423.1 1650.1 428 1632.6Z" fill="#FFE4E6" />
        <Path d="M906 1721H969A9 9 0 0 0 987 1721H1002Q1014 1721 1014 1733V1769Q1014 1781 1002 1781H987A9 9 0 0 0 969 1781H906Q894 1781 894 1769V1733Q894 1721 906 1721Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(8 954 1751)" />
        <Path d="M772 1581H835A9 9 0 0 0 853 1581H868Q880 1581 880 1593V1629Q880 1641 868 1641H853A9 9 0 0 0 835 1641H772Q760 1641 760 1629V1593Q760 1581 772 1581Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-13 820 1611)" />
        <Path d="M778 1659.6C782.9 1677.1 782.9 1677.1 800.4 1682C782.9 1686.9 782.9 1686.9 778 1704.4C773.1 1686.9 773.1 1686.9 755.6 1682C773.1 1677.1 773.1 1677.1 778 1659.6Z" fill="#FFFFFF" />
        <Path d="M71 69C74.5 81.5 74.5 81.5 87 85C74.5 88.5 74.5 88.5 71 101C67.5 88.5 67.5 88.5 55 85C67.5 81.5 67.5 81.5 71 69Z" fill="#FFFFFF" />
        <Path d="M382 1415H445A9 9 0 0 0 463 1415H478Q490 1415 490 1427V1463Q490 1475 478 1475H463A9 9 0 0 0 445 1475H382Q370 1475 370 1463V1427Q370 1415 382 1415Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(16 430 1445)" />
        <Path d="M21 1090H84A9 9 0 0 0 102 1090H117Q129 1090 129 1102V1138Q129 1150 117 1150H102A9 9 0 0 0 84 1150H21Q9 1150 9 1138V1102Q9 1090 21 1090Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(30 69 1120)" />
        <Path d="M228 1396H291A9 9 0 0 0 309 1396H324Q336 1396 336 1408V1444Q336 1456 324 1456H309A9 9 0 0 0 291 1456H228Q216 1456 216 1444V1408Q216 1396 228 1396Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(30 276 1426)" />
        <Path d="M336 39.2C345.9 74.1 345.9 74.1 380.8 84C345.9 93.9 345.9 93.9 336 128.8C326.1 93.9 326.1 93.9 291.2 84C326.1 74.1 326.1 74.1 336 39.2Z" fill="#FFE4E6" />
        <Path d="M781 1769C788 1794 788 1794 813 1801C788 1808 788 1808 781 1833C774 1808 774 1808 749 1801C774 1794 774 1794 781 1769Z" fill="#FFFFFF" />
        <Circle cx={957} cy={1517} r={16.8} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M593 1817H656A9 9 0 0 0 674 1817H689Q701 1817 701 1829V1865Q701 1877 689 1877H674A9 9 0 0 0 656 1877H593Q581 1877 581 1865V1829Q581 1817 593 1817Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(7 641 1847)" />
        <Circle cx={913} cy={110} r={16.8} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M753 1643H816A9 9 0 0 0 834 1643H849Q861 1643 861 1655V1691Q861 1703 849 1703H834A9 9 0 0 0 816 1703H753Q741 1703 741 1691V1655Q741 1643 753 1643Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(12 801 1673)" />
        <Path d="M601 1815C608 1840 608 1840 633 1847C608 1854 608 1854 601 1879C594 1854 594 1854 569 1847C594 1840 594 1840 601 1815Z" fill="#FFE4E6" />
        <Path d="M512 231H575A9 9 0 0 0 593 231H608Q620 231 620 243V279Q620 291 608 291H593A9 9 0 0 0 575 291H512Q500 291 500 279V243Q500 231 512 231Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-7 560 261)" />
        <Path d="M493 1510H556A9 9 0 0 0 574 1510H589Q601 1510 601 1522V1558Q601 1570 589 1570H574A9 9 0 0 0 556 1570H493Q481 1570 481 1558V1522Q481 1510 493 1510Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-28 541 1540)" />
        <Rect x={140} y={520} width={800} height={880} rx={56} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" />
      </Svg>
  );
}
