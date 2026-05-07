/**
 * InAppToast — banner cliquable qui glisse depuis le haut de l'écran.
 *
 * Utilisé par InAppToastContext pour afficher les notifications reçues en
 * foreground (typiquement messages chat), avec un comportement bien plus
 * discret qu'une push system mais visible (l'OS ne les affiche pas en banner
 * quand l'app est ouverte).
 *
 * UX :
 * - slide-in 300ms depuis le top + insets safe-area
 * - auto-dismiss après 4500ms (4s d'affichage + 500ms slide-out)
 * - tap → exécute onPress puis dismiss
 * - swipe up → dismiss manuel
 * - haptique léger à l'apparition (impact medium)
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

export type InAppToastIcon = 'message' | 'notification' | 'success' | 'warning' | 'info';

export interface InAppToastProps {
  id: string;
  title: string;
  body?: string;
  icon?: InAppToastIcon;
  /** Avatar/image URL pour les messages chat — remplace l'icon */
  avatarUrl?: string | null;
  /** Action au tap. Le toast est dismissé après. */
  onPress?: () => void;
  /** Callback quand le toast est dismissé (auto ou manuel). */
  onDismiss: (id: string) => void;
  /** Durée d'affichage en ms avant auto-dismiss (défaut 4500). */
  duration?: number;
}

const SLIDE_DURATION = 300;
const DEFAULT_DURATION = 4500;

const ICON_MAP: Record<InAppToastIcon, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  message: { name: 'chatbubble', color: '#6366F1' },
  notification: { name: 'notifications', color: '#7C3AED' },
  success: { name: 'checkmark-circle', color: '#10B981' },
  warning: { name: 'alert-circle', color: '#F59E0B' },
  info: { name: 'information-circle', color: '#3B82F6' },
};

export const InAppToast: React.FC<InAppToastProps> = ({
  id,
  title,
  body,
  icon = 'notification',
  avatarUrl,
  onPress,
  onDismiss,
  duration = DEFAULT_DURATION,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  const iconConfig = ICON_MAP[icon];

  const dismiss = useCallback(
    (immediate = false) => {
      const dur = immediate ? 0 : SLIDE_DURATION;
      translateY.value = withTiming(-200, { duration: dur, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: dur }, (finished) => {
        if (finished) runOnJS(onDismiss)(id);
      });
    },
    [id, onDismiss, translateY, opacity],
  );

  useEffect(() => {
    // Slide-in
    translateY.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: SLIDE_DURATION });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Auto-dismiss timer
    const timer = setTimeout(() => dismiss(false), duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) onPress();
    dismiss(true);
  }, [onPress, dismiss]);

  // Swipe up to dismiss : Pan vertical seul, on ne se déclenche que si l'user
  // tire vers le haut (translationY négatif).
  const swipe = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
        opacity.value = interpolate(e.translationY, [-100, 0], [0.3, 1]);
      }
    })
    .onEnd((e) => {
      if (e.translationY < -40 || e.velocityY < -400) {
        translateY.value = withTiming(-200, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onDismiss)(id);
        });
        opacity.value = withTiming(0, { duration: 200 });
      } else {
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        style={[
          styles.container,
          { top: insets.top + 8 },
          animatedStyle,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handlePress}
          android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
          style={({ pressed }) => [
            styles.toast,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
            Platform.OS === 'ios' ? styles.shadowIOS : styles.shadowAndroid,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${body ?? ''}. Touchez pour ouvrir.`}
        >
          {/* Avatar (messages) ou icon */}
          {avatarUrl ? (
            <Image
              source={avatarUrl}
              style={styles.avatar}
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: `${iconConfig.color}20` }]}>
              <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
            </View>
          )}

          {/* Texte */}
          <View style={styles.content}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {body ? (
              <Text
                style={[styles.body, { color: colors.gray500 }]}
                numberOfLines={2}
              >
                {body}
              </Text>
            ) : null}
          </View>

          {/* Indicateur swipe / chevron */}
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: colors.gray300 }]} />
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    minHeight: 64,
  },
  shadowIOS: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  shadowAndroid: {
    elevation: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 16,
  },
  handle: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
});
