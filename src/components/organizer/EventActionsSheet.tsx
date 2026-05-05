import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';

export type EventActionStyle = 'default' | 'destructive';

export interface EventAction {
  /** Texte du libellé de l'action */
  label: string;
  /** Icône Ionicons (optionnelle, fortement recommandée) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Style visuel — `destructive` colore en rouge */
  style?: EventActionStyle;
  /** Callback. Le sheet se ferme automatiquement avant l'appel. */
  onPress: () => void;
  /** Sous-libellé optionnel (1 ligne max, ex. "irréversible") */
  description?: string;
}

export interface EventActionSection {
  /** Titre de section (eyebrow uppercase). Si absent : pas de header */
  title?: string;
  actions: EventAction[];
}

interface EventActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Titre principal du sheet (ex. nom de l'event) */
  title: string;
  /** Sous-titre optionnel (ex. "Actions disponibles") */
  subtitle?: string;
  sections: EventActionSection[];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

/**
 * Bottom sheet d'actions pour les events de la liste organizer.
 *
 * Remplace les Alert natifs qui débordaient sur Android quand le menu
 * dépassait 12-14 actions (cas events `validated`).
 *
 * Caractéristiques :
 * - ScrollView interne → jamais de débordement, même avec 15 actions
 * - Sections avec eyebrow uppercase (Suivi/Configuration/etc.)
 * - Safe area top respectée (jamais sous le statusbar)
 * - Safe area bottom respectée (jamais sous la nav bar)
 * - Drag-to-dismiss (swipe down depuis le handle)
 * - Backdrop fade + sheet slide up animation
 */
export default function EventActionsSheet({
  visible,
  onClose,
  title,
  subtitle,
  sections,
}: EventActionsSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
      backdropOpacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible, translateY, backdropOpacity]);

  const handleClose = () => {
    onClose();
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Drag-to-dismiss : seuil 100px de descente déclenche fermeture
  const dragGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(0, 1 - e.translationY / 400);
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 600) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 240 });
        backdropOpacity.value = withTiming(1, { duration: 180 });
      }
    });

  const handleActionPress = async (action: EventAction) => {
    if (action.style === 'destructive') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    onClose();
    // Délai léger pour laisser l'animation de fermeture commencer avant la
    // navigation/action (sinon la transition est brusque).
    setTimeout(() => action.onPress(), 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Backdrop tappable pour fermer */}
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer le menu"
          />
        </Animated.View>

        {/* Sheet */}
        <GestureDetector gesture={dragGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, Spacing.md),
                maxHeight: MAX_SHEET_HEIGHT,
              },
              sheetStyle,
            ]}
          >
            {/* Drag handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              {subtitle && (
                <Text style={[styles.eyebrow, { color: colors.accent }]}>{subtitle.toUpperCase()}</Text>
              )}
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={2}
              >
                {title}
              </Text>
            </View>

            {/* Sections scrollable */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.scrollContent}
            >
              {sections.map((section, sectionIdx) => (
                <View key={sectionIdx} style={styles.section}>
                  {section.title && (
                    <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>
                      {section.title.toUpperCase()}
                    </Text>
                  )}
                  <View style={[styles.sectionCard, { backgroundColor: colors.surface || colors.gray50 }]}>
                    {section.actions.map((action, actionIdx) => {
                      const isDestructive = action.style === 'destructive';
                      const isLast = actionIdx === section.actions.length - 1;
                      return (
                        <Pressable
                          key={actionIdx}
                          onPress={() => handleActionPress(action)}
                          style={({ pressed }) => [
                            styles.actionRow,
                            !isLast && {
                              borderBottomColor: isDark ? '#1E293B' : '#E5E7EB',
                              borderBottomWidth: StyleSheet.hairlineWidth,
                            },
                            pressed && { backgroundColor: isDark ? '#1E293B' : '#F3F4F6' },
                          ]}
                          android_ripple={{ color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                          accessibilityRole="button"
                          accessibilityLabel={action.label}
                        >
                          {action.icon && (
                            <View
                              style={[
                                styles.iconWrap,
                                {
                                  backgroundColor: isDestructive
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.06)'
                                      : 'rgba(15, 23, 42, 0.05)',
                                },
                              ]}
                            >
                              <Ionicons
                                name={action.icon}
                                size={18}
                                color={isDestructive ? '#EF4444' : colors.text}
                              />
                            </View>
                          )}
                          <View style={styles.actionLabelWrap}>
                            <Text
                              style={[
                                styles.actionLabel,
                                {
                                  color: isDestructive ? '#EF4444' : colors.text,
                                  fontFamily: isDestructive ? FontFamily.semiBold : FontFamily.medium,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {action.label}
                            </Text>
                            {action.description && (
                              <Text
                                style={[styles.actionDescription, { color: colors.gray500 }]}
                                numberOfLines={1}
                              >
                                {action.description}
                              </Text>
                            )}
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.gray400}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Cancel button collé en bas */}
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Annuler"
            >
              <Text style={[styles.cancelLabel, { color: colors.text }]}>Annuler</Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabelWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
  },
  actionDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
});
