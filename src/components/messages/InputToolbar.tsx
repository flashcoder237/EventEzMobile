/**
 * Barre d'outils de saisie de message
 * Inclut: champ texte, bouton image, bouton micro, bouton envoi
 * Gere aussi l'apercu des pieces jointes, reponse et edition
 */

import React, { memo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import EventActionsSheet from '../organizer/EventActionsSheet';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
import { useTheme } from '../../contexts/ThemeContext';
import { formatDuration } from '../../lib/utils/messagingHelpers';

// #9 Mini-waveform live affichee pendant l'enregistrement. Maintient un
// ring-buffer des N derniers niveaux audio pour donner l'illusion d'un
// vrai signal qui defile.
const METER_BAR_COUNT = 12;
function LiveMeterBars({ level, color }: { level?: number; color: string }) {
  const [history, setHistory] = useState<number[]>(() => Array(METER_BAR_COUNT).fill(0.1));
  useEffect(() => {
    if (typeof level !== 'number' || !Number.isFinite(level)) return;
    // expo-audio metering ~ -160..0 dB. On normalise -50..0 vers 0.1..1.
    // En dessous de -50dB on considere du silence (bar mini).
    const normalized = Math.max(0.1, Math.min(1, (level + 50) / 50));
    setHistory((prev) => {
      const next = prev.slice(1);
      next.push(normalized);
      return next;
    });
  }, [level]);
  return (
    <View style={meterStyles.container} pointerEvents="none">
      {history.map((h, i) => (
        <View
          key={i}
          style={[
            meterStyles.bar,
            {
              height: 4 + h * 14,
              backgroundColor: color,
              opacity: 0.55 + h * 0.45,
            },
          ]}
        />
      ))}
    </View>
  );
}
const meterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 12,
    height: 20,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});

interface InputToolbarProps {
  // Input state
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;

  // Attachments
  attachedFiles: AttachedFile[];
  onPickImage: () => void;
  onPickDocument?: () => void;
  onRemoveAttachment: () => void;

