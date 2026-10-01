/**
 * Attente utile pendant un paiement Mobile Money (R3 W8).
 *
 * Au-delà de 30 s d'attente, ou au retour dans l'app pendant la vérification :
 * « En attendant, préparez votre carte J'y vais ». On choisit une teinte et un
 * message ; la carte s'« imprime » au rythme du temps réellement écoulé (une
 * translation verticale dans une fente, jamais une animation de layout) et
 * sera appliquée à la carte story de l'écran de succès.
 *
 * Ce bloc s'affiche SOUS le message anti-double débit et les instructions :
 * il ne les masque jamais. Rien n'y touche à l'argent. Réduire les animations :
 * carte statique.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  GOING_CARD_MESSAGES,
  GOING_CARD_TINTS,
  getGoingCardDraft,
  printProgress,
  setGoingCardDraft,
  type GoingCardMessage,
} from '../../lib/goingCardDraft';

const CARD_H = 118;
const SHOW_AFTER_S = 30;
// Dès qu'il est visible, le billet dépasse déjà un peu de la fente.
const MIN_VISIBLE = 0.18;

/** Aperçu de la carte (réutilisé sur l'écran de succès). */
export const GoingCardPreview = memo(function GoingCardPreview({
  tint,
  message,
  title,
  dateLabel,
}: {
  tint: string;
  message: string;
  title?: string | null;
  dateLabel?: string | null;
}) {
  return (
    <LinearGradient
      colors={[tint, '#FF6B6B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.preview}
    >
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText} numberOfLines={1}>{message}</Text>
      </View>
      {!!title && <Text style={styles.previewTitle} numberOfLines={2}>{title}</Text>}
      {!!dateLabel && <Text style={styles.previewDate} numberOfLines={1}>{dateLabel}</Text>}
    </LinearGradient>
  );
});

interface Props {
  active: boolean;
  registrationId: string | number;
  eventTitle?: string | null;
  dateLabel?: string | null;
  /** Teinte de l'événement (#RRGGBB), proposée en premier. */
  eventTint?: string | null;
}

function GoingCardPrepComponent({ active, registrationId, eventTitle, dateLabel, eventTint }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [returned, setReturned] = useState(false);

  const tints = (eventTint && /^#[0-9a-f]{6}$/i.test(eventTint)
    ? [eventTint, ...GOING_CARD_TINTS.filter((c) => c.toLowerCase() !== eventTint.toLowerCase())]
    : GOING_CARD_TINTS
  ).slice(0, 4);
  const initial = getGoingCardDraft(registrationId);
  const [tint, setTint] = useState<string>(initial?.tint ?? tints[0]);
  const [message, setMessage] = useState<GoingCardMessage>(initial?.message ?? 'going');

  // Horloge réelle de l'attente (remise à zéro à chaque nouvelle vérification).
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      setReturned(false);
      return undefined;
    }
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Retour dans l'app pendant la vérification (fenêtre opérateur, autre app).
  useEffect(() => {
    if (!active) return undefined;
    let wasAway = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') wasAway = true;
      else if (state === 'active' && wasAway) setReturned(true);
    });
    return () => sub.remove();
  }, [active]);

  // Le choix est gardé pour l'écran de succès (jamais utilisé sans paiement confirmé).
  useEffect(() => {
    setGoingCardDraft(registrationId, { tint, message });
  }, [registrationId, tint, message]);

  const visible = active && (elapsed >= SHOW_AFTER_S || returned);
  const progress = reduced ? 1 : Math.max(MIN_VISIBLE, printProgress(elapsed));

  const offset = useSharedValue(CARD_H);
  useEffect(() => {
    const target = CARD_H * (1 - progress);
    // Pas de ressort : l'impression avance d'un pas régulier, seconde après seconde.
    offset.value = reduced ? target : withTiming(target, { duration: 900, easing: Easing.linear });
  }, [progress, reduced, offset]);
  const printStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -offset.value }] }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(Durations.enter)}
      style={[styles.wrap, { backgroundColor: colors.gray50 }]}
      testID="going-card-prep"
    >
      <Text style={[styles.title, { color: colors.gray800 }]}>{t('delight.goingCard.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.gray500 }]}>{t('delight.goingCard.subtitle')}</Text>

      {/* La fente d'impression : le billet en sort, découpé par le cadre. */}
      <View style={[styles.slot, { backgroundColor: colors.gray300 }]} />
      <View
        style={styles.printWindow}
        accessible
        accessibilityLabel={t('delight.goingCard.printing')}
      >
        <Animated.View style={printStyle}>
          <GoingCardPreview
            tint={tint}
            message={t(`delight.goingCard.messages.${message}`)}
            title={eventTitle}
            dateLabel={dateLabel}
          />
        </Animated.View>
      </View>

      <Text style={[styles.label, { color: colors.gray600 }]}>{t('delight.goingCard.tintLabel')}</Text>
      <View style={styles.row}>
        {tints.map((c, i) => (
          <TouchableOpacity
            key={c}
            onPress={() => setTint(c)}
            accessibilityRole="radio"
            accessibilityState={{ selected: c === tint }}
            accessibilityLabel={t('delight.goingCard.tintA11y', { index: i + 1 })}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.swatchRing, { borderColor: c === tint ? colors.gray800 : 'transparent' }]}
          >
            <View style={[styles.swatch, { backgroundColor: c }]} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.gray600 }]}>{t('delight.goingCard.messageLabel')}</Text>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {GOING_CARD_MESSAGES.map((m) => {
          const selected = m === message;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setMessage(m)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : colors.gray700 }]}>
                {t(`delight.goingCard.messages.${m}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  title: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 2 },
  slot: { height: 4, borderRadius: 2, marginTop: Spacing.md, marginHorizontal: Spacing.lg },
  printWindow: {
    height: CARD_H,
    overflow: 'hidden',
    marginHorizontal: Spacing.lg + 6,
  },
  preview: {
    height: CARD_H,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    padding: 14,
    justifyContent: 'flex-end',
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    left: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  previewBadgeText: { fontFamily: FontFamily.bold, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },
  previewTitle: { fontFamily: FontFamily.displayBold, fontSize: 16, color: '#FFFFFF' },
  previewDate: { fontFamily: FontFamily.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  label: { fontFamily: FontFamily.medium, fontSize: 12, marginTop: Spacing.md, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  swatchRing: { padding: 2, borderRadius: 999, borderWidth: 2 },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: FontFamily.semiBold, fontSize: 12, letterSpacing: 0.5 },
});

export const GoingCardPrep = memo(GoingCardPrepComponent);
export default GoingCardPrep;
