import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { color?: string; size?: number };

/**
 * Feedback — redesign SVG (design-handoff/eventez-svg-redesign).
 * L'accent #4F46E5 est piloté par la prop `color`.
 */
export default function Feedback({ color = '#4F46E5', size = 200 }: Props) {
  return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="feedback-fb-c" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#FDFBF7" />
            <Stop offset={1} stopColor="#EFE9DF" />
          </LinearGradient>
        </Defs>
        <Path d="M52 40C88 18 150 26 172 64C194 102 176 160 132 176C88 192 34 174 22 130C10 86 16 62 52 40Z" fill={color} fillOpacity={0.06} />
        <Ellipse cx={100} cy={178} rx={60} ry={5} fill={color} fillOpacity={0.12} />
        <Rect x={33} y={63} width={148} height={88} rx={16} fill="#4338CA" />
        <Rect x={26} y={54} width={148} height={88} rx={16} fill="url(#feedback-fb-c)" stroke={color} strokeWidth={5} />
        <Path d="M46 75L48.9 82L56.5 82.6L50.7 87.5L52.5 94.9L46 91L39.5 94.9L41.3 87.5L35.5 82.6L43.1 82Z" fill="#FF6B6B" />
        <Path d="M72 75L74.9 82L82.5 82.6L76.7 87.5L78.5 94.9L72 91L65.5 94.9L67.3 87.5L61.5 82.6L69.1 82Z" fill="#FF6B6B" />
        <Path d="M98 75L100.9 82L108.5 82.6L102.7 87.5L104.5 94.9L98 91L91.5 94.9L93.3 87.5L87.5 82.6L95.1 82Z" fill="#FF6B6B" />
        <Path d="M124 75L126.9 82L134.5 82.6L128.7 87.5L130.5 94.9L124 91L117.5 94.9L119.3 87.5L113.5 82.6L121.1 82Z" fill="#FF6B6B" />
        <Path d="M150 75L152.9 82L160.5 82.6L154.7 87.5L156.5 94.9L150 91L143.5 94.9L145.3 87.5L139.5 82.6L147.1 82Z" fill="none" stroke={color} strokeWidth={3} strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 116H114" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M44 128H92" stroke={color} strokeWidth={4} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
        <G id="anim-float-bubble">
          <Path d="M126 12H170Q182 12 182 24V40Q182 52 170 52H150L138 62L140 52H126Q114 52 114 40V24Q114 12 126 12Z" fill={color} />
          <Path d="M148 40.1C136.3 32.9 138.1 23.5 143.5 23.5C146.2 23.5 148 25.2 148 27.5C148 25.2 149.8 23.5 152.5 23.5C157.9 23.5 159.7 32.9 148 40.1Z" fill="#FDFBF7" />
        </G>
        <G id="anim-twinkle-sparkles">
          <Path d="M26 26C27.8 32.2 27.8 32.2 34 34C27.8 35.8 27.8 35.8 26 42C24.2 35.8 24.2 35.8 18 34C24.2 32.2 24.2 32.2 26 26Z" fill="#A855F7" />
          <Path d="M30 154C31.3 158.7 31.3 158.7 36 160C31.3 161.3 31.3 161.3 30 166C28.7 161.3 28.7 161.3 24 160C28.7 158.7 28.7 158.7 30 154Z" fill={color} />
        </G>
      </Svg>
  );
}
