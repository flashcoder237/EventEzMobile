/**
 * Composant MessageBubble optimise avec memo
 * Affiche une bulle de message avec contenu, attachments, reactions
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ImageView from 'react-native-image-viewing';
// expo-file-system v19+ a deplace l'API classique vers /legacy. Le module
// principal exporte la nouvelle API File/Directory class-based qui n'a pas
// `cacheDirectory` au top-level.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import EventActionsSheet, { EventAction } from '../organizer/EventActionsSheet';
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

// ============================================================================
// Helpers attachments — taille humaine + meta type fichier
// ============================================================================

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value.toFixed(value >= 100 || unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

function getFileExtension(filename?: string): string {
  if (!filename) return '';
  const idx = filename.lastIndexOf('.');
  if (idx < 0 || idx === filename.length - 1) return '';
  return filename.slice(idx + 1).toLowerCase();
}

interface FileTypeMeta {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}

// Map extension → icone + couleur. Couleurs alignees sur les apps de
// reference (PDF rouge Adobe, Word bleu Office, Excel vert Office, etc.).
function getFileTypeMeta(filename?: string, mimeType?: string): FileTypeMeta {
  const ext = getFileExtension(filename);
  const mime = (mimeType || '').toLowerCase();

  if (['pdf'].includes(ext) || mime.includes('pdf')) {
    return { icon: 'document-text', color: '#E11D48', label: 'PDF' };
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('word') || mime.includes('document')) {
    return { icon: 'document', color: '#2563EB', label: ext.toUpperCase() || 'DOC' };
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) {
    return { icon: 'grid', color: '#059669', label: ext.toUpperCase() || 'XLSX' };
  }
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext) || mime.includes('presentation')) {
    return { icon: 'easel', color: '#EA580C', label: ext.toUpperCase() || 'PPTX' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: 'archive', color: '#7C3AED', label: ext.toUpperCase() || 'ZIP' };
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mime.startsWith('video/')) {
    return { icon: 'videocam', color: '#0891B2', label: ext.toUpperCase() || 'VIDEO' };
  }
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext) || mime.startsWith('audio/')) {
    return { icon: 'musical-notes', color: '#9333EA', label: ext.toUpperCase() || 'AUDIO' };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) || mime.startsWith('image/')) {
    return { icon: 'image', color: '#0EA5E9', label: ext.toUpperCase() || 'IMAGE' };
  }
  if (['txt', 'md', 'log', 'json', 'xml'].includes(ext) || mime.startsWith('text/')) {
    return { icon: 'document-outline', color: '#64748B', label: ext.toUpperCase() || 'TXT' };
  }
  return { icon: 'document-attach', color: '#64748B', label: ext.toUpperCase() || 'FILE' };
}

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
  /** Forward — appele depuis le menu attachment, reuse le flow message-level
      du parent (qui ouvre le modal de selection de conversation). */
  onForward?: (message: Message) => void;
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
  const { t } = useTranslation();
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
      accessibilityLabel={isPlaying ? t('componentsMessages.voicePause') : t('componentsMessages.voicePlay')}
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
  onForward,
}: MessageBubbleProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { showError, showSuccess } = useAlert();
  // Sheet d'actions sur une pièce jointe (Télécharger / Partager / Sauvegarder
  // dans la galerie / Forward / Copier le lien). Remplace l'Alert natif.
  const [attachSheetTarget, setAttachSheetTarget] = useState<any | null>(null);
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

  // ========== State pour viewer image fullscreen + DL fichiers ==========
  // On collecte toutes les images du message en un seul array → permet a
  // l'ImageView de proposer un swipe entre images (pattern WhatsApp).
  const imageAttachments = useMemo(
    () => (message.attachments || []).filter(a => a.attachment_type === 'image'),
    [message.attachments],
  );
  const imageSources = useMemo(
    () => imageAttachments.map(a => ({ uri: typeof a.file === 'string' ? a.file : (a.file as any)?.uri })),
    [imageAttachments],
  );
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // DL state par attachment id : 'idle' | 'downloading' | { progress: 0..1 }
  // Permet d'afficher un spinner ou une barre de progres sur le tile fichier
  // pendant qu'on telecharge — surtout utile sur fichiers > 1 MB.
  const [dlState, setDlState] = useState<Record<string, { progress: number } | undefined>>({});

  const openImageAt = useCallback((index: number) => {
    setImageViewerIndex(Math.max(0, Math.min(index, imageSources.length - 1)));
    setImageViewerOpen(true);
    try { Haptics.selectionAsync(); } catch { /* ignore */ }
  }, [imageSources.length]);

  // Telecharge le fichier dans le cache local puis ouvre via le picker systeme
  // (Android = sélecteur app, iOS = QuickLook). Sharing.shareAsync ouvre la
  // sheet "Ouvrir avec / Sauvegarder dans...". L'utilisateur n'a pas besoin
  // de quitter l'app pour voir un PDF.
  const downloadAndOpen = useCallback(async (attachment: any) => {
    const url = typeof attachment.file === 'string' ? attachment.file : null;
    if (!url) {
      showError(t('componentsMessages.attachmentErrorTitle'), t('componentsMessages.attachmentInvalidUrl'));
      return;
    }
    const attId = String(attachment.id);
    const filename = attachment.file_name || `file-${attId}`;
    // Pour eviter les caracteres invalides dans le path local
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetUri = `${FileSystem.cacheDirectory}${attId}-${safeName}`;

    try {
      // Si deja telecharge, on saute le download
      const info = await FileSystem.getInfoAsync(targetUri);
      if (!info.exists) {
        setDlState(prev => ({ ...prev, [attId]: { progress: 0 } }));
        const resumable = FileSystem.createDownloadResumable(
          url,
          targetUri,
          {},
          (p) => {
            const progress = p.totalBytesExpectedToWrite > 0
              ? p.totalBytesWritten / p.totalBytesExpectedToWrite
              : 0;
            setDlState(prev => ({ ...prev, [attId]: { progress } }));
          },
        );
        const result = await resumable.downloadAsync();
        if (!result?.uri) throw new Error('Download failed');
      }
      setDlState(prev => ({ ...prev, [attId]: undefined }));

      // Ouverture via le sheet de partage systeme — l'user choisit l'app
      // (PDF reader, Word, Drive, etc.) ou "Sauvegarder dans Fichiers".
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(targetUri, {
          dialogTitle: filename,
          mimeType: attachment.mime_type || undefined,
          UTI: attachment.mime_type || undefined,
        });
      } else {
        showError(t('componentsMessages.attachmentErrorTitle'), t('componentsMessages.sharingUnavailable'));
      }
    } catch (error: any) {
      setDlState(prev => ({ ...prev, [attId]: undefined }));
      if (__DEV__) console.error('[Attachment] downloadAndOpen failed:', error);
      showError(
        t('componentsMessages.attachmentErrorTitle'),
        error?.message || t('componentsMessages.attachmentDownloadFailed'),
      );
    }
  }, [t, showError]);

  // Sauvegarde une image dans la galerie photos via expo-media-library.
  // Import dynamique pour eviter le hard-fail si le package n'est pas encore
  // installe (compatibilite ancienne build → fallback sur Sharing.shareAsync).
  const saveImageToGallery = useCallback(async (attachment: any) => {
    const url = typeof attachment.file === 'string' ? attachment.file : null;
    if (!url) return;
    const attId = String(attachment.id);
    const filename = attachment.file_name || `image-${attId}.jpg`;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetUri = `${FileSystem.cacheDirectory}${attId}-${safeName}`;
    try {
      // 1. DL local
      const info = await FileSystem.getInfoAsync(targetUri);
      if (!info.exists) {
        const result = await FileSystem.downloadAsync(url, targetUri);
        if (!result.uri) throw new Error('Download failed');
      }
      // 2. Save via expo-media-library (require dynamique → no-op si absent)
      let MediaLibrary: any;
      try { MediaLibrary = require('expo-media-library'); }
      catch { MediaLibrary = null; }

      if (MediaLibrary?.saveToLibraryAsync) {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) {
          showError(
            t('componentsMessages.attachmentMenuPermissionDenied'),
            t('componentsMessages.attachmentMenuPermissionMessage'),
          );
          return;
        }
        await MediaLibrary.saveToLibraryAsync(targetUri);
        showSuccess(t('componentsMessages.attachmentMenuSavedSuccess'));
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* ignore */ }
      } else {
        // Fallback pour les builds sans expo-media-library : on ouvre la
        // sheet de partage qui permet "Save to Photos" / "Save to Gallery".
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(targetUri, { dialogTitle: filename });
        } else {
          showError(
            t('componentsMessages.attachmentErrorTitle'),
            t('componentsMessages.sharingUnavailable'),
          );
        }
      }
    } catch (error: any) {
      if (__DEV__) console.error('[Attachment] saveImageToGallery failed:', error);
      showError(
        t('componentsMessages.attachmentErrorTitle'),
        error?.message || t('componentsMessages.attachmentDownloadFailed'),
      );
    }
  }, [t, showError, showSuccess]);

  const showAttachmentMenu = useCallback((attachment: any) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* ignore */ }
    setAttachSheetTarget(attachment);
  }, []);

  // Construction des actions du sheet, mémoizée. Recalculée quand la cible
  // change (image ↔ document) ou quand les callbacks varient.
  const attachSheetActions: EventAction[] = useMemo(() => {
    const target = attachSheetTarget;
    if (!target) return [];
    const url = typeof target.file === 'string' ? target.file : null;
    const isImage = target.attachment_type === 'image';
    const actions: EventAction[] = [];

    actions.push({
      label: isImage ? t('componentsMessages.attachmentMenuShare') : t('componentsMessages.attachmentMenuOpenWith'),
      icon: isImage ? 'share-outline' : 'open-outline',
      onPress: () => downloadAndOpen(target),
    });

    if (isImage) {
      actions.push({
        label: t('componentsMessages.attachmentMenuSaveImage'),
        icon: 'download-outline',
        onPress: () => saveImageToGallery(target),
      });
    }

    if (onForward) {
      actions.push({
        label: t('componentsMessages.attachmentMenuForward'),
        icon: 'arrow-redo-outline',
        onPress: () => onForward(message),
      });
    }

    if (url) {
      actions.push({
        label: t('componentsMessages.attachmentMenuCopyLink'),
        icon: 'link-outline',
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(url);
          } catch { /* ignore */ }
        },
      });
    }

    return actions;
  }, [attachSheetTarget, downloadAndOpen, saveImageToGallery, onForward, message, t]);

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
            {replyToMessage.sender_name || t('componentsMessages.userFallback')}
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
      // Index dans le tableau d'images (pour ouvrir le viewer au bon endroit)
      const imageIdx = imageAttachments.findIndex(a => a.id === attachment.id);
      return (
        <TouchableOpacity
          key={attachment.id || index}
          style={styles.imageWrap}
          activeOpacity={0.85}
          onPress={() => { if (!isUploading) openImageAt(imageIdx >= 0 ? imageIdx : 0); }}
          onLongPress={() => { if (!isUploading) showAttachmentMenu(attachment); }}
          delayLongPress={300}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('componentsMessages.imageAttachmentA11y')}
          accessibilityHint={t('componentsMessages.imageAttachmentHint')}
        >
          <Image
            source={attachment.file}
            style={[styles.imageAttachment, { backgroundColor: colors.gray100 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            placeholder={attachment.image_placeholder || undefined}
            placeholderContentFit="cover"
          />
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color={Colors.white} />
            </View>
          )}
        </TouchableOpacity>
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

    // Document — tap pour DL + ouvrir avec, long-press pour menu
    const meta = getFileTypeMeta(attachment.file_name, attachment.mime_type);
    const sizeStr = formatFileSize(attachment.file_size);
    const subline = [meta.label, sizeStr].filter(Boolean).join(' · ');
    const dl = attachment.id ? dlState[String(attachment.id)] : undefined;
    const isDownloading = !!dl;
    const downloadProgress = dl?.progress ?? 0;
    // Couleur d'accent : couleur typee si peer, blanc si mine (sur fond indigo)
    const iconColor = isMine ? Colors.white : meta.color;
    const iconBg = isMine ? 'rgba(255,255,255,0.2)' : `${meta.color}1A`; // 10% opacity hex

    return (
      <View key={attachment.id || index} style={styles.imageWrap}>
        <TouchableOpacity
          style={[styles.documentAttachment, { backgroundColor: isMine ? 'rgba(255,255,255,0.18)' : (isDark ? colors.gray100 : '#FFF') }]}
          onPress={() => { if (!isUploading && !isDownloading) downloadAndOpen(attachment); }}
          onLongPress={() => { if (!isUploading) showAttachmentMenu(attachment); }}
          delayLongPress={300}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={attachment.file_name || t('componentsMessages.documentFallback')}
          accessibilityHint={t('componentsMessages.documentTapHint')}
        >
          {/* Pastille colorée par type fichier */}
          <View style={[styles.documentIconWrap, { backgroundColor: iconBg }]}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : (
              <Ionicons name={meta.icon} size={18} color={iconColor} />
            )}
          </View>
          <View style={styles.documentTextWrap}>
            <Text
              style={[styles.documentName, { color: isMine ? Colors.white : peerTextColor }]}
              numberOfLines={1}
            >
              {attachment.file_name || t('componentsMessages.documentFallback')}
            </Text>
            {(subline.length > 0 || isDownloading) && (
              <Text
                style={[styles.documentSubline, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.gray500 }]}
                numberOfLines={1}
              >
                {isDownloading
                  ? t('componentsMessages.downloadProgress', { percent: Math.round(downloadProgress * 100) })
                  : subline}
              </Text>
            )}
            {/* Barre de progres pour fichiers > 1 MB */}
            {isDownloading && (attachment.file_size || 0) > 1024 * 1024 && (
              <View style={[styles.documentProgressTrack, { backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : colors.gray200 }]}>
                <View
                  style={[
                    styles.documentProgressFill,
                    {
                      backgroundColor: isMine ? Colors.white : meta.color,
                      width: `${Math.min(100, Math.max(0, downloadProgress * 100))}%`,
                    },
                  ]}
                />
              </View>
            )}
          </View>
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
        accessibilityLabel={t('componentsMessages.deletedA11y')}
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
              <Text style={[styles.deletedText, { color: colors.gray400 }]}>{t('componentsMessages.deletedMessage')}</Text>
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
          <Image source={avatar} style={styles.avatar} cachePolicy="memory-disk" transition={200} />
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
          <View style={styles.attachmentsContainer} accessibilityLabel={t('componentsMessages.attachmentA11y')}>
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
              accessibilityLabel={`${message.sender_name || t('componentsMessages.userFallback')}: ${message.content}`}
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
            <Text style={[styles.editedLabel, { color: colors.gray400 }]}>{t('componentsMessages.messageEdited')}</Text>
          )}
          <Text style={[styles.timeText, { color: colors.gray400 }]}>{formatMessageTime(message.created_at)}</Text>
          {status && (
            <View style={styles.statusIcon}>
              <MessageStatusIcon status={status} />
            </View>
          )}
        </View>

        {/* Fullscreen image viewer (carousel + zoom + swipe). Mounte uniquement
            quand visible pour eviter l'overhead Modal en arriere-plan. */}
        {imageSources.length > 0 && imageViewerOpen && (
          <ImageView
            images={imageSources}
            imageIndex={imageViewerIndex}
            visible={imageViewerOpen}
            onRequestClose={() => setImageViewerOpen(false)}
            swipeToCloseEnabled
            doubleTapToZoomEnabled
            HeaderComponent={({ imageIndex }) =>
              imageSources.length > 1 ? (
                <View style={styles.imageViewerHeader} pointerEvents="none">
                  <Text style={styles.imageViewerCounter}>
                    {imageIndex + 1} / {imageSources.length}
                  </Text>
                </View>
              ) : null
            }
            FooterComponent={({ imageIndex }) => {
              const att = imageAttachments[imageIndex];
              if (!att) return null;
              return (
                <View style={styles.imageViewerFooter}>
                  <TouchableOpacity
                    style={styles.imageViewerAction}
                    onPress={() => downloadAndOpen(att)}
                    accessibilityRole="button"
                    accessibilityLabel={t('componentsMessages.attachmentMenuShare')}
                  >
                    <Ionicons name="share-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}

        {/* Sheet d'actions sur une pièce jointe — remplace l'Alert natif. */}
        <EventActionsSheet
          visible={!!attachSheetTarget}
          onClose={() => setAttachSheetTarget(null)}
          title={attachSheetTarget?.file_name || t('componentsMessages.attachmentMenuTitle')}
          subtitle={formatFileSize(attachSheetTarget?.file_size) || undefined}
          sections={[{ actions: attachSheetActions }]}
        />
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
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    minWidth: 220,
    maxWidth: 280,
  },
  documentAttachmentMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  documentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  documentName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.gray700,
  },
  documentNameMine: {
    color: Colors.white,
  },
  documentSubline: {
    fontSize: 11,
    marginTop: 2,
    color: Colors.gray500,
    letterSpacing: 0.2,
  },
  documentProgressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  documentProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Image viewer fullscreen
  imageViewerHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  imageViewerCounter: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageViewerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  imageViewerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
