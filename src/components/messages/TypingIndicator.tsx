/**
 * Composant d'indicateur de frappe anime
 * Affiche les dots animes quand quelqu'un ecrit
 *
 * Migré sur react-native-reanimated (worklet UI thread) — plus performant
 * que `Animated.Value` classique. Cleanup explicite via `cancelAnimation`.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';
import { Colors, FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface TypingIndicatorProps {
  typingUsers: string[];
  compact?: boolean;
}

export default function TypingIndicator({ typingUsers, compact = false }: TypingIndicatorProps) {
  const { colors } = useTheme();

  // 3 dots — shared values sur l'UI thread
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    if (typingUsers.length === 0) return;

    const cycle = () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      );

    dot1.value = cycle();
    dot2.value = withDelay(150, cycle());
    dot3.value = withDelay(300, cycle());

    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
      dot1.value = 0;
      dot2.value = 0;
      dot3.value = 0;
    };
  }, [typingUsers.length]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot1.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dot1.value, [0, 1], [0, -4]) }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot2.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dot2.value, [0, 1], [0, -4]) }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot3.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dot3.value, [0, 1], [0, -4]) }],
  }));

  if (typingUsers.length === 0) return null;

  // Formatage du texte
  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} ecrit`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]} et ${typingUsers[1]} ecrivent`;
    }
    return `${typingUsers[0]} et ${typingUsers.length - 1} autres ecrivent`;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dot1Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dot2Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dot3Style]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.gray100 }]}>
      <View style={[styles.bubble, { backgroundColor: colors.gray100 }]}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dot1Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dot2Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dot3Style]} />
        </View>
      </View>
      <Text style={[styles.text, { color: colors.gray500 }]}>{getTypingText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  compactContainer: {
    padding: Spacing.xs,
  },
  bubble: {
    backgroundColor: Colors.gray100,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray500,
  },
  text: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
});
