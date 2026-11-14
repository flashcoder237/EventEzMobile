/**
 * Confirmation par appui maintenu, pour les actions IRRÉVERSIBLES uniquement.
 *
 * Pourquoi : un bouton rouge se tape par réflexe. Le maintien impose une
 * présence au geste pendant toute la durée, et lever le doigt avant la fin
 * annule. On échange un tap de rejet automatique contre un engagement moteur.
 *
 * Ne pas poser sur un « Enregistrer » ordinaire : répété, le maintien devient
 * une taxe. Réservé aux actions à diffusion large ou à effet monétaire
 * (annulation d'événement : auto-remboursement + notification des inscrits).
 * Pour l'argent qui sort du wallet, `useBiometricConfirm` reste plus fort et
 * doit être préféré.
 *
 * Technique : une couche de remplissage en position absolue, animée en
 * `scaleX` de 0 → 1 avec `transformOrigin` à gauche. C'est du TRANSFORM pur,
 * donc aucune propriété de mise en page n'est touchée et aucun voisin ne
 * bouge (pas de width, pas de flexGrow — cf. règle projet). `withTiming`
 * linéaire, jamais `withSpring` : la barre doit représenter le temps écoulé,
 * un ressort mentirait sur la progression.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Durations } from '../../constants/motion';
import { haptics } from '../../utils/haptics';

/** Durée d'appui par défaut. Assez long pour être délibéré, assez court pour ne pas punir. */
export const HOLD_DURATION_MS = 1600;

export interface HoldToConfirmProps {
  /** Appelé une seule fois, quand le maintien atteint son terme. */
  onConfirm: () => void;
  /** Libellé au repos. */
  label: string;
  /** Libellé pendant le maintien. À défaut, `label` est conservé. */
  holdingLabel?: string;
  /** Durée du maintien en ms. */
  duration?: number;
  disabled?: boolean;
  /** Affiche un indicateur et bloque l'appui (action en vol). */
  loading?: boolean;
  /** Couleur de la couche révélée. Destructif par défaut. */
  fillColor?: string;
  /** Couleur du fond au repos. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export default function HoldToConfirm({
  onConfirm,
  label,
  holdingLabel,
  duration = HOLD_DURATION_MS,
  disabled = false,
  loading = false,
  fillColor = '#EF4444',
  backgroundColor = 'transparent',
  style,
  textStyle,
  testID,
}: HoldToConfirmProps) {
  const reduced = useReducedMotion();
  const [isHolding, setIsHolding] = useState(false);

  const progress = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Garde anti-double déclenchement. */
  const firedRef = useRef(false);

  const blocked = disabled || loading;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelHold = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimer();
    setIsHolding(false);
    // Repli en `respond` (160 ms) : assez rapide pour signaler l'annulation
    // sans donner l'impression d'un bug.
    progress.value = withTiming(0, {
      duration: Durations.respond,
      easing: Easing.out(Easing.quad),
    });
  }, [clearTimer, progress]);

  const startHold = useCallback(() => {
    if (blocked || firedRef.current || timerRef.current !== null) return;

    setIsHolding(true);
    haptics.light();

    // En mouvement réduit, la barre n'est pas animée mais le maintien est
    // CONSERVÉ : c'est un garde-fou, pas une décoration. L'état final est
    // atteint, seule la progression n'est plus dessinée.
    progress.value = reduced
      ? 0
      : withTiming(1, { duration, easing: Easing.linear });

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      setIsHolding(false);
      // L'haptique tombe au pic visuel : la barre vient d'arriver au bout.
      haptics.success();
      onConfirm();
      progress.value = 0;
      // Le verrou protège du double déclenchement, il ne doit pas condamner le
      // bouton si l'action échoue.
      setTimeout(() => {
        firedRef.current = false;
      }, 0);
    }, duration);
  }, [blocked, duration, onConfirm, progress, reduced]);

  // Un composant démonté pendant un maintien ne doit pas déclencher l'action
  // après coup.
  useEffect(() => clearTimer, [clearTimer]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <Pressable
      testID={testID}
      onPressIn={startHold}
      onPressOut={cancelHold}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      // L'action d'accessibilité est le chemin SANS maintien : on ne demande
      // pas à un utilisateur de lecteur d'écran de doser un appui long.
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={() => {
        if (blocked || firedRef.current) return;
        firedRef.current = true;
        onConfirm();
        setTimeout(() => {
          firedRef.current = false;
        }, 0);
      }}
      accessibilityState={{ disabled: blocked, busy: isHolding }}
      style={[styles.button, { backgroundColor }, blocked && styles.blocked, style]}
    >
      {/* Couche de remplissage : transform pur, origine à gauche. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, { backgroundColor: fillColor }, fillStyle]}
      />
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={[styles.label, textStyle]} numberOfLines={1}>
          {isHolding ? (holdingLabel ?? label) : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blocked: {
    opacity: 0.6,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    // L'origine à gauche fait que la barre se remplit vers la droite au lieu
    // de s'étirer depuis le centre.
    transformOrigin: 'left',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export { HoldToConfirm };
