/**
 * SpringSheet — une seule physique pour toutes les feuilles de l'app (T5).
 *
 *   - destination projetée au lâcher (vitesse du doigt, décélération iOS),
 *     puis aimantation au cran le plus proche — ou fermeture ;
 *   - élasticité au-delà du cran haut (quand il n'y a pas de contenu à
 *     faire défiler) ;
 *   - le ressort `sheet` repart de la vitesse du doigt : on peut rattraper la
 *     feuille pendant qu'elle bouge (interruptible) ;
 *   - voile d'opacité 0 → 0,4 calqué sur la position ;
 *   - relais avec la liste interne (`SpringSheetScrollView`) : la feuille ne
 *     descend que si la liste est tout en haut ;
 *   - clavier géré, `accessibilityViewIsModal` ;
 *   - « Réduire les animations » : timing de 200 ms, sans ressort.
 *
 * Transform/opacité uniquement — jamais de ressort sur une hauteur.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatListProps,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView, NativeGesture } from 'react-native-gesture-handler';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { Curves, springConfig } from '../../../constants/motion';
import { nearestPoint, projectRelease, rubberband } from './sheetPhysics';

const BACKDROP_MAX = 0.4;
const RUBBER_LIMIT = 48;
const REDUCED_MS = 200;

interface SheetScrollContextValue {
  scrollY: SharedValue<number>;
  nativeGesture: NativeGesture;
  register: () => void;
}

const SheetScrollContext = createContext<SheetScrollContextValue | null>(null);

export interface SpringSheetProps {
  visible: boolean;
  /** Demande de fermeture (voile, geste, bouton retour Android). */
  onClose: () => void;
  /** Appelé une fois l'animation de sortie terminée. */
  onClosed?: () => void;
  children?: React.ReactNode;
  /** Crans en fraction de la hauteur de la feuille (0 < d ≤ 1). Défaut [1]. */
  detents?: number[];
  /** Index du cran d'ouverture. Défaut : le plus haut. */
  initialDetent?: number;
  /** Hauteur max (px). Défaut : 90 % de la fenêtre. */
  maxHeight?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  grabber?: boolean;
  grabberColor?: string;
  accessibilityLabel?: string;
  /** Voile appuyable pour fermer. Défaut true. */
  dismissOnBackdrop?: boolean;
  /** Décale la feuille au-dessus du clavier. Défaut true. */
  keyboardAware?: boolean;
  testID?: string;
}

