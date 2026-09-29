/**
 * EventSubmittedSheet — le moment « événement soumis » (E6).
 *
 * Remplace l'alerte générique de succès à la création : une feuille dédiée
 * avec un tampon « EN REVUE » qui s'écrase (haptique « succès » au contact),
 * le titre de l'événement en dégradé et les deux mêmes actions qu'avant
 * (voir mes événements / en créer un autre). En « Réduire les animations »,
 * tout est posé d'emblée ; l'haptique reste.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { GradientText } from '../ui/GradientText';
import { EditorialPillCTA } from '../ui/editorial';
import { Stamp } from '../ui/motion';
import { haptics } from '../../utils/haptics';
import { FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { centeredContent, FORM_MAX } from '../../constants/layout';

export interface EventSubmittedSheetProps {
  visible: boolean;
  eventTitle?: string;
  onViewMyEvents: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
}

export default function EventSubmittedSheet({
  visible,
  eventTitle,
  onViewMyEvents,
  onCreateAnother,
  onClose,
}: EventSubmittedSheetProps) {
  const { t } = useTranslation();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          entering={reduced ? undefined : SlideInDown.duration(320)}
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm },
          ]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={[styles.grabber, { backgroundColor: colors.gray200 }]} />
          <View style={styles.inner}>
            <Stamp
              label={t('organizer.eventCreate.submittedStamp')}
              color={colors.primary}
              size="lg"
              play={visible}
              delay={260}
              onImpact={haptics.success}
              style={styles.stamp}
              testID="event-submitted-stamp"
            />
            <Text style={[styles.eyebrow, { color: colors.gray500 }]}>
              {t('organizer.eventCreate.submittedEyebrow')}
            </Text>
            {!!eventTitle && (
              <GradientText colors={gradients.aurora} style={styles.title} numberOfLines={3}>
                {eventTitle}
              </GradientText>
            )}
            <Text style={[styles.body, { color: colors.gray600 }]}>
              {t('organizer.eventCreate.submittedBody')}
            </Text>

            <Animated.View entering={reduced ? undefined : FadeIn.delay(420)} style={styles.actions}>
              <EditorialPillCTA
                eyebrow={t('organizer.eventCreate.submittedCtaEyebrow')}
                label={t('organizer.eventCreate.viewMyEvents')}
                onPress={onViewMyEvents}
                tone="primary"
                icon="arrow-forward"
              />
              <TouchableOpacity
                onPress={onCreateAnother}
                style={styles.secondary}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.secondaryText, { color: colors.primary }]}>
                  {t('organizer.eventCreate.createAnother')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,26,0.45)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.lg },
  inner: { ...centeredContent(FORM_MAX), paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  stamp: { alignSelf: 'center', marginBottom: Spacing.lg },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actions: { gap: Spacing.md, alignItems: 'stretch' },
  secondary: { alignSelf: 'center', paddingVertical: Spacing.sm },
  secondaryText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
});
