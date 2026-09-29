/**
 * SpringChip — chip de filtre qui répond au doigt (catalogue C3).
 *   - toucher : échelle 0,95 en ressort (transform uniquement) + vibration
 *     « sélection » au relâché ;
 *   - bascule actif/inactif : le fond glisse d'une couleur à l'autre en 180 ms
 *     (interpolateColor) et l'icône fait un petit pop à l'activation ;
 *   - `gradient` : fond en dégradé de marque (chip « Tous »), icône blanche.
 * Réduire les animations : pas d'échelle ni de pop, changement de couleur sec.
 *
 * EdgeFadeScroll — ScrollView horizontal dont les bords s'estompent (16 px de
 * chaque côté) pour suggérer qu'on peut faire défiler. Un seul MaskedView par
 * rangée (jamais par chip).
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { haptics } from '../../../utils/haptics';
import { useMotionGate } from './useMotionGate';

export interface SpringChipProps {
  onPress?: () => void;
  active?: boolean;
  /** Fond en dégradé de marque (ignore activeColor). */
  gradient?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

function SpringChipComponent({
  onPress,
  active = false,
  gradient = false,
  activeColor,
  inactiveColor,
  icon,
  children,
  style,
  accessibilityLabel,
  testID,
}: SpringChipProps) {
  const { colors, gradients } = useTheme();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });
  const on = activeColor ?? colors.primary;
  const off = inactiveColor ?? colors.gray100;
  const scale = useSharedValue(1);
  const progress = useSharedValue(active ? 1 : 0);
  const iconScale = useSharedValue(1);
  const prev = useRef(active);

  useEffect(() => {
    const was = prev.current;
    prev.current = active;
    if (was === active) return;
    progress.value = canAnimate ? withTiming(active ? 1 : 0, { duration: 180 }) : active ? 1 : 0;
    if (active && canAnimate) {
      iconScale.value = withSequence(
        withTiming(1.25, { duration: 110 }),
        withSpring(1, { damping: 12, stiffness: 320 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]),
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  return (
    <Pressable
      onPressIn={() => {
        if (canAnimate) scale.value = withSpring(0.95, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Animated.View style={[style, styles.clip, gradient ? null : bgStyle, pressStyle]}>
        {gradient && (
          <LinearGradient
            colors={gradients.brand as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {icon ? <Animated.View style={iconStyle}>{icon}</Animated.View> : null}
        {children}
      </Animated.View>
    </Pressable>
  );
}

export const SpringChip = memo(SpringChipComponent);

// ---------------------------------------------------------------------------

const FADE = 16;

export interface EdgeFadeScrollProps extends ScrollViewProps {
  children?: React.ReactNode;
  fade?: number;
}

function EdgeFadeScrollComponent({
  children,
  fade = FADE,
  style,
  onScroll,
  onContentSizeChange,
  ...rest
}: EdgeFadeScrollProps) {
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  // Un bord ne s'estompe que s'il y a du contenu caché de ce côté : au repos,
  // le premier chip (« Tous ») est collé au bord gauche et ne doit pas être
  // voilé par le fondu.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const scroll = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={32}
      {...rest}
      onContentSizeChange={(w, h) => {
        setContentWidth(Math.round(w));
        onContentSizeChange?.(w, h);
      }}
      onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const start = contentOffset.x <= 2;
        const end = contentOffset.x + layoutMeasurement.width >= contentSize.width - 2;
        if (start !== atStart) setAtStart(start);
        if (end !== atEnd) setAtEnd(end);
        onScroll?.(e);
      }}
    >
      {children}
    </ScrollView>
  );

  const overflows = contentWidth > width + 2;
  const fadeLeft = overflows && !atStart;
  const fadeRight = overflows && !atEnd;

  // L'arbre reste identique quand les bords changent (seules les couleurs du
  // masque bougent) : basculer View ↔ MaskedView remonterait le ScrollView et
  // le ramènerait au début.
  if (width <= fade * 2) {
    return (
      <View style={style} onLayout={onLayout}>
        {scroll}
      </View>
    );
  }

  const edge = fade / width;
  return (
    <View style={style} onLayout={onLayout}>
      <MaskedView
        maskElement={
          <LinearGradient
            colors={[fadeLeft ? 'transparent' : '#000', '#000', '#000', fadeRight ? 'transparent' : '#000']}
            locations={[0, edge, 1 - edge, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        }
      >
        {scroll}
      </MaskedView>
    </View>
  );
}

export const EdgeFadeScroll = memo(EdgeFadeScrollComponent);

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

export default SpringChip;
