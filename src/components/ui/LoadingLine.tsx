/**
 * Ligne d'attente contextuelle (R3 W1).
 *
 * Rien pendant 1,2 s, puis une phrase propre au contexte, en fondu (opacité
 * seulement : rien ne bouge autour). `floating` la pose en surimpression en bas
 * de l'écran, sous forme de pastille, sans décaler le squelette qu'elle
 * accompagne.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { useLoadingLine } from '../../hooks/useLoadingLine';
import type { LoadingContext } from '../../lib/utils/loadingNarrative';

interface Props {
  context: LoadingContext;
  active?: boolean;
  floating?: boolean;
  /** Distance au bas de l'écran en mode flottant (au-dessus de la barre d'onglets). */
  bottomOffset?: number;
  style?: ViewStyle;
}

function LoadingLineComponent({ context, active = true, floating = false, bottomOffset = 112, style }: Props) {
  const { colors } = useTheme();
  const line = useLoadingLine(context, active);
  if (!active || !line) return null;
  return (
    <View
      pointerEvents="none"
      style={floating ? [styles.floatingWrap, { bottom: bottomOffset }] : undefined}
    >
      <Animated.View
        entering={FadeIn.duration(Durations.enter)}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        style={[
          floating ? [styles.pill, { backgroundColor: colors.card, borderColor: colors.border }] : styles.inline,
          style,
        ]}
        testID="loading-line"
      >
        <Text style={[styles.text, { color: colors.gray500 }]} numberOfLines={2}>
          {line}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 5,
  },
  pill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 420,
  },
  inline: {
    marginTop: 12,
  },
  text: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    textAlign: 'center',
  },
});

export const LoadingLine = memo(LoadingLineComponent);
export default LoadingLine;
