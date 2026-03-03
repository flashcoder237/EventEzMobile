import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useConnection } from '../../contexts/ConnectionContext';

const STATUS_CONFIG = {
  offline: {
    bg: '#DC2626',
    icon: 'wifi-outline' as const,
    text: 'Pas de connexion internet',
    showRetry: false,
  },
  'server-down': {
    bg: '#EA580C',
    icon: 'cloud-offline-outline' as const,
    text: 'Serveur indisponible',
    showRetry: true,
  },
  reconnecting: {
    bg: '#CA8A04',
    icon: 'sync-outline' as const,
    text: 'Reconnexion...',
    showRetry: false,
  },
  online: {
    bg: '#16A34A',
    icon: 'checkmark-circle-outline' as const,
    text: 'Connexion retablie',
    showRetry: false,
  },
};

export default function ConnectionStatusBar() {
  const { status, retry } = useConnection();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);
  const isVisible = status !== 'online';

  useEffect(() => {
    if (status === 'online') {
      // Already hidden — nothing to show
      return;
    }
    // Show the bar
    translateY.value = withTiming(0, { duration: 300 });
  }, [status]);

  // When status goes back to "online" after being shown, show green briefly then hide
  const prevStatusRef = React.useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'online' && prev !== 'online') {
      // Show green "back online" then slide out
      translateY.value = withTiming(0, { duration: 200 });
      const timer = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 300 });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const config = STATUS_CONFIG[status];

  // Don't render if we've never had an issue (initial state)
  const hasEverShown = React.useRef(false);
  if (status !== 'online') hasEverShown.current = true;
  if (!hasEverShown.current && status === 'online') return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 4, backgroundColor: config.bg },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={config.icon} size={18} color="#fff" />
        <Text style={styles.text}>{config.text}</Text>
        {config.showRetry && (
          <TouchableOpacity onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>Reessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
