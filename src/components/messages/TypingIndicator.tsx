/**
 * Composant d'indicateur de frappe anime
 * Affiche les dots animes quand quelqu'un ecrit
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface TypingIndicatorProps {
  typingUsers: string[];
  compact?: boolean;
}

export default function TypingIndicator({ typingUsers, compact = false }: TypingIndicatorProps) {
  const { colors, isDark } = useTheme();

  // Animations pour les 3 dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length === 0) return;

    // Animation sequentielle des dots
    const createDotAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createDotAnimation(dot1Anim, 0),
      createDotAnimation(dot2Anim, 150),
      createDotAnimation(dot3Anim, 300),
    ]);

    animation.start();

    return () => {
      animation.stop();
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    };
  }, [typingUsers.length]);

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

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dotStyle(dot1Anim)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dotStyle(dot2Anim)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dotStyle(dot3Anim)]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.gray100 }]}>
      <View style={[styles.bubble, { backgroundColor: colors.gray100 }]}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dotStyle(dot1Anim)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dotStyle(dot2Anim)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.gray500 }, dotStyle(dot3Anim)]} />
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
