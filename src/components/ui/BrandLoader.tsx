/**
 * Animation de chargement d'écran — identité EventEz.
 *
 * DEMANDE (2026-10-07) : « Animation de chargement d'écran ».
 *
 * Jusqu'ici, tous les écrans affichaient l'`ActivityIndicator` du système : la
 * roue grise d'Android, identique à celle de n'importe quelle application. Un
 * temps d'attente est pourtant l'un des rares moments où l'utilisateur REGARDE
 * l'écran sans rien faire — autant qu'il y reconnaisse EventEz.
 *
 * Trois billets qui pulsent en vague, dans les couleurs de la marque.
 *
 * ── CE QUI A GUIDÉ LE CHOIX ────────────────────────────────────────────────
 *
 * - **Pas de rotation.** Une roue qui tourne ne dit rien de plus qu'une forme
 *   qui respire, et elle attire l'œil plus fort qu'il ne faut pour une
 *   attente d'une seconde.
 * - **Une vague, pas un clignotement.** Le décalage entre les trois points
 *   suggère une progression ; trois points qui clignotent ensemble suggèrent
 *   une panne.
 * - **« Réduire les animations » est respecté** : les points deviennent
 *   statiques, à des opacités différentes. L'écran reste lisible et identifié,
 *   sans mouvement.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BrandLoaderProps {
  /** Message facultatif sous l'animation. */
  message?: string;
  /** Diamètre d'un point, en points. */
  dotSize?: number;
  style?: ViewStyle;
  /** Libellé lu par les lecteurs d'écran. */
  accessibilityLabel?: string;
  /** Force la couleur des points (fond sombre, bouton coloré…). */
  color?: string;
}

const DOTS = [0, 1, 2];
const CYCLE_MS = 1050;

export default function BrandLoader({
  message,
  dotSize = 10,
  style,
  accessibilityLabel,
  color,
}: BrandLoaderProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // Une valeur animée par point : le décalage de départ crée la vague.
  const values = useRef(DOTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduceMotion) return;

    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * (CYCLE_MS / 6)),
          Animated.timing(value, {
            toValue: 1,
            duration: CYCLE_MS / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: CYCLE_MS / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    // Arrêt explicite au démontage : une boucle laissée en vie continue de
    // réveiller le thread d'animation sur un écran qui n'existe plus.
    return () => loops.forEach((loop) => loop.stop());
  }, [reduceMotion, values]);

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? message}
      testID="brand-loader"
    >
      <View style={styles.row}>
        {DOTS.map((index) => (
          <Animated.View
            key={index}
            testID={`brand-loader-dot-${index}`}
            style={[
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                // Une couleur imposée s'applique à TOUS les points : elle vient
                // d'un appelant qui sait sur quel fond il dessine.
                backgroundColor: color ?? (index === 1 ? colors.accent : colors.primary),
              },
              reduceMotion
                // Sans mouvement, on garde une nuance d'opacité : l'ensemble
                // reste une composition, pas trois pastilles identiques.
                ? { opacity: 0.45 + index * 0.2 }
                : {
                    opacity: values[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                    transform: [
                      {
                        scale: values[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.75, 1.15],
                        }),
                      },
                    ],
                  },
            ]}
          />
        ))}
      </View>
      {!!message && (
        <Text style={[styles.message, { color: colors.gray500 }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});
