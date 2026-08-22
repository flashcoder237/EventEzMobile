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
import { View, Text, Pressable, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
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
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type InAppToastIcon =
  | 'message'
  | 'notification'
  | 'success'
  | 'warning'
  | 'info'
  | 'error';

/** Ancrage vertical. `top` = notifications entrantes (métaphore bannière OS),
 *  `bottom` = retour d'action (près du pouce qui vient d'agir). */
export type InAppToastAnchor = 'top' | 'bottom';

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
  /** Durée d'affichage en ms avant auto-dismiss. Défaut : selon la gravité. */
  duration?: number;
  /** Ancrage vertical (défaut `top`). */
  anchor?: InAppToastAnchor;
}

const SLIDE_DURATION = 300;
const DEFAULT_DURATION = 4500;

/**
 * Durée par gravité. Une erreur doit rester lisible plus longtemps qu'un
 * « Copié ». Une durée unique pour tout est ce qui rend un toast soit trop
 * fugace, soit envahissant.
 */
const DURATION_BY_ICON: Partial<Record<InAppToastIcon, number>> = {
  success: 2600,
  info: 2600,
  warning: 4000,
  error: 5500,
};

const ICON_MAP: Record<InAppToastIcon, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  message: { name: 'chatbubble', color: '#6366F1' },
  notification: { name: 'notifications', color: '#7C3AED' },
  success: { name: 'checkmark-circle', color: '#10B981' },
  warning: { name: 'alert-circle', color: '#F59E0B' },
  info: { name: 'information-circle', color: '#3B82F6' },
  error: { name: 'close-circle', color: '#EF4444' },
};

/** Les toasts porteurs d'une gravité affichent un liseré de couleur : lisible
 *  en vision périphérique, sans crier comme un fond saturé. */
const SEVERITY_ICONS: InAppToastIcon[] = ['success', 'warning', 'error'];

export const InAppToast: React.FC<InAppToastProps> = ({
  id,
  title,
  body,
  icon = 'notification',
  avatarUrl,
  onPress,
  onDismiss,
  duration,
  anchor = 'top',
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  // Distance de sortie, signée selon l'ancrage : un toast ancré en bas doit
  // sortir VERS LE BAS (cohérence directionnelle — on repart d'où l'on vient).
  const OFFSCREEN = anchor === 'bottom' ? 200 : -200;

  // En reduced-motion : pas de slide (translateY reste à 0), on garde le fondu.
  const translateY = useSharedValue(reducedMotion ? 0 : OFFSCREEN);
  const opacity = useSharedValue(0);

  const iconConfig = ICON_MAP[icon];
  const hasSeverity = SEVERITY_ICONS.includes(icon);
  const effectiveDuration = duration ?? DURATION_BY_ICON[icon] ?? DEFAULT_DURATION;

  const dismiss = useCallback(
    (immediate = false) => {
      const dur = immediate ? 0 : SLIDE_DURATION;
      // Sortie en ease-out (symétrique à l'entrée), pas ease-in. En reduced-motion,
      // on ne bouge pas : seul le fondu d'opacité fait le feedback.
      if (!reducedMotion) {
        translateY.value = withTiming(OFFSCREEN, { duration: dur, easing: Easing.out(Easing.cubic) });
      }
      opacity.value = withTiming(0, { duration: dur }, (finished) => {
        if (finished) runOnJS(onDismiss)(id);
      });
    },
    [id, onDismiss, translateY, opacity, reducedMotion],
  );

  useEffect(() => {
    // Slide-in (sauté en reduced-motion : translateY est déjà à 0)
    if (!reducedMotion) {
      translateY.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) });
    }
    opacity.value = withTiming(1, { duration: SLIDE_DURATION });

    // Haptique proportionnée : un simple toast d'info ne vibre pas. Sur-notifier
    // apprend à ignorer TOUS les retours.
    if (icon === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (icon === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (icon === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (icon === 'message' || icon === 'notification') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    // Annonce lecteur d'écran : un toast ne prend pas le focus, donc sans ceci
    // un utilisateur VoiceOver/TalkBack ne reçoit AUCUN retour. Bloquant dès
    // lors que ce canal remplace des modales (qui, elles, volaient le focus).
    AccessibilityInfo.announceForAccessibility?.(
      [title, body].filter(Boolean).join('. '),
    );

    // Auto-dismiss timer
    const timer = setTimeout(() => dismiss(false), effectiveDuration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) onPress();
    dismiss(true);
  }, [onPress, dismiss]);

  // Swipe pour fermer, dans le sens de l'ancrage (vers le haut si ancré en
  // haut, vers le bas si ancré en bas). Le sens opposé n'est pas bloqué net :
  // il résiste (rubber-banding). Un mur invisible se ressent comme un bug.
  const dismissSign = anchor === 'bottom' ? 1 : -1;
  const swipe = Gesture.Pan()
    .onUpdate((e) => {
      const towardsExit = e.translationY * dismissSign;
      if (towardsExit > 0) {
        translateY.value = e.translationY;
        opacity.value = interpolate(towardsExit, [0, 100], [1, 0.3]);
      } else {
        // Résistance douce dans le sens opposé.
        translateY.value = e.translationY * 0.25;
      }
    })
    .onEnd((e) => {
      const towardsExit = e.translationY * dismissSign;
      const velocityExit = e.velocityY * dismissSign;
      if (towardsExit > 40 || velocityExit > 400) {
        translateY.value = withTiming(OFFSCREEN, { duration: 200 }, (finished) => {
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
          anchor === 'bottom'
            ? { bottom: insets.bottom + 90 } // au-dessus de la tab bar flottante
            : { top: insets.top + 8 },
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
            // Liseré de gravité : distingue succès / erreur d'un coup d'œil.
            // Sans lui, seule une icône de 20px différenciait les deux.
            hasSeverity && {
              borderLeftWidth: 3,
              borderLeftColor: iconConfig.color,
            },
            Platform.OS === 'ios' ? styles.shadowIOS : styles.shadowAndroid,
          ]}
          // Pas de rôle `button` quand rien n'est cliquable : annoncer un bouton
          // inexistant envoie l'utilisateur chercher une action qui n'existe pas.
          accessibilityRole={onPress ? 'button' : 'text'}
          accessibilityLabel={t('componentsCommon.inAppToastA11y', {
            title,
            body: body ?? '',
          })}
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
