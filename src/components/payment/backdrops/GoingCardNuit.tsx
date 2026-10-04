import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { color?: string };

/**
 * GoingCardNuit — fond de story (design-handoff/eventez-svg-redesign/redesign/fonds).
 * Remplit son conteneur (preserveAspectRatio slice) : la carte de
 * prévisualisation n'a pas le ratio 9:16 du format story final.
 */
export default function GoingCardNuit({ color = '#4F46E5' }: Props) {
  return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <Rect width={1080} height={1920} fill="#0F0F1A" />
        <Circle cx={980} cy={160} r={360} fill="#A855F7" fillOpacity={0.22} />
        <Circle cx={80} cy={1800} r={420} fill={color} fillOpacity={0.14} />
        <Path d="M549 277H612A9 9 0 0 0 630 277H645Q657 277 657 289V325Q657 337 645 337H630A9 9 0 0 0 612 337H549Q537 337 537 325V289Q537 277 549 277Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(10 597 307)" />
        <Path d="M586 144H649A9 9 0 0 0 667 144H682Q694 144 694 156V192Q694 204 682 204H667A9 9 0 0 0 649 204H586Q574 204 574 192V156Q574 144 586 144Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-14 634 174)" />
        <Path d="M556 489H619A9 9 0 0 0 637 489H652Q664 489 664 501V537Q664 549 652 549H637A9 9 0 0 0 619 549H556Q544 549 544 537V501Q544 489 556 489Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(4 604 519)" />
        <Circle cx={694} cy={1803} r={8.4} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M690 305.2C699.9 340.1 699.9 340.1 734.8 350C699.9 359.9 699.9 359.9 690 394.8C680.1 359.9 680.1 359.9 645.2 350C680.1 340.1 680.1 340.1 690 305.2Z" fill="#FFFFFF" />
        <Circle cx={105} cy={366} r={10} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Path d="M790 73H853A9 9 0 0 0 871 73H886Q898 73 898 85V121Q898 133 886 133H871A9 9 0 0 0 853 133H790Q778 133 778 121V85Q778 73 790 73Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(8 838 103)" />
        <Path d="M728 1809H791A9 9 0 0 0 809 1809H824Q836 1809 836 1821V1857Q836 1869 824 1869H809A9 9 0 0 0 791 1869H728Q716 1869 716 1857V1821Q716 1809 728 1809Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-5 776 1839)" />
        <Circle cx={785} cy={1680} r={16.8} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M91 83H154A9 9 0 0 0 172 83H187Q199 83 199 95V131Q199 143 187 143H172A9 9 0 0 0 154 143H91Q79 143 79 131V95Q79 83 91 83Z" fill="#FFFFFF" fillOpacity={0.18} transform="rotate(-17 139 113)" />
        <Circle cx={304} cy={1416} r={28} stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.45} />
        <Circle cx={738} cy={98} r={12} fill="#FFFFFF" fillOpacity={0.5} />
        <Path d="M755 1770C762 1795 762 1795 787 1802C762 1809 762 1809 755 1834C748 1809 748 1809 723 1802C748 1795 748 1795 755 1770Z" fill="#FFFFFF" />
        <Rect x={140} y={520} width={800} height={880} rx={56} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" />
      </Svg>
  );
}
