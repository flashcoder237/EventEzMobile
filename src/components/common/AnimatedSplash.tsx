import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, DarkColors, FontFamily, FontSizes } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Letters configuration matching frontend GlitchProgressLoader
const EVENT_LETTERS = ['E', 'v', 'e', 'n', 't'] as const;
const LETTER_DELAYS = [200, 300, 400, 500, 600] as const;
const ICON_DELAY = 700;
const Z_DELAY = 850;
const PROGRESS_FADE_DELAY = 1000;
const TOTAL_DURATION = 3000; // total before fade-out

// Individual glitch letter component
function GlitchLetter({
  letter,
  delay,
  colors,
}: {
  letter: string;
  delay: number;
  colors: typeof Colors;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.6, 1], [0, 1, 1]);
    const translateX = interpolate(progress.value, [0, 0.6, 0.8, 1], [-8, 3, -1, 0]);
    const skewX = interpolate(progress.value, [0, 0.6, 0.8, 1], [-10, 3, -1, 0]);

    return {
      opacity,
      transform: [
        { translateX },
        { skewX: `${skewX}deg` },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Text
        style={[
          styles.letter,
          { color: colors.primary },
        ]}
      >
        {letter}
      </Text>
    </Animated.View>
  );
}

// The "z" letter with different styling (pink/accent)
function GlitchZ({ colors }: { colors: typeof Colors }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      Z_DELAY,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.6, 1], [0, 1, 1]);
    const translateX = interpolate(progress.value, [0, 0.6, 0.8, 1], [-8, 3, -1, 0]);
    const skewX = interpolate(progress.value, [0, 0.6, 0.8, 1], [-10, 3, -1, 0]);

    return {
      opacity,
      transform: [
        { translateX },
        { skewX: `${skewX}deg` },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.zLetter, { color: colors.secondary }]}>z</Text>
    </Animated.View>
  );
}

// Logo icon with pop + float animation
function LogoIcon() {
  const popProgress = useSharedValue(0);
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    // Pop in
    popProgress.value = withDelay(
      ICON_DELAY,
      withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );

    // Float after pop (starts after pop completes)
    floatProgress.value = withDelay(
      1500,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(popProgress.value, [0, 0.45, 1], [0, 1, 1]);
    const scale = interpolate(popProgress.value, [0, 0.45, 0.7, 1], [0.3, 1.1, 0.95, 1]);
    const rotate = interpolate(popProgress.value, [0, 0.45, 0.7, 1], [180, -5, 3, 0]);
    const floatY = interpolate(floatProgress.value, [0, 1], [0, -6]);

    return {
      opacity,
      transform: [
        { scale },
        { rotate: `${rotate}deg` },
        { translateY: floatY },
      ],
    };
  });

  return (
    <Animated.View style={[styles.iconWrapper, animatedStyle]}>
      <Image
        source={require('../../../assets/icon.png')}
        style={styles.icon}
        contentFit="contain"
      />
    </Animated.View>
  );
}

// Scan line effect
function ScanLine({ colors }: { colors: typeof Colors }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      100,
      withTiming(1, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const top = interpolate(progress.value, [0, 1], [0, 60]);
    const opacity = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 0.8, 0.8, 0]);

    return {
      top,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.scanLine,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={['transparent', colors.secondary, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// Shimmer progress bar
function ProgressBar({ colors, isDark }: { colors: typeof Colors; isDark: boolean }) {
  const fadeProgress = useSharedValue(0);
  const fillProgress = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    // Fade in
    fadeProgress.value = withDelay(
      PROGRESS_FADE_DELAY,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );

    // Fill animation (matches frontend easing curve)
    fillProgress.value = withDelay(
      PROGRESS_FADE_DELAY,
      withTiming(100, {
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Shimmer loop
    shimmerProgress.value = withDelay(
      PROGRESS_FADE_DELAY,
      withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeProgress.value,
    transform: [
      { translateY: interpolate(fadeProgress.value, [0, 1], [6, 0]) },
    ],
  }));

  // Perf : scaleX (GPU) plutôt que d'animer `width` (layout). Origine gauche → la
  // barre se remplit de la gauche vers la droite.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fillProgress.value / 100 }],
  }));

  return (
    <Animated.View style={[styles.progressContainer, containerStyle]}>
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <Animated.View style={[styles.progressFill, { width: '100%', transformOrigin: '0% 50%' }, fillStyle]}>
          <LinearGradient
            colors={[colors.primary, colors.secondary, colors.primary]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const { colors, isDark } = useTheme();
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Fade out and finish
    containerOpacity.value = withDelay(
      TOTAL_DURATION,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(onFinish)();
      })
    );
  }, []);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: isDark ? DarkColors.background : '#FFFFFF' },
        containerAnimStyle,
      ]}
    >
      {/* Center content */}
      <View style={styles.content}>
        {/* Logo zone - "Event" + icon + "z" */}
        <View style={styles.logoZone}>
          {/* Scan line */}
          <ScanLine colors={colors as any} />

          {/* "Event" letters */}
          {EVENT_LETTERS.map((letter, i) => (
            <GlitchLetter
              key={i}
              letter={letter}
              delay={LETTER_DELAYS[i]}
              colors={colors as any}
            />
          ))}

          {/* Logo icon */}
          <LogoIcon />

          {/* "z" */}
          <GlitchZ colors={colors as any} />
        </View>

        {/* Progress bar */}
        <ProgressBar colors={colors as any} isDark={isDark} />
      </View>
    </Animated.View>
  );
}

const LOGO_FONT_SIZE = 50;
const ICON_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoZone: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 80,
  },
  scanLine: {
    position: 'absolute',
    left: -10,
    right: -10,
    height: 2,
    zIndex: 10,
  },
  letter: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: LOGO_FONT_SIZE,
    lineHeight: LOGO_FONT_SIZE * 1.2,
  },
  zLetter: {
    fontFamily: FontFamily.bold,
    fontSize: LOGO_FONT_SIZE,
    lineHeight: LOGO_FONT_SIZE * 1.2,
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginHorizontal: -2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  progressContainer: {
    marginTop: 20,
    width: SCREEN_WIDTH * 0.6,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
});
