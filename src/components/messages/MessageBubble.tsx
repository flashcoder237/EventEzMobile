/**
 * Composant MessageBubble optimise avec memo
 * Affiche une bulle de message avec contenu, attachments, reactions
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
import {
  MESSAGE_AVATAR_SIZE,
  formatMessageTime,
  getMessageInitials,
  getMessageAvatar,
  getMessageStatus,
  groupReactions,
  formatDuration,
} from '../../lib/utils/messagingHelpers';
import MessageStatusIcon from './MessageStatusIcon';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isGrouped?: boolean;
  replyToMessage?: Message | null;
  otherUserId?: string | null;
  playingVoiceId?: string | null;
  onLongPress: (message: Message) => void;
  onPlayVoice?: (uri: string, messageId: string) => void;
}

function MessageBubble({
  message,
  isMine,
  isGrouped = false,
  replyToMessage,
  otherUserId,
  playingVoiceId,
  onLongPress,
  onPlayVoice,
}: MessageBubbleProps) {
  const { colors, isDark } = useTheme();
  const avatar = getMessageAvatar(message);
  const initials = getMessageInitials(message);
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const status = isMine ? getMessageStatus(message, otherUserId) : undefined;
  const groupedReactions = groupReactions(message.reactions);

  const handleLongPress = useCallback(() => {
    onLongPress(message);
  }, [message, onLongPress]);

  // Render Reply Preview
  const renderReplyPreview = () => {
    if (!replyToMessage) return null;

    return (
      <View style={[styles.replyPreview, { backgroundColor: colors.gray100 }, isMine && styles.replyPreviewMine]}>
        <View style={[styles.replyBar, { backgroundColor: colors.primary }, isMine && styles.replyBarMine]} />
        <View style={styles.replyContent}>
          <Text
            style={[styles.replyName, { color: colors.primary }, isMine && styles.replyNameMine]}
            numberOfLines={1}
          >
            {replyToMessage.sender_name || 'Utilisateur'}
          </Text>
          <Text
            style={[styles.replyText, { color: colors.gray600 }, isMine && styles.replyTextMine]}
            numberOfLines={1}
          >
            {replyToMessage.content}
          </Text>
        </View>
      </View>
    );
  };

  // Render Attachment
  const renderAttachment = (attachment: any, index: number) => {
    if (attachment.attachment_type === 'image') {
      return (
        <Image
          key={attachment.id || index}
          source={{ uri: attachment.file }}
          style={[styles.imageAttachment, { backgroundColor: colors.gray100 }]}
          resizeMode="cover"
        />
      );
    }

    if (attachment.attachment_type === 'voice') {
      const isPlaying = playingVoiceId === message.id;
      return (
        <TouchableOpacity
          key={attachment.id || index}
          style={[styles.voiceAttachment, { backgroundColor: colors.gray100 }, isMine && styles.voiceAttachmentMine]}
          onPress={() => onPlayVoice?.(attachment.file, String(message.id))}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={isMine ? Colors.white : colors.primary}
          />
          <View style={styles.waveformContainer}>
            {[...Array(16)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  { height: Math.random() * 16 + 4, backgroundColor: colors.primary },
                  isMine && styles.waveformBarMine,
                ]}
              />
            ))}
          </View>
          <Text style={[styles.voiceDuration, { color: colors.gray600 }, isMine && styles.voiceDurationMine]}>
            {formatDuration(attachment.duration_seconds || 0)}
          </Text>
        </TouchableOpacity>
      );
    }

    // Document
    return (
      <TouchableOpacity
        key={attachment.id || index}
        style={[styles.documentAttachment, { backgroundColor: colors.gray100 }, isMine && styles.documentAttachmentMine]}
      >
        <Ionicons
          name="document-outline"
          size={20}
          color={isMine ? Colors.white : colors.gray600}
        />
        <Text
          style={[styles.documentName, { color: colors.gray700 }, isMine && styles.documentNameMine]}
          numberOfLines={1}
        >
          {attachment.file_name || 'Document'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render Reactions
  const renderReactions = () => {
    const entries = Object.entries(groupedReactions);
    if (entries.length === 0) return null;

    return (
      <View style={[styles.reactionsContainer, isMine && styles.reactionsContainerMine]}>
        {entries.map(([emoji, count]) => (
          <View key={emoji} style={[styles.reactionBadge, { backgroundColor: colors.surface, borderColor: colors.gray200 }]}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 1 && <Text style={[styles.reactionCount, { color: colors.gray600 }]}>{count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  // Deleted message placeholder
  if (message.is_deleted) {
    return (
      <TouchableOpacity
        style={[styles.messageRow, isMine && styles.messageRowMine, isGrouped && styles.messageRowGrouped]}
        activeOpacity={1}
      >
        {!isMine && (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.gray200 }]}>
            {!isGrouped && <Text style={[styles.avatarInitials, { color: colors.gray600 }]}>{initials}</Text>}
          </View>
        )}
        <View style={styles.bubbleContainer}>
          <View style={[styles.bubble, styles.deletedBubble, { backgroundColor: colors.gray100 }]}>
            <View style={styles.deletedContent}>
              <Ionicons name="trash-outline" size={14} color={colors.gray400} />
              <Text style={[styles.deletedText, { color: colors.gray400 }]}>Ce message a ete supprime</Text>
            </View>
          </View>
          <View style={[styles.timeRow, isMine && styles.timeRowMine]}>
            <Text style={[styles.timeText, { color: colors.gray400 }]}>{formatMessageTime(message.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.messageRow, isMine && styles.messageRowMine, isGrouped && styles.messageRowGrouped]}
      onLongPress={handleLongPress}
      delayLongPress={300}
      activeOpacity={0.8}
    >
      {/* Avatar (only for other user's messages, hidden when grouped) */}
      {!isMine && (
        isGrouped ? (
          <View style={styles.avatarSpacer} />
        ) : avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.gray200 }]}>
            <Text style={[styles.avatarInitials, { color: colors.gray600 }]}>{initials}</Text>
          </View>
        )
      )}

      <View style={styles.bubbleContainer}>
        {/* Reply Preview */}
        {renderReplyPreview()}

        {/* Attachments */}
        {hasAttachments && (
          <View style={styles.attachmentsContainer}>
            {message.attachments?.map((att, i) => renderAttachment(att, i))}
          </View>
        )}

        {/* Text Content */}
        {message.content && (
          <View
            style={[
              styles.bubble,
              isMine ? [styles.bubbleMine, { backgroundColor: colors.primary }] : [styles.bubbleOther, { backgroundColor: colors.surface }],
              hasAttachments && styles.bubbleWithAttachment,
            ]}
          >
            <Text style={[styles.messageText, { color: colors.gray900 }, isMine && styles.messageTextMine]}>
              {message.content}
            </Text>
          </View>
        )}

        {/* Reactions */}
        {renderReactions()}

        {/* Time and Status */}
        <View style={[styles.timeRow, isMine && styles.timeRowMine]}>
          {message.is_edited && (
            <Text style={[styles.editedLabel, { color: colors.gray400 }]}>modifie</Text>
          )}
          <Text style={[styles.timeText, { color: colors.gray400 }]}>{formatMessageTime(message.created_at)}</Text>
          {status && (
            <View style={styles.statusIcon}>
              <MessageStatusIcon status={status} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Fonction de comparaison pour memo
function arePropsEqual(prevProps: MessageBubbleProps, nextProps: MessageBubbleProps): boolean {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_edited === nextProps.message.is_edited &&
    prevProps.message.is_deleted === nextProps.message.is_deleted &&
    prevProps.message.read_by?.length === nextProps.message.read_by?.length &&
    prevProps.message.reactions?.length === nextProps.message.reactions?.length &&
    prevProps.isMine === nextProps.isMine &&
    prevProps.isGrouped === nextProps.isGrouped &&
    prevProps.playingVoiceId === nextProps.playingVoiceId &&
    prevProps.replyToMessage?.id === nextProps.replyToMessage?.id
  );
}

export default memo(MessageBubble, arePropsEqual);

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },
  messageRowGrouped: {
    marginBottom: 2,
  },

  // Avatar
  avatar: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },

  // Bubble Container
  bubbleContainer: {
    maxWidth: '75%',
  },

  // Bubble
  bubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleWithAttachment: {
    marginTop: Spacing.xs,
  },

  // Message Text
  messageText: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
    lineHeight: 22,
  },
  messageTextMine: {
    color: Colors.white,
  },

  // Reply Preview
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  replyNameMine: {
    color: Colors.white,
  },
  replyText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  replyTextMine: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Attachments
  attachmentsContainer: {
    marginBottom: Spacing.xs,
  },
  imageAttachment: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },

  // Voice Attachment
  voiceAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    minWidth: 180,
  },
  voiceAttachmentMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 24,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  waveformBarMine: {
    backgroundColor: Colors.white,
  },
  voiceDuration: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontFamily: FontFamily.medium,
  },
  voiceDurationMine: {
    color: Colors.white,
  },

  // Document Attachment
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  documentAttachmentMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  documentName: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    flex: 1,
  },
  documentNameMine: {
    color: Colors.white,
  },

  // Reactions
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsContainerMine: {
    justifyContent: 'flex-end',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: Colors.gray600,
    marginLeft: 2,
    fontFamily: FontFamily.medium,
  },

  // Time Row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeRowMine: {
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  statusIcon: {
    marginLeft: 4,
  },

  // Avatar spacer for grouped messages
  avatarSpacer: {
    width: MESSAGE_AVATAR_SIZE,
    marginRight: Spacing.sm,
  },

  // Deleted message
  deletedBubble: {
    backgroundColor: Colors.gray100,
    opacity: 0.8,
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    fontStyle: 'italic',
  },

  // Edited label
  editedLabel: {
    fontSize: 10,
    color: Colors.gray400,
    fontStyle: 'italic',
    marginRight: 4,
  },
});
