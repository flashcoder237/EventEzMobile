/**
 * Modal pour sélectionner une réaction emoji — Compact Bottom Sheet
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { REACTION_EMOJIS } from '../../lib/utils/messagingHelpers';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

interface ReactionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
}

function ReactionPickerModal({
  visible,
  onClose,
  onSelectReaction,
}: ReactionPickerModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const handleSelect = (emoji: string) => {
    onSelectReaction(emoji);
    onClose();
  };

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Fermer les reactions">
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Reanimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.xl),
          },
          sheetAnim,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

        <Text style={[styles.title, { color: colors.gray600 }]}>Réagir au message</Text>

        <View style={styles.emojiRow}>
          {REACTION_EMOJIS.map((emoji) => {
            const emojiLabels: Record<string, string> = {
              '\u{1F44D}': 'Pouce en haut',
              '\u{2764}\u{FE0F}': 'Coeur',
              '\u{1F602}': 'Rire',
              '\u{1F62E}': 'Surpris',
              '\u{1F622}': 'Triste',
              '\u{1F389}': 'Celebration',
            };
            return (
              <TouchableOpacity
                key={emoji}
                style={[styles.emojiButton, { backgroundColor: colors.gray50 }]}
                onPress={() => handleSelect(emoji)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={emojiLabels[emoji] || emoji}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Reanimated.View>
    </Modal>
  );
}

export default memo(ReactionPickerModal);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.md,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  emojiButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
});
