/**
 * Composant MessageBubble optimise avec memo
 * Affiche une bulle de message avec contenu, attachments, reactions
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
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

// État de lecture audio piloté par ConversationScreen (un seul player actif).
export interface VoicePlaybackState {
  messageId: string;
  currentMs: number;
  durationMs: number;
  isLoading: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isGrouped?: boolean;
  replyToMessage?: Message | null;
  otherUserId?: string | null;
  playingVoiceId?: string | null;
  voicePlayback?: VoicePlaybackState | null;
  uploadingAttachmentIds?: Set<string>;
  onLongPress: (message: Message) => void;
  onPlayVoice?: (uri: string, messageId: string) => void;
}

// ============================================================================
// VoiceAttachment — sous-composant dédié pour stabiliser le waveform
// (Math.random() à chaque render faisait sauter les barres) et afficher la
// progression réelle de lecture (temps + barres colorées proportionnellement).
// ============================================================================
const WAVEFORM_BARS = 22;

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface VoiceAttachmentProps {
  attachment: any;
  isPlaying: boolean;
  isLoading: boolean;
  progressRatio: number; // 0..1
  currentSeconds: number;
  totalSeconds: number;
  onPress: () => void;
  bg: string;
  fgIcon: string;
  activeBar: string;
  inactiveBar: string;
  textColor: string;
}

const VoiceAttachment = memo(function VoiceAttachment({
  attachment,
  isPlaying,
  isLoading,
  progressRatio,
  currentSeconds,
  totalSeconds,
  onPress,
  bg,
  fgIcon,
  activeBar,
  inactiveBar,
  textColor,
}: VoiceAttachmentProps) {
  // Waveform stable : on génère les hauteurs une seule fois.
  // Si le backend fournit waveform_data (array de 0..1), on l'utilise.
  // Sinon on hash sur duration_seconds uniquement — c'est la seule propriété
  // qui reste identique entre le tempMessage local (file_size=0, id=tmp:...)
  // et le vrai message backend (avec vraie taille et UUID). Utiliser file_size
  // ferait flasher les barres au moment du remplacement.
  const waveformHeights = useMemo(() => {
    const data = attachment?.waveform_data;
    if (Array.isArray(data) && data.length > 0) {
      return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
        const sample = data[Math.floor((i / WAVEFORM_BARS) * data.length)];
        return Math.max(4, Math.min(20, Number(sample) * 20 || 4));
      });
    }
    const durMs = Math.round(Number(attachment?.duration_seconds || 0) * 1000);
    const seed = `dur:${durMs}`;
    const base = hashStr(seed) || 1; // évite 0 qui donnerait toutes barres égales
    return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const v = ((base ^ (i * 2654435761)) >>> 0) % 16;
      return v + 4;
    });
  }, [attachment?.duration_seconds, attachment?.waveform_data]);

  const displayedSeconds = isPlaying || progressRatio > 0 ? currentSeconds : totalSeconds;

  return (
    <TouchableOpacity
      style={[styles.voiceAttachment, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire le message vocal'}
    >
      <View style={styles.voiceIconWrap}>
        {isLoading ? (
          <ActivityIndicator size="small" color={fgIcon} />
        ) : (
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={fgIcon} />
        )}
      </View>
      <View style={styles.waveformContainer}>
        {waveformHeights.map((h, i) => {
          const barRatio = (i + 0.5) / WAVEFORM_BARS;
          const active = barRatio <= progressRatio;
          return (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: h,
                  backgroundColor: active ? activeBar : inactiveBar,
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.voiceDuration, { color: textColor }]}>
        {formatDuration(displayedSeconds)}
      </Text>
    </TouchableOpacity>
  );
});

function MessageBubble({
  message,
  isMine,
  isGrouped = false,
  replyToMessage,
  otherUserId,
  playingVoiceId,
  voicePlayback,
  uploadingAttachmentIds,
  onLongPress,
  onPlayVoice,
}: MessageBubbleProps) {
  const { colors, isDark } = useTheme();
  const avatar = getMessageAvatar(message);
  const initials = getMessageInitials(message);
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const status = isMine ? getMessageStatus(message, otherUserId) : undefined;
  const groupedReactions = groupReactions(message.reactions);

  // Bulle interlocuteur : rose doux. Light = blush léger, dark = rose-bordeaux.
  // On garde l'indigo `colors.primary` pour le sender (mine) — palette cohérente
  // avec le brand EventEz (indigo + accent corail).
  const peerBubbleBg = isDark ? '#3B2330' : '#FFE4EC';
  const peerTextColor = isDark ? '#FCE7F3' : colors.gray900;

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
    const isUploading = !!(attachment.id && uploadingAttachmentIds?.has(String(attachment.id)));

    if (attachment.attachment_type === 'image') {
      return (
        <View key={attachment.id || index} style={styles.imageWrap}>
          <Image
            source={attachment.file}
            style={[styles.imageAttachment, { backgroundColor: colors.gray100 }]}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color={Colors.white} />
            </View>
          )}
        </View>
      );
    }

    if (attachment.attachment_type === 'voice') {
      // La card voice est rendue HORS de la bulle text — bg autoporteur.
      // Sender = primary indigo, peer = bulle rose pour rester aligné avec
      // le bg de la bulle texte de l'interlocuteur.
      const voiceBg = isMine ? colors.primary : peerBubbleBg;
      const voiceFg = isMine ? Colors.white : colors.primary;
      const activeBar = isMine ? Colors.white : colors.primary;
      const inactiveBar = isMine ? 'rgba(255,255,255,0.35)' : (isDark ? 'rgba(252,231,243,0.3)' : 'rgba(190,24,93,0.25)');
      const durationColor = isMine ? 'rgba(255,255,255,0.85)' : peerTextColor;

      const isCurrent = voicePlayback?.messageId === String(message.id);
      const isPlaying = playingVoiceId === String(message.id);
      const isLoading = !!isCurrent && !!voicePlayback?.isLoading;

      const totalSeconds = attachment.duration_seconds || (voicePlayback?.durationMs ? voicePlayback.durationMs / 1000 : 0);
      const currentSeconds = isCurrent ? (voicePlayback!.currentMs / 1000) : 0;
      const progressRatio = isCurrent && totalSeconds > 0
        ? Math.min(1, currentSeconds / totalSeconds)
        : 0;

      return (
        <View key={attachment.id || index} style={styles.imageWrap}>
          <VoiceAttachment
            attachment={attachment}
            isPlaying={isPlaying}
            isLoading={isLoading}
            progressRatio={progressRatio}
            currentSeconds={currentSeconds}
            totalSeconds={totalSeconds}
            onPress={() => onPlayVoice?.(attachment.file, String(message.id))}
            bg={voiceBg}
            fgIcon={voiceFg}
            activeBar={activeBar}
            inactiveBar={inactiveBar}
            textColor={durationColor}
          />
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color={Colors.white} />
            </View>
          )}
        </View>
      );
    }

    // Document
    return (
      <View key={attachment.id || index} style={styles.imageWrap}>
        <TouchableOpacity
          style={[styles.documentAttachment, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : peerBubbleBg }]}
        >
          <Ionicons
            name="document-outline"
            size={20}
            color={isMine ? Colors.white : colors.primary}
          />
          <Text
            style={[styles.documentName, { color: isMine ? Colors.white : peerTextColor }]}
            numberOfLines={1}
          >
            {attachment.file_name || 'Document'}
          </Text>
        </TouchableOpacity>
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="small" color={Colors.white} />
          </View>
        )}
      </View>
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
        accessibilityLabel="Message supprime"
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
              <Text style={[styles.deletedText, { color: colors.gray400 }]}>Ce message a été supprimé</Text>
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
          <Image source={avatar} style={styles.avatar} cachePolicy="disk" transition={200} />
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
          <View style={styles.attachmentsContainer} accessibilityLabel="Piece jointe">
            {message.attachments?.map((att, i) => renderAttachment(att, i))}
          </View>
        )}

        {/* Text Content */}
        {message.content && (
          <View
            style={[
              styles.bubble,
              isMine
                ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                : [styles.bubbleOther, { backgroundColor: peerBubbleBg }],
              hasAttachments && styles.bubbleWithAttachment,
            ]}
          >
            <Text
              accessibilityRole="text"
              accessibilityLabel={`${message.sender_name || 'Utilisateur'}: ${message.content}`}
              style={[styles.messageText, { color: isMine ? Colors.white : peerTextColor }]}
            >
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
  replyBarMine: {
    backgroundColor: 'rgba(255,255,255,0.5)',
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
    minWidth: 200,
  },
  voiceIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    position: 'relative',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
