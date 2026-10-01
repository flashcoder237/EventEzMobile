/**
 * HoloSheen — bande de reflet irisé pilotée par l'inclinaison (E3, billet
 * holographique façon Wallet).
 *
 * À poser dans un conteneur qui NE CONTIENT PAS le QR (en-tête / talon) :
 * règle du style guide, jamais rien par-dessus un QR. Le reflet ne capte
 * aucun toucher (pointerEvents none) et reste figé au centre, discret, si
 * le mouvement est coupé (reduced-motion → reflet statique).
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

export interface HoloSheenProps {
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  /** Amplitude horizontale du déplacement de la bande (px). */
  travel?: number;
  /** Teinte du reflet (G17 : dorure du faire-part). Défaut : irisé. */
  colors?: readonly [string, string, ...string[]];
}

/** G17 — dorure : reflet chaud sur un filet doré. */
export const GOLD_SHEEN = [
  'rgba(255,255,255,0)',
  'rgba(201,169,97,0.35)',
  'rgba(255,236,179,0.95)',
  'rgba(201,169,97,0.35)',
  'rgba(255,255,255,0)',
] as const;

const COLORS = [
  'rgba(255,255,255,0)',
  'rgba(79,70,229,0.14)',
  'rgba(168,85,247,0.18)',
  'rgba(255,107,107,0.12)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0)',
] as const;

function HoloSheenComponent({ tiltX, tiltY, travel = 140, colors = COLORS }: HoloSheenProps) {
  const band = useAnimatedStyle(() => {
    const energy = Math.min(1, Math.abs(tiltX.value) + Math.abs(tiltY.value));
    return {
      opacity: 0.3 + 0.55 * energy,
      transform: [
        { translateX: tiltX.value * travel },
        { translateY: -tiltY.value * 30 },
        { rotate: '20deg' },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Animated.View style={[styles.band, band]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  band: {
    position: 'absolute',
    top: '-60%',
    bottom: '-60%',
    left: '22%',
    width: '56%',
  },
});

export const HoloSheen = memo(HoloSheenComponent);
export default HoloSheen;
