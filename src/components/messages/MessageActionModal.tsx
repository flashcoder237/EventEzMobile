/**
 * Modal unifiee pour les actions sur un message
 * Repondre, Reagir, Transferer, Modifier, Supprimer
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { isMyMessage } from '../../lib/utils/messagingHelpers';

export type MessageActionType = 'reply' | 'react' | 'forward' | 'edit' | 'delete' | 'copy';

interface MessageActionModalProps {
  visible: boolean;
  message: Message | null;
  userId?: string | number;
  onClose: () => void;
  onAction: (action: MessageActionType) => void;
}

interface ActionItem {
  type: MessageActionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  destructive?: boolean;
  ownerOnly?: boolean;
}

const ACTIONS: ActionItem[] = [
  { type: 'reply', icon: 'arrow-undo-outline', label: 'Repondre' },
  { type: 'react', icon: 'happy-outline', label: 'Reagir' },
  { type: 'forward', icon: 'arrow-redo-outline', label: 'Transferer' },
  { type: 'copy', icon: 'copy-outline', label: 'Copier' },
  { type: 'edit', icon: 'create-outline', label: 'Modifier', ownerOnly: true },
  { type: 'delete', icon: 'trash-outline', label: 'Supprimer', destructive: true, ownerOnly: true },
];

function MessageActionModal({
  visible,
  message,
  userId,
  onClose,
  onAction,
}: MessageActionModalProps) {
  const { colors, isDark } = useTheme();

  if (!message) return null;

  const isMine = isMyMessage(message, userId);

  const handleAction = (action: MessageActionType) => {
    onAction(action);
    onClose();
  };

  const filteredActions = ACTIONS.filter(action => {
    if (action.ownerOnly && !isMine) return false;
    return true;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Message Preview */}
          <View style={[styles.preview, { borderBottomColor: colors.gray100 }]}>
            <Text style={[styles.previewLabel, { color: colors.gray500 }]}>Message</Text>
            <Text style={[styles.previewText, { color: colors.gray700 }]} numberOfLines={2}>
              {message.content || '[Piece jointe]'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {filteredActions.map((action, index) => (
              <TouchableOpacity
                key={action.type}
                style={[
                  styles.actionItem,
                  index === filteredActions.length - 1 && styles.actionItemLast,
                ]}
                onPress={() => handleAction(action.type)}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={action.destructive ? colors.error : colors.gray700}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: colors.gray700 },
                    action.destructive && { color: colors.error },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={[styles.cancelButton, { borderTopColor: colors.gray100 }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.gray500 }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default memo(MessageActionModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  preview: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  previewLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  previewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray700,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingVertical: Spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionItemLast: {
    borderBottomWidth: 0,
  },
  actionLabel: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray700,
  },
  actionLabelDestructive: {
    color: Colors.error,
  },
  cancelButton: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray500,
  },
});
