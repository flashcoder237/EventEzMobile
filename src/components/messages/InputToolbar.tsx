/**
 * Barre d'outils de saisie de message
 * Inclut: champ texte, bouton image, bouton micro, bouton envoi
 * Gère aussi l'aperçu des pièces jointes, réponse et édition
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';
import { AttachedFile } from '../../hooks/useMessageState';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { formatDuration } from '../../lib/utils/messagingHelpers';

interface InputToolbarProps {
  // Input state
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;

  // Attachments
  attachedFiles: AttachedFile[];
  onPickImage: () => void;
  onRemoveAttachment: () => void;

  // Recording
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;

  // Reply/Edit
  replyToMessage: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}

function InputToolbar({
  value,
  onChangeText,
  onSend,
  sending,
  attachedFiles,
  onPickImage,
  onRemoveAttachment,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  replyToMessage,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: InputToolbarProps) {
  const inputRef = useRef<TextInput>(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;

  // Animation de pulsation pendant l'enregistrement
  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      recordingAnim.setValue(1);
    }
  }, [isRecording]);

  const canSend = (value.trim().length > 0 || attachedFiles.length > 0) && !sending;

  const handleSend = () => {
    if (!canSend) return;
    onSend();
    Keyboard.dismiss();
  };

  // Reply Preview
  const renderReplyPreview = () => {
    if (!replyToMessage) return null;

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewLeft}>
          <View style={styles.previewBar} />
          <View style={styles.previewContent}>
            <Text style={styles.previewLabel}>
              Répondre à {replyToMessage.sender_name || 'Utilisateur'}
            </Text>
            <Text style={styles.previewMessage} numberOfLines={1}>
              {replyToMessage.content}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancelReply} style={styles.previewClose}>
          <Ionicons name="close" size={20} color={Colors.gray500} />
        </TouchableOpacity>
      </View>
    );
  };

  // Edit Preview
  const renderEditPreview = () => {
    if (!editingMessage) return null;

    return (
      <View style={[styles.previewContainer, styles.editPreview]}>
        <View style={styles.previewLeft}>
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
          <View style={styles.previewContent}>
            <Text style={styles.previewLabel}>Modifier le message</Text>
            <Text style={styles.previewMessage} numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancelEdit} style={styles.previewClose}>
          <Ionicons name="close" size={20} color={Colors.gray500} />
        </TouchableOpacity>
      </View>
    );
  };

  // Attachment Preview
  const renderAttachmentPreview = () => {
    if (attachedFiles.length === 0) return null;

    return (
      <View style={styles.attachmentPreview}>
        {attachedFiles.map((file, index) => (
          <View key={index} style={styles.attachmentItem}>
            {file.type === 'image' && (
              <Image source={{ uri: file.uri }} style={styles.attachmentImage} />
            )}
            {file.type === 'voice' && (
              <View style={styles.attachmentVoice}>
                <Ionicons name="mic" size={24} color={Colors.primary} />
                <Text style={styles.attachmentVoiceDuration}>
                  {formatDuration(file.duration || 0)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.attachmentRemove}
              onPress={onRemoveAttachment}
            >
              <Ionicons name="close-circle" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  // Recording UI
  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity
          onPress={onCancelRecording}
          style={styles.recordingCancelButton}
        >
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
        </TouchableOpacity>

        <View style={styles.recordingInfo}>
          <Animated.View
            style={[
              styles.recordingDot,
              { transform: [{ scale: recordingAnim }] },
            ]}
          />
          <Text style={styles.recordingDurationText}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onStopRecording}
          style={styles.recordingSendButton}
        >
          <Ionicons name="send" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderReplyPreview()}
      {renderEditPreview()}
      {renderAttachmentPreview()}

      <View style={styles.inputRow}>
        {/* Image Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPickImage}
          activeOpacity={TOUCH_OPACITY}
        >
          <Ionicons name="image-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>

        {/* Text Input */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={editingMessage ? 'Modifier le message...' : 'Écrivez votre message...'}
            placeholderTextColor={Colors.gray400}
            multiline
            maxLength={1000}
          />
        </View>

        {/* Send or Mic Button */}
        {canSend ? (
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={TOUCH_OPACITY}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.micButton}
            onPress={onStartRecording}
            activeOpacity={TOUCH_OPACITY}
          >
            <Ionicons name="mic" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default memo(InputToolbar);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },

  // Preview Containers
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  editPreview: {
    backgroundColor: Colors.primary + '10',
  },
  previewLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewBar: {
    width: 3,
    height: '100%',
    minHeight: 32,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  previewContent: {
    flex: 1,
  },
  previewLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  previewMessage: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
  },
  previewClose: {
    padding: Spacing.xs,
  },

  // Attachment Preview
  attachmentPreview: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  attachmentItem: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  attachmentVoice: {
    width: 80,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentVoiceDuration: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
    marginTop: 4,
  },
  attachmentRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 10,
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.xs,
  },
  input: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recording
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  recordingCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  recordingDurationText: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  recordingSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
