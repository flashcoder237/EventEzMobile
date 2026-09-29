/**
 * Composant pour afficher le statut d'envoi d'un message
 * 3 etats: sent (une coche), delivered (deux coches grises), read (deux coches bleues)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useMotionGate } from '../ui/motion';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageStatus } from '../../lib/utils/messagingHelpers';

interface MessageStatusIconProps {
  status: MessageStatus;
  size?: number;
}

export default function MessageStatusIcon({ status, size = 14 }: MessageStatusIconProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { canAnimate } = useMotionGate({ ignoreFocus: true });

  // Transitions vues à l'écran uniquement (jamais au montage) :
  //  - sent → delivered : la 2e coche glisse en place ;
  //  - delivered → read : la couleur passe au primary en fondu.
  const prev = useRef(status);
  const slide = useSharedValue(0);
  const readMix = useSharedValue(status === 'read' ? 1 : 0);
  useEffect(() => {
    const was = prev.current;
    prev.current = status;
    if (was === status) return;
    if (status === 'delivered' && (was === 'sent' || was === 'sending') && canAnimate) {
      slide.value = -5;
      slide.value = withTiming(0, { duration: 200 });
    }
    if (status === 'read') {
      readMix.value = was === 'delivered' && canAnimate ? withTiming(1, { duration: 260 }) : 1;
    } else {
      readMix.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value }],
    opacity: 1 + slide.value / 10,
  }));
  const readStyle = useAnimatedStyle(() => ({ opacity: readMix.value }));

  // Le statut d'envoi/lu était purement visuel (coches) → invisible pour un
  // lecteur d'écran. On annonce chaque état via accessibilityLabel.
  const a11yLabel = t(`messageStatus.${status}`);
  const a11y = {
    accessible: true,
    accessibilityRole: 'image' as const,
    accessibilityLabel: a11yLabel,
  };

  switch (status) {
    case 'sending':
      return (
        <ActivityIndicator
          size="small"
          color={colors.gray400}
          style={styles.spinner}
          {...a11y}
        />
      );

    case 'failed':
      return (
        <Ionicons
          name="alert-circle"
          size={size}
          color={colors.error}
          {...a11y}
        />
      );

    case 'sent':
      return (
        <Ionicons
          name="checkmark"
          size={size}
          color={colors.gray400}
          {...a11y}
        />
      );

    case 'delivered':
    case 'read':
      return (
        <View style={styles.doubleCheck} {...a11y}>
          <Animated.View style={slideStyle}>
            <Ionicons
              name="checkmark-done"
              size={size}
              color={colors.gray400}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFillObject, readStyle]} pointerEvents="none">
            <Ionicons
              name="checkmark-done"
              size={size}
              color={colors.primary}
            />
          </Animated.View>
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  spinner: {
    width: 14,
    height: 14,
    transform: [{ scale: 0.6 }],
  },
  doubleCheck: {
    flexDirection: 'row',
  },
});
