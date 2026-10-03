/**
 * SwipeAction — ligne balayable sur le thread UI (T8).
 *
 *   - ReanimatedSwipeable (déjà inclus dans gesture-handler) au lieu de
 *     l'ancien Swipeable animé côté JS ;
 *   - actions révélées progressivement : icône 0,6 → 1, libellé en fondu à
 *     partir de la moitié ;
 *   - balayage complet (> 60 % de la ligne) : l'action principale (la
 *     première de la liste) se déclenche, avec une vibration « sélection » au
 *     passage du seuil ;
 *   - une seule ligne ouverte à la fois dans toute l'app.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  SwipeDirection,
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { haptics } from '../../../utils/haptics';
import { FontFamily } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

/** Seuil du balayage complet, en fraction de la largeur de la ligne. */
export const FULL_SWIPE_RATIO = 0.7;

/**
 * Distance horizontale (px) avant que le balayage ne prenne la main. 10 par
 * défaut dans gesture-handler : un défilement vertical un peu en biais
 * ouvrait la ligne (« trop sensible », retour testeur 2026-10-03).
 */
export const SWIPE_ACTIVATION_PX = 24;

export interface SwipeActionItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface SwipeActionProps {
  children: React.ReactNode;
  /** Révélées en balayant vers la droite. La première est l'action principale. */
  leftActions?: SwipeActionItem[];
  /** Révélées en balayant vers la gauche. La première est l'action principale. */
  rightActions?: SwipeActionItem[];
  /** Balayage complet = action principale. Défaut true. */
  fullSwipe?: boolean;
  actionWidth?: number;
  enabled?: boolean;
  /**
   * Fond OPAQUE de la ligne. Indispensable : les actions sont peintes SOUS la
   * ligne ; une ligne transparente laissait le titre, la date et le badge
   * s'afficher par-dessus le rouge/orange. Défaut : fond de l'écran.
   */
  rowBackground?: string;
}

type Side = 'left' | 'right';

let openRow: SwipeableMethods | null = null;

export function SwipeAction({
  children,
  leftActions,
  rightActions,
  fullSwipe = true,
  actionWidth = 80,
  enabled = true,
  rowBackground,
}: SwipeActionProps) {
  const { colors } = useTheme();
  const ref = useRef<SwipeableMethods>(null);
  const [rowW, setRowW] = useState(0);
  const armed = useRef<Side | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width), []);

  const arm = useCallback((side: Side | null) => {
    if (armed.current === side) return;
    armed.current = side;
    if (side) haptics.selection();
  }, []);

  useEffect(
    () => () => {
      if (openRow === ref.current) openRow = null;
    },
    [],
  );

  const onWillOpen = useCallback(
    (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
      if (openRow && openRow !== ref.current) openRow.close();
      openRow = ref.current;
      // RIGHT = contenu déplacé vers la droite → panneau de gauche ouvert.
      const side: Side = direction === SwipeDirection.RIGHT ? 'left' : 'right';
      if (fullSwipe && armed.current === side) {
        const primary = (side === 'left' ? leftActions : rightActions)?.[0];
        armed.current = null;
        ref.current?.close();
        primary?.onPress();
      }
    },
    [fullSwipe, leftActions, rightActions],
  );

  const onClose = useCallback(() => {
    if (openRow === ref.current) openRow = null;
    armed.current = null;
  }, []);

  const renderPanel = (side: Side, items?: SwipeActionItem[]) =>
    items && items.length
      ? (progress: SharedValue<number>, translation: SharedValue<number>) => (
          <ActionPanel
            side={side}
            items={items}
            progress={progress}
            translation={translation}
            rowWidth={rowW}
            actionWidth={actionWidth}
            fullSwipe={fullSwipe}
            onArm={arm}
            close={() => ref.current?.close()}
          />
        )
      : undefined;

  return (
    <View onLayout={onLayout}>
      <ReanimatedSwipeable
        ref={ref}
        enabled={enabled}
        friction={2}
        leftThreshold={actionWidth * 0.6}
        rightThreshold={actionWidth * 0.6}
        dragOffsetFromLeftEdge={SWIPE_ACTIVATION_PX}
        dragOffsetFromRightEdge={SWIPE_ACTIVATION_PX}
        containerStyle={styles.clip}
        childrenContainerStyle={{ backgroundColor: rowBackground ?? colors.background }}
        overshootLeft={fullSwipe && !!leftActions?.length}
        overshootRight={fullSwipe && !!rightActions?.length}
        renderLeftActions={renderPanel('left', leftActions)}
        renderRightActions={renderPanel('right', rightActions)}
        onSwipeableWillOpen={onWillOpen}
        onSwipeableClose={onClose}
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}

function ActionPanel({
  side,
  items,
  progress,
  translation,
  rowWidth,
  actionWidth,
  fullSwipe,
  onArm,
  close,
}: {
  side: Side;
  items: SwipeActionItem[];
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  rowWidth: number;
  actionWidth: number;
  fullSwipe: boolean;
  onArm: (side: Side | null) => void;
  close: () => void;
}) {
  const wasArmed = useSharedValue(false);

  useAnimatedReaction(
    () => translation.value,
    (tx) => {
      if (!fullSwipe || !rowWidth) return;
      const onSide = side === 'left' ? tx > 0 : tx < 0;
      const isArmed = onSide && Math.abs(tx) > rowWidth * FULL_SWIPE_RATIO;
      if (isArmed !== wasArmed.value) {
        wasArmed.value = isArmed;
        runOnJS(onArm)(isArmed ? side : null);
      }
    },
    [fullSwipe, rowWidth, side],
  );

  return (
    <View
      style={[
        styles.panel,
        side === 'left' ? styles.panelLeft : styles.panelRight,
        // Le fond prend la couleur de l'action principale : un balayage
        // complet « remplit » la ligne avec elle.
        { backgroundColor: items[0].color, minWidth: actionWidth * items.length },
      ]}
    >
      {(side === 'right' ? [...items].reverse() : items).map((item) => (
        <ActionButton
          key={item.key}
          item={item}
          width={actionWidth}
          progress={progress}
          onPress={() => {
            close();
            item.onPress();
          }}
        />
      ))}
    </View>
  );
}

function ActionButton({
  item,
  width,
  progress,
  onPress,
}: {
  item: SwipeActionItem;
  width: number;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], Extrapolation.CLAMP) }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, { width, backgroundColor: item.color }]}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel ?? item.label}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={item.icon} size={22} color="#fff" />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {item.label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  panel: { flexDirection: 'row', alignItems: 'stretch' },
  panelLeft: { justifyContent: 'flex-start' },
  panelRight: { justifyContent: 'flex-end' },
  btn: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: 11 },
});

export default SwipeAction;
