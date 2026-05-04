/**
 * ReportMessageModal — Bottom sheet pour signaler un message à la modération.
 * Liste des raisons (radio) + champ description optionnelle, puis POST
 * /api/message-reports/.
 */

import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate'
  | 'scam'
  | 'other';

interface ReportReasonOption {
  value: ReportReason;
  label: string;
  description: string;
}

const REASONS: ReportReasonOption[] = [
  { value: 'spam', label: 'Spam', description: 'Messages publicitaires non sollicités' },
  { value: 'harassment', label: 'Harcèlement', description: 'Comportement insultant ou menaçant' },
  { value: 'hate_speech', label: 'Discours haineux', description: 'Propos discriminatoires' },
  { value: 'inappropriate', label: 'Contenu inapproprié', description: 'Sexuel, violent ou choquant' },
  { value: 'scam', label: 'Arnaque', description: 'Tentative de fraude ou phishing' },
  { value: 'other', label: 'Autre', description: 'Une autre raison' },
];

interface ReportMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description?: string) => Promise<void> | void;
  submitting?: boolean;
}

function ReportMessageModal({
  visible,
  onClose,
  onSubmit,
  submitting = false,
}: ReportMessageModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  // Reset on open / close
  useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
      setDescription('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return;
    await onSubmit(selectedReason, description.trim() || undefined);
  };

  const canSubmit = !!selectedReason && !submitting;

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <Reanimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.lg),
          },
          sheetAnim,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>MODÉRATION</Text>
          <Text style={[styles.title, { color: colors.text }]}>Signaler ce message</Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            Choisis la raison principale. Notre équipe examinera ton signalement sous 24h.
          </Text>
        </View>

        {/* Reasons */}
        <View style={styles.reasonsList}>
          {REASONS.map(reason => {
            const active = selectedReason === reason.value;
            return (
              <TouchableOpacity
                key={reason.value}
                onPress={() => setSelectedReason(reason.value)}
                activeOpacity={TOUCH_OPACITY}
                style={[
                  styles.reasonRow,
                  {
                    backgroundColor: active ? `${colors.accent}10` : 'transparent',
                    borderColor: active ? colors.accent : isDark ? colors.gray200 : colors.gray100,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: active ? colors.accent : colors.gray400 },
                  ]}
                >
                  {active && (
                    <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                  )}
                </View>
                <View style={styles.reasonText}>
                  <Text
                    style={[
                      styles.reasonLabel,
                      { color: active ? colors.accent : colors.text },
                    ]}
                  >
                    {reason.label}
                  </Text>
                  <Text style={[styles.reasonDesc, { color: colors.gray500 }]}>
                    {reason.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={[styles.inputLabel, { color: colors.gray500 }]}>DÉTAILS (OPTIONNEL)</Text>
        <TextInput
          style={[
            styles.descriptionInput,
            {
              backgroundColor: isDark ? colors.gray100 : colors.gray50,
              borderColor: isDark ? colors.gray200 : colors.gray100,
              color: colors.text,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ajoute du contexte si tu le souhaites…"
          placeholderTextColor={colors.gray400}
          multiline
          maxLength={500}
          textAlignVertical="top"
          editable={!submitting}
        />
        <Text style={[styles.charCount, { color: colors.gray400 }]}>
          {description.length}/500
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={TOUCH_OPACITY}
            disabled={submitting}
            style={[
              styles.cancelBtn,
              {
                backgroundColor: isDark ? colors.gray100 : colors.gray50,
                borderColor: isDark ? colors.gray200 : colors.gray100,
              },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={TOUCH_OPACITY}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? colors.accent : colors.gray300,
              },
            ]}
            accessibilityLabel="Envoyer le signalement"
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Envoyer</Text>
            )}
          </TouchableOpacity>
        </View>
      </Reanimated.View>
    </Modal>
  );
}

export default memo(ReportMessageModal);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  reasonsList: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    flex: 1,
  },
  reasonLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  reasonDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  descriptionInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: FontFamily.regular,
    minHeight: 70,
    maxHeight: 120,
  },
  charCount: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  submitBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});
