import React, { useEffect, useState } from 'react';
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
import { onAppReady } from '../../lib/appReady';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Letters configuration matching frontend GlitchProgressLoader.
//
// PERF (perception du démarrage) : la timeline d'origine (3 s fixes + 400 ms
// de fondu, à CHAQUE lancement) a été compressée ~×0,5 en gardant le même
// séquencement. Le splash ne suit plus une durée fixe : il disparaît dès que
// l'app est prête (signal `markAppReady` émis par RootNavigator), avec un
// minimum pour que l'animation d'entrée ne paraisse pas coupée, et un
// plafond de sécurité si le signal n'arrive jamais (gate bloquante, etc.).
const EVENT_LETTERS = ['E', 'v', 'e', 'n', 't'] as const;
const LETTER_DELAYS = [100, 150, 200, 250, 300] as const;
const LETTER_DURATION = 280;
const ICON_DELAY = 350;
const ICON_DURATION = 450;
const Z_DELAY = 425;
const FLOAT_DELAY = ICON_DELAY + ICON_DURATION;
const PROGRESS_FADE_DELAY = 450;
/** Remplissage « d'attente » de la barre : jusqu'à 85 %, le reste au ready. */
const PROGRESS_IDLE_TARGET = 85;
const PROGRESS_IDLE_DURATION = 1200;
/** Durée minimale d'affichage (fin de l'animation d'entrée du logo). */
const MIN_DURATION = 750;
/** Plafond : on sort même sans signal ready (BrandedSplash prend le relais). */
const MAX_DURATION = 2500;
/** Sortie : barre complétée puis fondu du conteneur. */
const PROGRESS_COMPLETE_DURATION = 150;
const FADE_OUT_DURATION = 250;

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
        duration: LETTER_DURATION,
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
        duration: LETTER_DURATION,
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
        duration: ICON_DURATION,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );

    // Float after pop (starts after pop completes)
    floatProgress.value = withDelay(
      FLOAT_DELAY,
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
      50,
      withTiming(1, {
        duration: 450,
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
function ProgressBar({
  colors,
  isDark,
  finishing,
}: {
  colors: typeof Colors;
  isDark: boolean;
  finishing: boolean;
}) {
  const fadeProgress = useSharedValue(0);
  const fillProgress = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    // Fade in
    fadeProgress.value = withDelay(
      PROGRESS_FADE_DELAY,
      withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) })
    );

    // Fill animation (matches frontend easing curve) — s'arrête à
    // PROGRESS_IDLE_TARGET ; les derniers % sont joués quand l'app est prête.
    fillProgress.value = withDelay(
      PROGRESS_FADE_DELAY,
      withTiming(PROGRESS_IDLE_TARGET, {
        duration: PROGRESS_IDLE_DURATION,
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

  // App prête : on complète la barre (et on s'assure qu'elle est visible si le
  // ready arrive avant son fondu d'entrée).
  useEffect(() => {
    if (!finishing) return;
    fadeProgress.value = withTiming(1, { duration: PROGRESS_COMPLETE_DURATION });
    fillProgress.value = withTiming(100, {
      duration: PROGRESS_COMPLETE_DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [finishing]);

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
  const [minElapsed, setMinElapsed] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinElapsed(true), MIN_DURATION);
    // Plafond de sécurité : sortie forcée même sans signal ready.
    const maxTimer = setTimeout(() => setFinishing(true), MAX_DURATION);
    const unsubscribe = onAppReady(() => setAppReady(true));
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (minElapsed && appReady) setFinishing(true);
  }, [minElapsed, appReady]);

  useEffect(() => {
    if (!finishing) return;
    // Barre complétée (ProgressBar) puis fondu du conteneur et fin.
    containerOpacity.value = withDelay(
      PROGRESS_COMPLETE_DURATION,
      withTiming(0, { duration: FADE_OUT_DURATION, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(onFinish)();
      })
    );
  }, [finishing]);

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
        <ProgressBar colors={colors as any} isDark={isDark} finishing={finishing} />
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
