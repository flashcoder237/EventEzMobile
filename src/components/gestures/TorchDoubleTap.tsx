/**
 * G15 — double tap dans le viseur = torche.
 *
 * Enveloppe la vue racine d'un écran de scan : un double tap n'importe où
 * (hors boutons) bascule la torche. Le bouton torche de l'écran reste
 * l'équivalent accessible. Un Tap échoue dès que le doigt bouge.
 */
import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { haptics } from '../../utils/haptics';

export default function TorchDoubleTap({
  onToggle,
  enabled = true,
  children,
}: {
  onToggle: () => void;
  enabled?: boolean;
  /** Une seule vue native (la racine de l'écran). */
  children: React.ReactElement;
}) {
  const gesture = Gesture.Tap()
    .runOnJS(true)
    .enabled(enabled)
    .numberOfTaps(2)
    .maxDistance(16)
    .onEnd((_e, ok) => {
      if (!ok) return;
      haptics.light();
      onToggle();
    });
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
