import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
  Extrapolation,
} from 'react-native-reanimated';
import { FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface BlurHeaderProps {
  scrollY: SharedValue<number>;
  title: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  /** Scroll offset at which the header title starts appearing */
  titleShowOffset?: number;
  /** Scroll offset at which the header background becomes fully visible */
  bgShowOffset?: number;
}

export default function BlurHeader({
  scrollY,
  title,
  leftAction,
  rightActions,
  titleShowOffset = 200,
  bgShowOffset = 100,
}: BlurHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const headerHeight = 44 + insets.top;

  // Background + buttons fade in together
  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [bgShowOffset - 40, bgShowOffset + 20],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Title fades in later
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [titleShowOffset, titleShowOffset + 60],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [titleShowOffset, titleShowOffset + 60],
          [8, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [bgShowOffset, bgShowOffset + 40],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View style={[styles.container, { height: headerHeight, paddingTop: insets.top }]} pointerEvents="box-none">
      {/* Background — wrap BlurView in Animated.View for reliable opacity */}
      <Animated.View style={[StyleSheet.absoluteFill, bgAnimatedStyle]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(15,15,26,0.97)' : 'rgba(255,255,255,0.97)' }]} />
        )}
      </Animated.View>

      {/* Bottom border */}
      <Animated.View style={[styles.bottomBorder, { backgroundColor: colors.border }, borderAnimatedStyle]} />

      {/* Content row — buttons fade in with background, title fades in later */}
      <Animated.View style={[styles.row, bgAnimatedStyle]}>
        <View style={styles.leftAction}>{leftAction}</View>
        <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
          <Text style={[styles.title, { color: colors.gray900 }]} numberOfLines={1}>{title}</Text>
        </Animated.View>
        <View style={styles.rightActions}>{rightActions}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  leftAction: {
    width: 44,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
  },
  rightActions: {
    width: 44,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
