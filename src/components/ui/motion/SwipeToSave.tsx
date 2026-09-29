/**
 * SwipeToSave — balayer une carte pour l'enregistrer (T7).
 *
 *   - vers la droite : un signet corail apparaît derrière la carte et grossit
 *     de 0,6 à 1 ; à 30 % de la largeur, vibration « selection » et le signet
 *     se remplit ; au-delà de 40 %, la carte résiste (élasticité) ;
 *   - relâcher au-delà du seuil : bascule du favori + éclat de particules ;
 *     la carte revient en ressort (transform uniquement) ;
 *   - vers la gauche (si `onRemove`) : « Retirer » en rouge — le parent replie
 *     la ligne (timing, jamais de ressort sur la hauteur) et propose « Annuler ».
 *
 * Jamais dans un carrousel horizontal. Départ refusé à moins de 24 px du bord
 * gauche (le retour iOS garde la main). `activeOffsetX ±14`, `failOffsetY ±8` :
 * le défilement vertical passe toujours en premier.
 */
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../../contexts/ThemeContext';
import { haptics } from '../../../utils/haptics';
import { Curves, springConfig } from '../../../constants/motion';
import { FontFamily } from '../../../constants/theme';
import { isReducedMotionCached } from '../../../hooks/useReducedMotion';
import { BurstParticles } from './BurstParticles';
import { rubberband } from './sheetPhysics';

const ARM_RATIO = 0.3;
const RESIST_RATIO = 0.4;
const EDGE_GUARD = 24;

export interface SwipeToSaveProps {
  children: React.ReactNode;
  saved: boolean;
  /** Bascule du favori (balayage vers la droite). */
  onToggleSave?: () => void;
  /** Retrait (balayage vers la gauche) — Favoris uniquement. */
  onRemove?: () => void;
  saveLabel: string;
  unsaveLabel: string;
  removeLabel?: string;
  enabled?: boolean;
  borderRadius?: number;
}

export function SwipeToSave({
  children,
  saved,
  onToggleSave,
  onRemove,
  saveLabel,
  unsaveLabel,
  removeLabel,
  enabled = true,
  borderRadius = 16,
}: SwipeToSaveProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [burst, setBurst] = useState(0);
  const [armedSide, setArmedSide] = useState<0 | 1 | -1>(0);
  const tx = useSharedValue(0);
  const startX = useSharedValue(0);
  const armed = useSharedValue(0);
  const w = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const v = e.nativeEvent.layout.width;
      setWidth(v);
      w.value = v;
    },
    [w],
  );

  const onArm = useCallback((side: 0 | 1 | -1) => {
    setArmedSide(side);
    if (side !== 0) haptics.selection();
  }, []);

  const commit = useCallback(
    (side: 1 | -1) => {
      if (side === 1 && onToggleSave) {
        if (!saved) {
          setBurst((b) => b + 1);
          haptics.light();
        }
        onToggleSave();
      } else if (side === -1 && onRemove) {
        onRemove();
      }
      setArmedSide(0);
    },
    [onRemove, onToggleSave, saved],
  );

  const canRight = !!onToggleSave;
  const canLeft = !!onRemove;
  // Lu côté JS au rendu : les callbacks du geste sont des worklets (thread UI)
  // et ne peuvent pas appeler une fonction JS ordinaire — on leur passe une
  // simple valeur capturée.
  const reduced = isReducedMotionCached();

  const pan = Gesture.Pan()
    .enabled(enabled && (canRight || canLeft))
    .activeOffsetX([-14, 14])
    .failOffsetY([-8, 8])
    .onBegin((e) => {
      startX.value = e.x;
    })
    .onUpdate((e) => {
      if (startX.value < EDGE_GUARD || !w.value) return;
      let d = e.translationX;
      if (d > 0 && !canRight) d = 0;
      if (d < 0 && !canLeft) d = 0;
      const lim = w.value * RESIST_RATIO;
      const abs = Math.abs(d);
      const shown = abs > lim ? lim + rubberband(abs - lim, 40) : abs;
      tx.value = Math.sign(d) * shown;
      const side = abs >= w.value * ARM_RATIO ? (d > 0 ? 1 : -1) : 0;
      if (side !== armed.value) {
        armed.value = side;
        runOnJS(onArm)(side as 0 | 1 | -1);
      }
    })
    .onFinalize(() => {
      const side = armed.value;
      armed.value = 0;
      tx.value = reduced
        ? withTiming(0, { duration: 200, easing: Curves.out })
        : withSpring(0, springConfig('respond'));
      if (side !== 0) runOnJS(commit)(side as 1 | -1);
      else runOnJS(onArm)(0);
    });

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const rightBgStyle = useAnimatedStyle(() => ({ opacity: tx.value > 0 ? 1 : 0 }));
  const leftBgStyle = useAnimatedStyle(() => ({ opacity: tx.value < 0 ? 1 : 0 }));
  const iconStyle = useAnimatedStyle(() => {
    const p = w.value ? Math.abs(tx.value) / (w.value * ARM_RATIO) : 0;
    return { transform: [{ scale: interpolate(p, [0, 1], [0.6, 1], Extrapolation.CLAMP) }] };
  });

  const willSave = !saved;

  return (
    <View onLayout={onLayout} style={{ borderRadius }}>
      {canRight ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.bg,
            { borderRadius, backgroundColor: `${colors.accent}1F` },
            rightBgStyle,
          ]}
        >
          <Animated.View style={iconStyle}>
            <Ionicons
              name={armedSide === 1 ? (willSave ? 'bookmark' : 'bookmark-outline') : 'bookmark-outline'}
              size={24}
              color={colors.accent}
            />
          </Animated.View>
          <Text style={[styles.bgLabel, { color: colors.accent }]} numberOfLines={1}>
            {willSave ? saveLabel : unsaveLabel}
          </Text>
        </Animated.View>
      ) : null}
      {canLeft ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.bg,
            styles.bgRight,
            { borderRadius, backgroundColor: `${colors.error}1F` },
            leftBgStyle,
          ]}
        >
          <Text style={[styles.bgLabel, { color: colors.error }]} numberOfLines={1}>
            {removeLabel}
          </Text>
          <Animated.View style={iconStyle}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Animated.View>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </GestureDetector>
      {width > 0 ? (
        <View pointerEvents="none" style={[styles.burst, { left: 34 }]}>
          <BurstParticles trigger={burst} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10 },
  bgRight: { justifyContent: 'flex-end' },
  bgLabel: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  burst: { position: 'absolute', top: '50%' },
});

export default SwipeToSave;
