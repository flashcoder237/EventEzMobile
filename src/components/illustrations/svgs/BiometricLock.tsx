import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

type Props = { color?: string; size?: number };

const CORAL = '#FF6B6B';
const INDIGO_DARK = '#4338CA';
const CREAM = '#FDFBF7';

/**
 * BiometricLock — "Shield + fingerprint + spark of access".
 *
 * Bouclier indigo en demi-arc, empreinte digitale stylisée à l'intérieur (les
 * 4 ridges concentriques sont la métaphore universelle de la biométrie),
 * étincelle corail en haut à droite (touch point — le moment où l'auth
 * réussit). Cohérent avec Authentication.tsx (même palette indigo + coral
 * singulier, même épaisseur de ligne 5).
 *
 * Utilisé sur LockGate (overlay biométrie) — taille recommandée 160-200.
 */
export default function BiometricLock({ color = '#4F46E5', size = 200 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Blob ambiant */}
      <Path
        d="M40 60C50 20 110 10 150 40C190 70 185 140 140 165C95 190 30 165 25 120C20 95 30 80 40 60Z"
        fill={color}
        fillOpacity={0.06}
      />

      {/* Petits accents décoratifs */}
      <Circle cx={170} cy={50} r={3} fill={INDIGO_DARK} opacity={0.3} />
      <Circle cx={30} cy={140} r={2.5} fill={color} opacity={0.4} />

      {/* Bouclier — silhouette en U inversé arrondi */}
      <Path
        d="M 100 30
           L 155 50
           L 155 105
           C 155 140 130 165 100 175
           C 70 165 45 140 45 105
           L 45 50
           Z"
        fill={CREAM}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />

      {/* Empreinte digitale : 4 arcs concentriques + ligne centrale */}
      <G stroke={color} strokeLinecap="round" fill="none">
        {/* Arc le plus large */}
        <Path
          d="M 70 110 C 70 80 85 65 100 65 C 115 65 130 80 130 110 C 130 122 128 132 124 140"
          strokeWidth={4.5}
        />
        {/* Arc moyen */}
        <Path
          d="M 80 112 C 80 88 90 78 100 78 C 110 78 120 88 120 112 C 120 122 118 130 115 137"
          strokeWidth={4}
        />
        {/* Arc intérieur */}
        <Path
          d="M 90 113 C 90 96 95 90 100 90 C 105 90 110 96 110 113 C 110 122 108 128 106 134"
          strokeWidth={3.5}
        />
        {/* Point central */}
        <Circle cx={100} cy={108} r={3} fill={color} />
      </G>

      {/* Étincelle corail (touch success) — à la pointe haut-droite du bouclier */}
      <G stroke={CORAL} strokeWidth={4} strokeLinecap="round" fill="none">
        <Path d="M 145 38 L 152 31" />
        <Path d="M 158 42 L 165 38" />
        <Path d="M 152 50 L 158 55" />
      </G>
      <Circle cx={154} cy={42} r={3.5} fill={CORAL} />
    </Svg>
  );
}
