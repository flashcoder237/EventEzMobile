/**
 * Modal unifiée pour les actions sur un message — Bottom Sheet
 * Repondre, Reagir, Transferer, Modifier, Supprimer
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
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { isMyMessage } from '../../lib/utils/messagingHelpers';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

export type MessageActionType =
  | 'reply'
  | 'reply_voice'
  | 'react'
  | 'forward'
  | 'edit'
  | 'delete'
  | 'copy'
  | 'report'
  | 'block'
  | 'star'
  | 'select'
  // Attachment-specific (visibles uniquement quand message a une PJ)
  | 'save_image'      // image
  | 'open_with'       // document
  | 'share_attachment' // image + document
  | 'copy_link';      // image + document (URL du blob)

interface MessageActionModalProps {
  visible: boolean;
  message: Message | null;
  userId?: string | number;
  /**
   * Type de la conversation : `direct` autorise "Bloquer", les autres non.
   * Si non fourni, on cache "Bloquer" par sécurité.
   */
  conversationType?: 'direct' | 'group' | 'event' | null;
  onClose: () => void;
  onAction: (action: MessageActionType) => void;
}

interface ActionItem {
  type: MessageActionType;
  icon: keyof typeof Ionicons.glyphMap;
  /** i18n key for the label */
  labelKey: string;
  destructive?: boolean;
  ownerOnly?: boolean;
  /** Visible uniquement sur les messages des autres (pas les miens). */
  othersOnly?: boolean;
  /** Visible uniquement en conversation directe (pas group/event). */
  directOnly?: boolean;
  /** Caché si message system (welcome, join, etc.). */
  hideOnSystem?: boolean;
  /** Visible uniquement si message a au moins une image en attachment. */
  imageOnly?: boolean;
  /** Visible uniquement si message a au moins un document (file_name) en attachment. */
  documentOnly?: boolean;
  /** Visible si message a une image OU un document (URL ouvrable). */
  hasAttachmentUrl?: boolean;
}

const ACTIONS: ActionItem[] = [
  { type: 'reply',       icon: 'arrow-undo-outline', labelKey: 'componentsMessages.actionReply',                                                hideOnSystem: true },
  { type: 'reply_voice', icon: 'mic-outline',        labelKey: 'componentsMessages.replyByVoice',                                               hideOnSystem: true },
  { type: 'react',       icon: 'happy-outline',      labelKey: 'componentsMessages.actionReact',                                                hideOnSystem: true },
  { type: 'forward', icon: 'arrow-redo-outline', labelKey: 'componentsMessages.actionForward',                                              hideOnSystem: true },
  { type: 'select',  icon: 'checkmark-circle-outline', labelKey: 'componentsMessages.actionSelect',                                         hideOnSystem: true },
  { type: 'copy',    icon: 'copy-outline',       labelKey: 'componentsMessages.actionCopy' },
  // Le label + l'icône sont remplacés dynamiquement par `unstar` quand le
  // message est déjà star (cf. render plus bas). Type reste 'star' côté handler
  // — le toggle se fait côté backend.
  { type: 'star',    icon: 'star-outline',       labelKey: 'componentsMessages.actionStar',                                                 hideOnSystem: true },
  // Attachment-specific (apparaissent dynamiquement quand applicable) :
  { type: 'save_image',      icon: 'download-outline',     labelKey: 'componentsMessages.attachmentMenuSaveImage',     imageOnly: true,         hideOnSystem: true },
  { type: 'open_with',       icon: 'open-outline',         labelKey: 'componentsMessages.attachmentMenuOpenWith',      documentOnly: true,      hideOnSystem: true },
  { type: 'share_attachment',icon: 'share-outline',        labelKey: 'componentsMessages.attachmentMenuShare',         hasAttachmentUrl: true,  hideOnSystem: true },
  { type: 'copy_link',       icon: 'link-outline',         labelKey: 'componentsMessages.attachmentMenuCopyLink',      hasAttachmentUrl: true,  hideOnSystem: true },
  { type: 'edit',    icon: 'create-outline',     labelKey: 'componentsMessages.actionEdit',                          ownerOnly: true,     hideOnSystem: true },
  { type: 'delete',  icon: 'trash-outline',      labelKey: 'componentsMessages.actionDelete', destructive: true,      ownerOnly: true,     hideOnSystem: true },
  { type: 'report',  icon: 'flag-outline',       labelKey: 'componentsMessages.actionReport', destructive: true,      othersOnly: true,    hideOnSystem: true },
  { type: 'block',   icon: 'ban-outline',        labelKey: 'componentsMessages.actionBlock',  destructive: true,      othersOnly: true,    directOnly: true, hideOnSystem: true },
];

