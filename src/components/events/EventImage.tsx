/**
 * EventImage — affiche une image d'événement ENTIÈRE, sans rognage.
 *
 * PROBLÈME RÉSOLU : les organisateurs envoient des visuels de tous formats
 * (affiches verticales, bannières très larges, captures d'écran). Rendus en
 * `cover`, ils étaient rognés au format du bloc : une affiche portrait perdait
 * son titre en haut et la date en bas — précisément l'information que
 * l'organisateur avait mise dans l'image.
 *
 * SOLUTION : deux couches.
 *   1. Fond : la MÊME image en `cover` + flou → remplit le bloc, donne une
 *      ambiance colorée cohérente avec le visuel.
 *   2. Avant-plan : l'image en `contain` → visible en entier, jamais rognée.
 *
 * C'est le motif employé par Spotify, YouTube et Apple Music pour les pochettes
 * de format libre.
 *
 * QUAND NE PAS L'UTILISER : les images dont le cadrage est maîtrisé (avatars,
 * pièces jointes de messagerie, photos d'identité) doivent rester en `cover` —
 * un flou y serait du bruit, et le rognage est voulu.
 */

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface Props {
  /** URL résolue de l'image, ou `null` pour retomber sur `fallbackSource`. */
  uri?: string | null;
  /** Image locale de repli (require(...)). */
  fallbackSource?: any;
  /** Placeholder LQIP (data URI) affiché pendant le chargement. */
  placeholder?: string;
  /** Style du conteneur — c'est lui qui fixe les dimensions du bloc. */
  style?: StyleProp<ViewStyle>;
  /**
   * Intensité du flou de fond. Volontairement élevée par défaut : le fond doit
   * rester une ambiance, jamais une image concurrente de celle du dessus.
   */
  blurRadius?: number;
  transition?: number;
  accessibilityLabel?: string;
}

export default function EventImage({
  uri,
  fallbackSource,
  placeholder,
  style,
  blurRadius = 25,
  transition = 300,
  accessibilityLabel,
}: Props) {
  const source = uri ? { uri } : fallbackSource;

  return (
    <View style={[styles.container, style]}>
      {/* Couche 1 — LQIP : évite un trou blanc avant l'arrivée de l'image. */}
      {!!placeholder && (
        <ExpoImage
          source={{ uri: placeholder }}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
          // Purement décoratif : ne doit pas être annoncé.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}

      {/* Couche 2 — fond flouté : remplit l'espace laissé par le `contain`.
          `blurRadius` natif d'expo-image plutôt qu'un BlurView par-dessus :
          une seule vue au lieu de deux, et le flou est appliqué au décodage
          (moins coûteux qu'un effet de composition sur liste scrollable). */}
      <ExpoImage
        source={source}
        contentFit="cover"
        blurRadius={blurRadius}
        cachePolicy="memory-disk"
        style={StyleSheet.absoluteFillObject}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {/* Couche 3 — l'image réelle, ENTIÈRE. */}
      <ExpoImage
        source={source}
        contentFit="contain"
        transition={transition}
        cachePolicy="memory-disk"
        style={StyleSheet.absoluteFillObject}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // `hidden` : sans ça le fond flouté déborde des coins arrondis du parent.
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
