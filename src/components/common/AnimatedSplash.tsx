import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1: Logo scales in with spring (0 -> 300ms)
    logoOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    });

    // Phase 2: Glow pulse behind logo (200ms -> 700ms)
    glowOpacity.value = withDelay(200,
      withSequence(
        withTiming(0.6, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 300 })
      )
    );

    // Phase 3: Subtle pulse on logo (500ms -> 800ms)
    pulseScale.value = withDelay(500,
      withSequence(
        withTiming(1.08, { duration: 200, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 10, stiffness: 200 })
      )
    );

    // Phase 4: App name fades in below (400ms -> 700ms)
    textOpacity.value = withDelay(400,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
    );
    textTranslateY.value = withDelay(400,
      withSpring(0, { damping: 14, stiffness: 120 })
    );

    // Phase 5: Everything fades out (1200ms -> 1600ms)
    containerOpacity.value = withDelay(1200,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(onFinish)();
      })
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value * pulseScale.value },
    ],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0, 0.6], [0.8, 1.4]) }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <LinearGradient
        colors={['#ffffff', '#f5f3ff', '#ede9fe']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={styles.content}>
          {/* Glow circle behind logo */}
          <Animated.View style={[styles.glow, glowAnimStyle]} />

          {/* Logo */}
          <Animated.View style={[styles.logoWrapper, logoAnimStyle]}>
            <Image
              source={require('../../../assets/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Tagline */}
          <Animated.Text style={[styles.tagline, textAnimStyle]}>
            Vos evenements, simplifies.
          </Animated.Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#7C3AED',
  },
  logoWrapper: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