function MessageActionModal({
  visible,
  message,
  userId,
  conversationType,
  onClose,
  onAction,
}: MessageActionModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const isMine = message ? isMyMessage(message, userId) : false;
  const isSystem = message?.message_type === 'system';
  const isDirect = conversationType === 'direct';

  const handleAction = (action: MessageActionType) => {
    onAction(action);
    onClose();
  };

  // Détection des attachments — pour gater save_image / open_with /
  // share / copy_link selon le type de fichier present.
  const attachments = (message?.attachments || []) as any[];
  const hasImage = attachments.some(a => a?.attachment_type === 'image');
  const hasDocument = attachments.some(a =>
    a?.attachment_type && a.attachment_type !== 'image' && a.attachment_type !== 'voice',
  );
  const hasAttachmentUrl = attachments.some(a =>
    typeof a?.file === 'string' && a.file.startsWith('http'),
  );

  const filteredActions = ACTIONS.filter(a => {
    if (a.hideOnSystem && isSystem) return false;
    if (a.ownerOnly && !isMine) return false;
    if (a.othersOnly && isMine) return false;
    if (a.directOnly && !isDirect) return false;
    if (a.imageOnly && !hasImage) return false;
    if (a.documentOnly && !hasDocument) return false;
    if (a.hasAttachmentUrl && !hasAttachmentUrl) return false;
    // 'copy' (texte) cache si pas de content (message qui n'a QUE des PJ)
    if (a.type === 'copy' && !message?.content) return false;
    return true;
  });

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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Reanimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom + Spacing.xs, Spacing.lg),
          },
          sheetAnim,
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

        {/* Message preview */}
        {message && (
          <View style={[styles.preview, { borderBottomColor: colors.gray100 }]}>
            <Text style={[styles.previewLabel, { color: colors.gray500 }]}>{t('componentsMessages.messagePreviewLabel')}</Text>
            <Text
              style={[styles.previewText, { color: colors.gray700 }]}
              numberOfLines={2}
            >
              {message.content || t('componentsMessages.attachmentPlaceholder')}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {filteredActions.map((action, index) => {
            // L'action star bascule entre "Marquer / Retirer" selon l'état
            // actuel du message. Le handler appelle toujours `messagesAPI.starMessage`
            // qui toggle côté backend (cf. views.py:644-653).
            const isStarToggle = action.type === 'star' && message?.is_starred;
            const labelKey = isStarToggle ? 'componentsMessages.actionUnstar' : action.labelKey;
            const icon = isStarToggle ? 'star' : action.icon;
            const tint = action.type === 'star' && message?.is_starred ? colors.warning : null;
            const label = t(labelKey);
            const isDestructive = !!action.destructive;
            return (
              <TouchableOpacity
                key={action.type}
                style={[
                  styles.actionItem,
                  { borderBottomColor: colors.gray100 },
                  index === filteredActions.length - 1 && styles.actionItemLast,
                ]}
                onPress={() => handleAction(action.type)}
                activeOpacity={TOUCH_OPACITY}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <View style={[styles.actionIcon, { backgroundColor: isDestructive ? `${colors.error}12` : (tint ? `${tint}18` : colors.gray50) }]}>
                  <Ionicons
                    name={icon}
                    size={20}
                    color={isDestructive ? colors.error : (tint || colors.gray700)}
                  />
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: isDestructive ? colors.error : colors.gray700 },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.gray100 }]}
          onPress={onClose}
          activeOpacity={TOUCH_OPACITY}
          accessibilityLabel={t('componentsMessages.actionsCloseA11y')}
          accessibilityRole="button"
        >
          <Text style={[styles.cancelText, { color: colors.gray600 }]}>{t('componentsMessages.actionCancel')}</Text>
        </TouchableOpacity>
      </Reanimated.View>
    </Modal>
  );
}

export default memo(MessageActionModal);

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
    paddingTop: Spacing.sm,
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
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  preview: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
  },
  previewLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  actionItemLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
});