  // Recording
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  /** #9 Niveau audio en dB (env. -160..0). Anime la mini-waveform du recording. */
  meteringLevel?: number;
  /** #5 Mode mains libres : recording locked, l'user peut scroller. */
  isRecordingLocked?: boolean;
  onLockRecording?: () => void;

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
  onPickDocument,
  onRemoveAttachment,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  meteringLevel,
  isRecordingLocked = false,
  onLockRecording,
  replyToMessage,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: InputToolbarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;
  // Bottom sheet pour le choix d'attachement (Photo / Document). Remplace
  // l'Alert natif qui ne supportait pas les icônes ni le theming custom.
  const [attachSheetVisible, setAttachSheetVisible] = useState(false);

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
      <View style={[styles.previewContainer, { borderBottomColor: colors.gray100 }]}>
        <View style={styles.previewLeft}>
          <View style={[styles.previewBar, { backgroundColor: colors.primary }]} />
          <View style={styles.previewContent}>
            <Text style={[styles.previewLabel, { color: colors.primary }]}>
              {t('componentsMessages.inputReplyTo', { name: replyToMessage.sender_name || t('componentsMessages.userFallback') })}
            </Text>
            <Text style={[styles.previewMessage, { color: colors.gray600 }]} numberOfLines={1}>
              {replyToMessage.content}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancelReply} style={styles.previewClose}>
          <Ionicons name="close" size={20} color={colors.gray500} />
        </TouchableOpacity>
      </View>
    );
  };

  // Edit Preview
  const renderEditPreview = () => {
    if (!editingMessage) return null;

    return (
      <View style={[styles.previewContainer, styles.editPreview, { borderBottomColor: colors.gray100, backgroundColor: colors.primary + '10' }]}>
        <View style={styles.previewLeft}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <View style={styles.previewContent}>
            <Text style={[styles.previewLabel, { color: colors.primary }]}>{t('componentsMessages.inputEditing')}</Text>
            <Text style={[styles.previewMessage, { color: colors.gray600 }]} numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancelEdit} style={styles.previewClose}>
          <Ionicons name="close" size={20} color={colors.gray500} />
        </TouchableOpacity>
      </View>
    );
  };

  // Attachment Preview
  const renderAttachmentPreview = () => {
    if (attachedFiles.length === 0) return null;

    return (
      <View style={[styles.attachmentPreview, { borderBottomColor: colors.gray100 }]}>
        {attachedFiles.map((file, index) => (
          <View key={index} style={styles.attachmentItem}>
            {file.type === 'image' && (
              <Image source={file.uri} style={styles.attachmentImage} transition={200} />
            )}
            {file.type === 'voice' && (
              <View style={[styles.attachmentVoice, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="mic" size={24} color={colors.primary} />
                <Text style={[styles.attachmentVoiceDuration, { color: colors.gray600 }]}>
                  {formatDuration(file.duration || 0)}
                </Text>
              </View>
            )}
            {file.type === 'document' && (
              <View style={[styles.attachmentVoice, { backgroundColor: colors.gray100, paddingHorizontal: 8 }]}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text
                  style={[styles.attachmentVoiceDuration, { color: colors.gray600, maxWidth: 80 }]}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.attachmentRemove, { backgroundColor: colors.surface }]}
              onPress={onRemoveAttachment}
            >
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  // Recording UI
  if (isRecording) {
    return (
      <View style={[styles.recordingContainer, { backgroundColor: colors.surface, borderTopColor: colors.gray100 }]}>
        <TouchableOpacity
          onPress={onCancelRecording}
          style={[styles.recordingCancelButton, { backgroundColor: colors.error + '15' }]}
          accessibilityLabel={t('componentsMessages.recordingCancel') || 'Annuler'}
        >
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>

        <View style={styles.recordingInfo}>
          <Animated.View
            style={[
              styles.recordingDot,
              { backgroundColor: colors.error, transform: [{ scale: recordingAnim }] },
            ]}
          />
          <Text style={[styles.recordingDurationText, { color: colors.gray900 }]}>
            {formatDuration(recordingDuration)}
          </Text>
          {/* #9 Mini-waveform live qui reagit au niveau audio */}
          <LiveMeterBars level={meteringLevel} color={colors.primary} />
        </View>

        {/* #5 Lock button — disponible quand pas encore locked. Une fois
            locked, l'icone disparait et l'user peut scroller librement. */}
        {!isRecordingLocked && onLockRecording && (
          <TouchableOpacity
            onPress={onLockRecording}
            style={[styles.recordingLockButton, { backgroundColor: colors.gray100 }]}
            accessibilityLabel={t('componentsMessages.recordingLock') || 'Verrouiller'}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.gray700} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onStopRecording}
          style={[styles.recordingSendButton, { backgroundColor: colors.primary }]}
          accessibilityLabel={t('componentsMessages.recordingSend') || 'Envoyer'}
        >
          <Ionicons name="send" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.gray100 }]}>
      {renderReplyPreview()}
      {renderEditPreview()}
      {renderAttachmentPreview()}

      <View style={styles.inputRow}>
        {/* Attach Button — ouvre le bottom sheet Photo / Document. Sans
            onPickDocument, fallback direct sur la galerie photo (compat
            ascendante avec les composants qui ne passent que onPickImage). */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (!onPickDocument) {
              onPickImage();
              return;
            }
            setAttachSheetVisible(true);
          }}
          activeOpacity={TOUCH_OPACITY}
          accessibilityLabel={t('componentsMessages.inputJoinFile')}
          accessibilityHint={t('componentsMessages.inputJoinFileHint')}
          accessibilityRole="button"
        >
          <Ionicons name="attach" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Text Input */}
        <View style={[styles.inputWrapper, { backgroundColor: colors.gray50 }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.gray900 }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={editingMessage ? t('componentsMessages.inputEditPlaceholder') : t('componentsMessages.inputPlaceholder')}
            placeholderTextColor={colors.gray400}
            multiline
            // Android : sans `textAlignVertical=top`, RN centre verticalement
            // le texte multiline et coupe la dernière ligne quand le contenu
            // grandit. Forcer top-align rend le rendu prévisible et fait
            // disparaître le clipping de la dernière ligne.
            textAlignVertical="top"
            maxLength={1000}
            accessibilityLabel={t('componentsMessages.inputWriteMessage')}
          />
        </View>

        {/* Send or Mic Button */}
        {canSend ? (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={TOUCH_OPACITY}
            accessibilityLabel={t('componentsMessages.inputSend')}
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.micButton, { backgroundColor: colors.gray100 }]}
            onPress={onStartRecording}
            activeOpacity={TOUCH_OPACITY}
            accessibilityLabel={t('componentsMessages.inputRecordVoice')}
            accessibilityRole="button"
          >
            <Ionicons name="mic" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom sheet pour choisir entre Photo et Document. */}
      <EventActionsSheet
        visible={attachSheetVisible}
        onClose={() => setAttachSheetVisible(false)}
        title={t('componentsMessages.attachChoiceTitle')}
        sections={[{
          actions: [
            {
              label: t('componentsMessages.attachChoicePhoto'),
              icon: 'image-outline',
              onPress: () => onPickImage(),
            },
            {
              label: t('componentsMessages.attachChoiceDocument'),
              icon: 'document-outline',
              onPress: () => { onPickDocument?.(); },
            },
          ],
        }]}
      />
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
    // IMPORTANT : maxHeight DOIT valoir `padding × 2 + lineHeight × N` pour
    // un nombre entier N de lignes, sinon la dernière ligne est tronquée
    // au milieu et l'utilisateur voit son texte « coupé ».
    // 12 + 22×5 + 12 = 134 → 5 lignes complètes visibles avant scroll interne.
    lineHeight: 22,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 46,   // 12 + 22 + 12 = une ligne propre, aligne avec les boutons 40
    maxHeight: 134,  // 12 + 22×5 + 12 = 5 lignes propres, ensuite scroll interne
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
  recordingLockButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});