export function SpringSheet({
  visible,
  onClose,
  onClosed,
  children,
  detents = [1],
  initialDetent,
  maxHeight,
  backgroundColor,
  style,
  grabber = true,
  grabberColor,
  accessibilityLabel,
  dismissOnBackdrop = true,
  keyboardAware = true,
  testID,
}: SpringSheetProps) {
  const { colors, isDark } = useTheme();
  const { height: winH } = useWindowDimensions();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);

  // Hauteur du clavier : la feuille est remontée au-dessus du clavier
  // (KeyboardAvoidingView) mais gardait sa hauteur (souvent 88-90 % de
  // l'écran) → elle débordait par le haut et l'en-tête + la recherche
  // sortaient de l'écran. On la plafonne à l'espace restant.
  const [keyboardH, setKeyboardH] = useState(0);
  useEffect(() => {
    if (!keyboardAware || !mounted) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setKeyboardH(e.endCoordinates?.height ?? 0));
    const h = Keyboard.addListener(hideEvt, () => setKeyboardH(0));
    return () => {
      s.remove();
      h.remove();
      setKeyboardH(0);
    };
  }, [keyboardAware, mounted]);
  const baseMaxH = maxHeight ?? winH * 0.9;
  const sheetMaxH = keyboardH > 0
    ? Math.max(160, Math.min(baseMaxH, winH - keyboardH - insets.top - 12))
    : baseMaxH;

  const sheetH = useSharedValue(0);
  const y = useSharedValue(winH);
  const startY = useSharedValue(0);
  const baseline = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const hasScroll = useSharedValue(false);
  const pendingOpen = useSharedValue(visible);
  const reducedSV = useSharedValue(reduced);
  useEffect(() => {
    reducedSV.value = reduced;
  }, [reduced, reducedSV]);

  const fractions = useMemo(
    () => [...detents].filter((d) => d > 0 && d <= 1).sort((a, b) => b - a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detents.join(',')],
  );
  const startIndex = initialDetent != null ? Math.min(Math.max(initialDetent, 0), fractions.length - 1) : 0;
  const fractionsSV = useSharedValue<number[]>(fractions);
  const startFraction = useSharedValue(fractions[startIndex] ?? 1);
  useEffect(() => {
    fractionsSV.value = fractions;
    startFraction.value = fractions[startIndex] ?? 1;
  }, [fractions, startIndex, fractionsSV, startFraction]);

  // `onClose` est presque toujours une flèche inline du parent : nouvelle
  // identité à CHAQUE rendu. L'avoir en dépendance du geste recréait le Pan à
  // chaque rendu du parent, y compris PENDANT un défilement — sur Android
  // (RNGH 2.28 / Fabric), remplacer un handler actif peut faire planter l'app
  // (« Already prepared or hasn't been reset »). Le geste ne dépend plus que
  // d'une référence stable.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const requestClose = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  const finishClose = useCallback(() => {
    setMounted(false);
    onClosed?.();
  }, [onClosed]);

  // Ouverture / fermeture pilotées par `visible`.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      pendingOpen.value = true;
      if (sheetH.value > 0) {
        const H = sheetH.value;
        const target = H * (1 - startFraction.value);
        y.value = H;
        y.value = reduced
          ? withTiming(target, { duration: REDUCED_MS, easing: Curves.out })
          : withSpring(target, springConfig('sheet'));
        pendingOpen.value = false;
      }
    } else if (mounted) {
      const H = sheetH.value || winH;
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) runOnJS(finishClose)();
      };
      y.value = reduced
        ? withTiming(H, { duration: REDUCED_MS, easing: Curves.out }, done)
        : withSpring(H, { ...springConfig('sheet'), overshootClamping: true }, done);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onSheetLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const H = e.nativeEvent.layout.height;
      if (!H) return;
      sheetH.value = H;
      if (pendingOpen.value && visible) {
        pendingOpen.value = false;
        const target = H * (1 - startFraction.value);
        y.value = H;
        y.value = reduced
          ? withTiming(target, { duration: REDUCED_MS, easing: Curves.out })
          : withSpring(target, springConfig('sheet'));
      }
    },
    [pendingOpen, reduced, sheetH, startFraction, visible, y],
  );

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  const registerScroll = useCallback(() => {
    hasScroll.value = true;
  }, [hasScroll]);
  const ctx = useMemo<SheetScrollContextValue>(
    () => ({ scrollY, nativeGesture, register: registerScroll }),
    [scrollY, nativeGesture, registerScroll],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .simultaneousWithExternalGesture(nativeGesture)
        .onStart(() => {
          startY.value = y.value;
          baseline.value = 0;
        })
        .onUpdate((e) => {
          // Contenu en cours de défilement : la feuille attend que la liste
          // revienne tout en haut, puis prend le relais depuis ce point.
          if (hasScroll.value && scrollY.value > 0) {
            baseline.value = e.translationY;
            return;
          }
          const H = sheetH.value;
          if (!H) return;
          const fr = fractionsSV.value;
          const top = H * (1 - fr[0]);
          let next = startY.value + e.translationY - baseline.value;
          if (next < top) {
            // Avec une liste, c'est elle qui défile vers le haut ; sinon la
            // feuille résiste (élasticité).
            next = hasScroll.value ? top : top - rubberband(top - next, RUBBER_LIMIT);
          }
          y.value = Math.min(next, H);
        })
        .onEnd((e) => {
          const H = sheetH.value;
          if (!H) return;
          const fr = fractionsSV.value;
          const points: number[] = [];
          for (let i = 0; i < fr.length; i++) points.push(H * (1 - fr[i]));
          points.push(H);
          const proj = projectRelease(y.value, e.velocityY);
          const target = nearestPoint(proj, points);
          if (target === H) {
            runOnJS(requestClose)();
            return;
          }
          y.value = reducedSV.value
            ? withTiming(target, { duration: REDUCED_MS, easing: Curves.out })
            : withSpring(target, { ...springConfig('sheet'), velocity: e.velocityY });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nativeGesture, requestClose],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => {
    const H = sheetH.value;
    if (!H) return { opacity: 0 };
    const top = H * (1 - fractionsSV.value[0]);
    return {
      opacity: interpolate(y.value, [top, H], [BACKDROP_MAX, 0], Extrapolation.CLAMP),
    };
  });

  if (!mounted) return null;

  const sheet = (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={onSheetLayout}
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[
          styles.sheet,
          { backgroundColor: backgroundColor ?? colors.card },
          style,
          // APRÈS `style` : plafonne aussi une `height` fixe passée par l'appelant
          // (ex. SearchableSelectModal = 88 % de l'écran) quand le clavier est ouvert.
          { maxHeight: sheetMaxH },
          sheetStyle,
        ]}
      >
        {grabber ? (
          <View style={styles.grabberWrap}>
            <View style={[styles.grabber, { backgroundColor: grabberColor ?? (isDark ? '#475569' : '#CBD5E1') }]} />
          </View>
        ) : null}
        <SheetScrollContext.Provider value={ctx}>{children}</SheetScrollContext.Provider>
      </Animated.View>
    </GestureDetector>
  );

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={dismissOnBackdrop ? onClose : undefined}
            accessible={dismissOnBackdrop}
            accessibilityRole="button"
          />
        </Animated.View>
        {keyboardAware ? (
          <KeyboardAvoidingView behavior="padding" style={styles.root} pointerEvents="box-none">
            {sheet}
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.root} pointerEvents="box-none">
            {sheet}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Branche une liste interne sur la feuille (relais de geste + position). */
function useSheetScroll() {
  const ctx = useContext(SheetScrollContext);
  // Enregistrement après le rendu : écrire une shared value PENDANT le rendu
  // est interdit par Reanimated 4.
  useEffect(() => {
    ctx?.register();
  }, [ctx]);
  const localY = useSharedValue(0);
  const target = ctx?.scrollY ?? localY;
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      target.value = e.contentOffset.y;
    },
  });
  const wrap = (node: React.ReactElement) =>
    ctx ? <GestureDetector gesture={ctx.nativeGesture}>{node}</GestureDetector> : node;
  return { onScroll, wrap };
}

/**
 * Liste interne d'une SpringSheet : défile normalement, et rend la main à la
 * feuille quand elle est tout en haut (tirer vers le bas ferme la feuille).
 */
export function SpringSheetScrollView({ children, onScroll: _ignored, ...rest }: ScrollViewProps) {
  const { onScroll, wrap } = useSheetScroll();
  return wrap(
    <Animated.ScrollView bounces={false} scrollEventThrottle={16} {...rest} onScroll={onScroll}>
      {children}
    </Animated.ScrollView>,
  );
}

/** Variante FlatList (listes longues, sélecteurs). */
export function SpringSheetFlatList<T>({ onScroll: _ignored, ...rest }: FlatListProps<T>) {
  const { onScroll, wrap } = useSheetScroll();
  const List = Animated.FlatList as unknown as React.ComponentType<FlatListProps<T>>;
  return wrap(<List bounces={false} scrollEventThrottle={16} {...rest} onScroll={onScroll as never} />);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { backgroundColor: '#000' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  grabberWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
});

export default SpringSheet;
