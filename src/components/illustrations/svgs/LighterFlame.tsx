import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * LighterFlame — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function LighterFlame({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <RadialGradient id="lighterflame-lf-h" cx={0.5} cy={0.5} r={0.5}>
            <Stop offset={0} stopColor="#FFB347" stopOpacity={0.55} />
            <Stop offset={0.55} stopColor="#FF8A3D" stopOpacity={0.16} />
            <Stop offset={1} stopColor="#FF6B6B" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="lighterflame-lf-o" x1={0} y1={1} x2={0} y2={0}>
            <Stop offset={0} stopColor="#FF6B6B" />
            <Stop offset={0.55} stopColor="#FF9F43" />
            <Stop offset={1} stopColor="#FFC861" />
          </LinearGradient>
          <LinearGradient id="lighterflame-lf-k" x1={0} y1={1} x2={0} y2={0}>
            <Stop offset={0} stopColor="#FFF4D6" />
            <Stop offset={1} stopColor="#FFE08A" />
          </LinearGradient>
          <LinearGradient id="lighterflame-lf-b" x1={0} y1={0} x2={1} y2={0}>
            <Stop offset={0} stopColor="#4338CA" />
            <Stop offset={0.35} stopColor={color} />
            <Stop offset={1} stopColor="#4338CA" />
          </LinearGradient>
          <LinearGradient id="lighterflame-lf-m" x1={0} y1={0} x2={1} y2={0}>
            <Stop offset={0} stopColor="#94A3B8" />
            <Stop offset={0.4} stopColor="#E2E8F0" />
            <Stop offset={1} stopColor="#94A3B8" />
          </LinearGradient>
        </Defs>
        <G id="anim-flame-halo">
          <Circle cx={98} cy={66} r={66} fill="url(#lighterflame-lf-h)" />
        </G>
        <G id="anim-flame-outer">
          <Path transform="translate(98 112) scale(1.4) translate(-98 -112)" d="M98 112C78 110 72 92 80 76C86 64 92 54 90 36C106 46 120 62 120 84C120 102 112 112 98 112Z" fill="url(#lighterflame-lf-o)" />
        </G>
        <G id="anim-flame-core">
          <G transform="translate(98 112) scale(1.4) translate(-98 -112)">
            <Path d="M98 108C88 107 85 98 89 90C92 84 95 78 95 68C103 76 108 86 107 96C106 104 103 108 98 108Z" fill="url(#lighterflame-lf-k)" />
            <Ellipse cx={98} cy={106} rx={7} ry={4} fill={color} fillOpacity={0.75} />
          </G>
        </G>
        <Rect x={80} y={114} width={36} height={18} rx={3} fill="url(#lighterflame-lf-m)" />
        <Circle cx={87} cy={119} r={2.2} fill="#64748B" />
        <Circle cx={87} cy={126} r={2.2} fill="#64748B" />
        <Circle cx={95} cy={119} r={2.2} fill="#64748B" />
        <Circle cx={95} cy={126} r={2.2} fill="#64748B" />
        <Circle cx={103} cy={119} r={2.2} fill="#64748B" />
        <Circle cx={103} cy={126} r={2.2} fill="#64748B" />
        <Circle cx={122} cy={118} r={8} fill="#64748B" />
        <Path d="M116 118H128M122 112V124" stroke="#94A3B8" strokeWidth={2} />
        <Rect x={74} y={130} width={56} height={62} rx={11} fill="url(#lighterflame-lf-b)" />
        <Path d="M84 140V182" stroke="#FDFBF7" strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
        <Rect x={74} y={130} width={56} height={62} rx={11} stroke="#4338CA" strokeWidth={3} />
      </Svg>
  );
}
