import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { useConnection } from '../../contexts/ConnectionContext';

const STATUS_COLORS = {
  offline: '#DC2626',
  'server-down': '#EA580C',
  reconnecting: '#CA8A04',
  online: '#16A34A',
};

const BAR_HEIGHT = 4;

export default function ConnectionStatusBar() {
  const { status } = useConnection();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scaleX = useSharedValue(0);

  const prevStatusRef = React.useRef(status);
  const hasEverShown = React.useRef(false);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status !== 'online') {
      hasEverShown.current = true;
      // Show and pulse
      scaleX.value = withTiming(1, { duration: 300 });
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.4, { duration: 600 }),
        ),
        -1, // infinite
        true,
      );
    } else if (prev !== 'online' && hasEverShown.current) {
      // Back online — solid green briefly then fade out
      cancelAnimation(opacity);
      opacity.value = withTiming(1, { duration: 200 });
      scaleX.value = 1;
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 });
        scaleX.value = withTiming(0, { duration: 400 });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scaleX: scaleX.value }],
  }));

  if (!hasEverShown.current && status === 'online') return null;

  const color = STATUS_COLORS[status];

  return (
    <Animated.View
      style={[
        styles.bar,
        { top: insets.top, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    zIndex: 9999,
  },
});
