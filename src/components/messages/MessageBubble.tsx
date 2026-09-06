/**
 * Composant MessageBubble optimise avec memo
 * Affiche une bulle de message avec contenu, attachments, reactions
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ImageView from 'react-native-image-viewing';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
// expo-file-system v19+ a deplace l'API classique vers /legacy. Le module
// principal exporte la nouvelle API File/Directory class-based qui n'a pas
// `cacheDirectory` au top-level.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
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
import { useNetworkSpeed } from '../../hooks/useNetworkSpeed';
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
/**
 * Decide si un fichier peut etre rendu inline par un browser in-app.
 * Si oui → WebBrowser.openBrowserAsync (preview sans quitter l'app).
 * Si non → fallback Sharing.shareAsync (app dediee : Word, Excel, etc.).
 *
 * Heuristique sur le MIME type ET l'extension (le MIME peut etre absent
 * sur un upload mobile). Volontairement conservateur : on prefere envoyer
 * vers Sharing pour les formats ambigus.
 */
function isBrowserFriendly(filename?: string, mimeType?: string): boolean {
  const ext = getFileExtension(filename);
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  if (mime.startsWith('video/')) return true;
  if (mime.startsWith('audio/')) return true;
  if (mime.startsWith('text/')) return true;
  if (mime === 'application/pdf') return true;
  if (mime === 'application/json' || mime === 'application/xml') return true;
  // Fallback sur l'extension si pas de MIME
  if (!mime) {
    const browserFriendly = [
      'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp',
      'mp4', 'webm', 'mov',
      'mp3', 'wav', 'ogg', 'm4a',
      'txt', 'md', 'log', 'json', 'xml', 'csv', 'html', 'htm',
    ];
    if (browserFriendly.includes(ext)) return true;
  }
  return false;
}

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
  /** Sous-ensemble des uploads jugés lents (> 5s). Overlay affiche un message
      "Connexion lente" pour rassurer l'user que l'envoi est encore en cours. */
  slowUploadAttachmentIds?: Set<string>;
  onLongPress: (message: Message) => void;
  /** Renvoi d'un message en échec (bulle rouge). Tap direct sur « Réessayer »
      sous la bulle — sans passer par la modale (découvrabilité). */
  onRetry?: (message: Message) => void;
  onPlayVoice?: (
    uri: string,
    messageId: string,
    attachmentId?: string,
    startOffsetMs?: number,
    endOffsetMs?: number,
  ) => void;
  /** Seek a une position 0..1 dans le voice en cours de lecture (meme message
      uniquement — sinon, lance la lecture). */
  onSeekVoice?: (messageId: string, ratio: number) => void;
  /** Saute 15s en avant sur le voice en cours (affiche si duration > 60s). */
  onSkipForward?: () => void;
  /** Long-press sur le play : cycle 1× → 1.5× → 2×. */
  onCyclePlaybackRate?: () => void;
  /** Vitesse courante. Affichee comme badge sur le voice en cours. */
  playbackRate?: number;
  /** Set des message ids de voice deja ecoutes (jusqu'a la fin). Pour
      l'indicateur visuel "ecoute". */
  listenedVoiceIds?: Set<string>;
  /** Forward — appele depuis le menu attachment, reuse le flow message-level
      du parent (qui ouvre le modal de selection de conversation). */
  onForward?: (message: Message) => void;
  /** Callback declenche quand l'user tap le reply preview pour scroller au
      message original. Le parent (ConversationScreen) doit lookup l'index
      du message dans state.messages et appeler flatListRef.scrollToIndex. */
  onReplyPress?: (originalMessageId: number | string) => void;
  /** Swipe horizontal sur la bulle → répondre à CE message (réflexe
      WhatsApp/Telegram). Le parent ouvre le pill de réponse. */
  onSwipeReply?: (message: Message) => void;
  /** Double-tap sur la bulle → réaction rapide (❤️). Réflexe Instagram/iMessage. */
  onQuickReact?: (message: Message) => void;
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
  /** Optionnel : tap-to-seek sur la waveform. Recoit un ratio 0..1. */
  onSeek?: (ratio: number) => void;
  /** Long-press sur le bouton play : cycle de vitesse 1× → 1.5× → 2×. */
  onLongPressPlay?: () => void;
  /** Tap "+15s" — visible uniquement quand isCurrent && duration > 60s. */
  onSkipForward?: () => void;
  /** Vitesse courante : affichee comme badge sur le voice en cours. */
  rate?: number;
  /** Vrai si l'utilisateur a deja ecoute ce voice. */
  listened?: boolean;
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
  onSeek,
  onLongPressPlay,
  onSkipForward,
  rate = 1.0,
  listened = false,
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

  // Tap-to-seek : on capture la largeur de la waveform via onLayout puis on
  // convertit locationX -> ratio. Le tap "play/pause" reste sur l'icone.
  const waveformWidthRef = useRef(0);
  const handleWaveformPress = useCallback(
    (e: any) => {
      if (!onSeek) return;
      const width = waveformWidthRef.current;
      if (!width) return;
      const x = e?.nativeEvent?.locationX ?? 0;
      const ratio = Math.max(0, Math.min(1, x / width));
      onSeek(ratio);
    },
    [onSeek],
  );

  // #10 Skip button visible quand le voice est en cours de lecture (isCurrent
  // = progressRatio > 0 ou isPlaying) ET la duree > 60s.
  const showSkip = !!onSkipForward && totalSeconds > 60 && (isPlaying || progressRatio > 0);
  // Badge rate : visible uniquement quand on est en cours de lecture, et != 1.0
  const showRate = isPlaying && rate !== 1.0;

  return (
    <View
      style={[styles.voiceAttachment, { backgroundColor: bg }]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? t('componentsMessages.voicePause') : t('componentsMessages.voicePlay')}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPressPlay}
        delayLongPress={400}
        activeOpacity={0.7}
        style={styles.voiceIconWrap}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={fgIcon} />
        ) : (
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={fgIcon} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.waveformContainer}
        activeOpacity={0.85}
        onPress={onSeek ? handleWaveformPress : onPress}
        onLayout={(e) => { waveformWidthRef.current = e.nativeEvent.layout.width; }}
        accessibilityLabel={t('componentsMessages.voiceSeek')}
      >
        {waveformHeights.map((h, i) => {
          const barRatio = (i + 0.5) / WAVEFORM_BARS;
          const active = barRatio <= progressRatio;
          return (
            <View
              key={i}
              pointerEvents="none"
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
      </TouchableOpacity>
      <View style={styles.voiceMetaCol}>
        <Text style={[styles.voiceDuration, { color: textColor }]}>
          {formatDuration(displayedSeconds)}
        </Text>
        {/* Dot "ecoute" : marque sous la duration */}
        {listened && !isPlaying && (
          <View style={[styles.voiceListenedDot, { backgroundColor: textColor, opacity: 0.5 }]} />
        )}
      </View>
      {/* +15s — discret, a droite du bloc duration */}
      {showSkip && (
        <TouchableOpacity
          onPress={onSkipForward}
          style={[styles.voiceSkipBtn, { borderColor: textColor }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel={t('componentsMessages.voiceSkip15')}
        >
          <Text style={[styles.voiceSkipText, { color: textColor }]}>+15</Text>
        </TouchableOpacity>
      )}
      {/* Badge "1.5×" / "2×" pendant la lecture */}
      {showRate && (
        <View style={[styles.voiceRateBadge, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
          <Text style={[styles.voiceRateText, { color: '#FFFFFF' }]}>
            {rate === 1.5 ? '1.5×' : `${rate}×`}
          </Text>
        </View>
      )}
    </View>
  );
});

// Rend un texte en segments, les URLs devenant cliquables (ouverture navigateur).
// N'utilise pas de HTML → pas de risque d'injection ; les segments texte
// restent auto-échappés par RN.
const _URL_REGEX = /(https?:\/\/[^\s]+)/gi;
function renderLinkified(text: string, linkColor: string): React.ReactNode {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  _URL_REGEX.lastIndex = 0;
  while ((m = _URL_REGEX.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    let url = m[0];
    let trailing = '';
    const tm = url.match(/[.,;:!?)\]]+$/);
    if (tm) { trailing = tm[0]; url = url.slice(0, url.length - trailing.length); }
    parts.push(
      <Text
        key={m.index}
        style={{ textDecorationLine: 'underline', color: linkColor }}
        onPress={() => Linking.openURL(url).catch(() => {})}
      >
        {url}
      </Text>,
    );
    if (trailing) parts.push(trailing);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function MessageBubble({
  message,
  isMine,
  isGrouped = false,
  replyToMessage,
  otherUserId,
  playingVoiceId,
  voicePlayback,
  uploadingAttachmentIds,
  slowUploadAttachmentIds,
  onLongPress,
  onRetry,
  onSeekVoice,
  onSkipForward,
  onCyclePlaybackRate,
  playbackRate = 1.0,
  listenedVoiceIds,
  onPlayVoice,
  onForward,
  onReplyPress,
  onSwipeReply,
  onQuickReact,
}: MessageBubbleProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { showError, showSuccess } = useAlert();
  const { isSlowCellular } = useNetworkSpeed();
  // Data-saver 3G : sur connexion lente, les images ne se chargent pas d'office
  // (data coûteuse) — on affiche le LQIP + « appuyer pour charger ». L'utilisateur
  // déclenche le plein format au tap. Les vocaux étaient déjà protégés, pas les
  // images (incohérence signalée à l'audit). Set des attachment ids chargés
  // manuellement.
  const [manuallyLoadedImages, setManuallyLoadedImages] = useState<Set<string>>(() => new Set());
  // Sheet d'actions sur une pièce jointe (Télécharger / Partager / Sauvegarder
  // dans la galerie / Forward / Copier le lien). Remplace l'Alert natif.
  const [attachSheetTarget, setAttachSheetTarget] = useState<any | null>(null);
  const avatar = getMessageAvatar(message);
  const initials = getMessageInitials(message);
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const status = isMine ? getMessageStatus(message, otherUserId) : undefined;
  const groupedReactions = groupReactions(message.reactions);

  // ── Gestes réflexes (swipe→répondre, double-tap→réagir) ──────────────────
  // Ce sont les deux gestes les plus musculaires d'une messagerie 2026 ; leur
  // absence faisait « swiper dans le vide » les utilisateurs habitués.
  const translateX = useSharedValue(0);
  const triggerSwipeReply = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onSwipeReply?.(message);
  }, [onSwipeReply, message]);
  const triggerQuickReact = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onQuickReact?.(message);
  }, [onQuickReact, message]);

  // Swipe horizontal (sens dépendant de l'expéditeur : on tire la bulle vers
  // le centre). Déclenche « répondre » passé un seuil, puis revient en place.
  const REPLY_THRESHOLD = 56;
  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(!!onSwipeReply)
    .activeOffsetX(isMine ? [-15, 9999] : [-9999, 15])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const dx = e.translationX;
      // On n'autorise le déplacement que dans le sens naturel (mine: gauche,
      // peer: droite) et on borne l'amplitude.
      const bounded = isMine ? Math.max(-80, Math.min(0, dx)) : Math.min(80, Math.max(0, dx));
      translateX.value = bounded;
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) >= REPLY_THRESHOLD) {
        runOnJS(triggerSwipeReply)();
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
    }), [isMine, onSwipeReply, triggerSwipeReply, translateX]);

  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .enabled(!!onQuickReact)
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd((_e, success) => {
      if (success) runOnJS(triggerQuickReact)();
    }), [onQuickReact, triggerQuickReact]);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, doubleTapGesture),
    [panGesture, doubleTapGesture],
  );

  const swipeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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

  // Strategie hybride pour ouvrir un attachment :
  //
  // 1. Si le fichier est browser-friendly (PDF, image, audio, video, texte) :
  //    → WebBrowser.openBrowserAsync(url) ouvre direct dans un browser in-app.
  //    L'user reste dans EventEz (swipe back pour revenir). Pas de DL local.
  //
  // 2. Sinon (Word, Excel, Zip, .apk, etc.) : DL local + Sharing.shareAsync.
  //    Ces formats necessitent une app dediee — on laisse le user choisir
  //    via le sheet "Partager avec…".
  //
  // Avant ce fix, on faisait toujours Sharing.shareAsync → label "Partager"
  // même pour un PDF, ce qui troublait l'utilisateur ("je ne veux pas
  // partager, je veux lire").
  const downloadAndOpen = useCallback(async (attachment: any) => {
    const url = typeof attachment.file === 'string' ? attachment.file : null;
    if (!url) {
      showError(t('componentsMessages.attachmentErrorTitle'), t('componentsMessages.attachmentInvalidUrl'));
      return;
    }

    // Cas du sender qui clique sur SON propre fichier avant que l'upload
    // ne soit termine : `attachment.file` est encore une URI locale
    // (file://...). On evite tout download (qui throw "Expected URL scheme
    // 'http' or 'https'") et on passe direct sur l'URI locale via
    // WebBrowser (pour les types friendly) ou Sharing.
    const isLocalUri = url.startsWith('file://') || url.startsWith('content://');

    // Voie #1 : preview inline dans un browser in-app pour les types lus
    // nativement par le navigateur. NB : sur Android, WebBrowser ne supporte
    // pas les file:// URIs — on skip cette voie pour le sender en cours
    // d'upload et on tombe sur Sharing direct.
    if (!isLocalUri && isBrowserFriendly(attachment.file_name, attachment.mime_type)) {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
          showTitle: true,
          enableBarCollapsing: true,
        });
        return;
      } catch (error: any) {
        if (__DEV__) console.warn('[Attachment] WebBrowser failed, fallback Sharing:', error);
        // Continue vers le fallback Sharing en cas d'echec (rare)
      }
    }

    // Cas local : pas besoin de DL, on Share directement l'URI locale.
    if (isLocalUri) {
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(url, {
            dialogTitle: attachment.file_name,
            mimeType: attachment.mime_type || undefined,
            UTI: attachment.mime_type || undefined,
          });
        } else {
          showError(t('componentsMessages.attachmentErrorTitle'), t('componentsMessages.sharingUnavailable'));
        }
      } catch (error: any) {
        if (__DEV__) console.error('[Attachment] local share failed:', error);
        showError(
          t('componentsMessages.attachmentErrorTitle'),
          error?.message || t('componentsMessages.attachmentDownloadFailed'),
        );
      }
      return;
    }

    // Voie #2 : DL local + Sharing pour les formats qui necessitent une
    // app dediee (Word, Excel, etc.) OU fallback si WebBrowser fail.
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

      // Ouverture via le sheet "Partager avec…" — l'user choisit l'app
      // (Word, Excel, Drive, etc.) ou "Sauvegarder dans Fichiers".
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
        // writeOnly: true → ne demande QUE l'accès en écriture (ajout à la
        // galerie), pas READ_MEDIA_IMAGES/VIDEO. Ces permissions de lecture
        // sont bloquées (conformité Play : usage ponctuel = photo picker).
        const perm = await MediaLibrary.requestPermissionsAsync(true);
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

  // Render Reply Preview — pattern WhatsApp : integre dans la bulle,
  // bg legerement plus fonce que la bulle parent, barre verticale coloree
  // a gauche, nom sender en couleur sur 1 ligne, preview riche selon le
  // type du message original (text / voice / image / document).
  // Tap pour scroller au message original (callback parente onReplyTap).
  const renderReplyPreview = () => {
    if (!replyToMessage) return null;
    const r: any = replyToMessage;

    // Couleurs : effet "imbrique" — plus fonce sur ma bulle (indigo), plus
    // gris clair chez le peer. La barre verticale prend l'accent.
    const innerBg = isMine
      ? 'rgba(0,0,0,0.18)'
      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)');
    const accentColor = isMine ? Colors.white : colors.primary;
    const nameColor = accentColor;
    const previewColor = isMine ? 'rgba(255,255,255,0.85)' : colors.gray600;

    // Preview du contenu original — text / voice / image / doc
    const firstType = r.first_attachment_type;
    let previewIcon: keyof typeof Ionicons.glyphMap | null = null;
    let previewText = r.content || '';
    if (r.is_deleted) {
      previewText = t('componentsMessages.replyDeleted', { defaultValue: 'Message supprimé' });
    } else if (firstType === 'voice') {
      previewIcon = 'mic';
      const dur = r.first_voice_duration;
      const durStr = dur
        ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`
        : '';
      previewText = `${t('componentsMessages.replyVoice', { defaultValue: 'Message vocal' })}${durStr ? ` · ${durStr}` : ''}`;
    } else if (firstType === 'image') {
      previewIcon = 'image';
      previewText = previewText || t('componentsMessages.replyImage', { defaultValue: 'Photo' });
    } else if (firstType === 'document') {
      previewIcon = 'document-attach';
      previewText = previewText || t('componentsMessages.replyDocument', { defaultValue: 'Document' });
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          // Callback parente : ConversationScreen scroll a l'index du msg
          // original via flatListRef.scrollToIndex. Si non wire, no-op.
          if (r.id != null && onReplyPress) onReplyPress(r.id);
        }}
        style={[
          styles.replyPreviewInside,
          { backgroundColor: innerBg, borderLeftColor: accentColor },
        ]}
      >
        {/* Thumbnail mini si reply contient une image */}
        {firstType === 'image' && r.first_image_thumb && (
          <Image
            source={{ uri: r.first_image_thumb }}
            style={styles.replyThumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
        <View style={styles.replyContentInside}>
          <Text
            style={[styles.replyNameInside, { color: nameColor }]}
            numberOfLines={1}
          >
            {r.sender_name || t('componentsMessages.userFallback')}
          </Text>
          <View style={styles.replyPreviewLine}>
            {previewIcon && (
              <Ionicons name={previewIcon} size={12} color={previewColor} style={{ marginRight: 4 }} />
            )}
            <Text
              style={[styles.replyTextInside, { color: previewColor }]}
              numberOfLines={1}
            >
              {previewText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Attachment
  const renderAttachment = (attachment: any, index: number) => {
    const isUploading = !!(attachment.id && uploadingAttachmentIds?.has(String(attachment.id)));
    // C. Si l'upload est jugé lent, on affiche un message rassurant en plus
    // du spinner — sinon l'user se demande si quelque chose se passe vraiment.
    const isSlow = isUploading && !!(attachment.id && slowUploadAttachmentIds?.has(String(attachment.id)));

    if (attachment.attachment_type === 'image') {
      // Index dans le tableau d'images (pour ouvrir le viewer au bon endroit)
      const imageIdx = imageAttachments.findIndex(a => a.id === attachment.id);
      // Style WhatsApp : image "full bleed" — arrondit pour suivre les
      // coins de la bulle parent. Si c'est la seule chose dans la bulle
      // (imageOnlyBubble cote parent), elle prend toute la place. Sinon
      // l'image garde des coins legerement arrondis et un petit margin.
      // Data-saver : sur 3G/2G, on ne charge PAS le plein format tant que
      // l'utilisateur n'a pas tapé « charger » (sauf image déjà en cache OU
      // en cours d'upload = locale). On affiche le LQIP + overlay.
      const attId = String(attachment.id || index);
      const gateImage = isSlowCellular && !isUploading && !manuallyLoadedImages.has(attId);
      return (
        <TouchableOpacity
          key={attachment.id || index}
          style={styles.imageWrapWhatsApp}
          activeOpacity={0.85}
          onPress={() => {
            if (isUploading) return;
            if (gateImage) {
              // 1er tap en 3G = charger l'image (pas ouvrir le viewer).
              setManuallyLoadedImages(prev => new Set(prev).add(attId));
              return;
            }
            openImageAt(imageIdx >= 0 ? imageIdx : 0);
          }}
          onLongPress={() => { if (!isUploading) onLongPress?.(message); }}
          delayLongPress={300}
          accessibilityRole="imagebutton"
          accessibilityLabel={
            gateImage
              ? t('conversation.tapToLoadImage', { defaultValue: 'Appuyer pour charger l’image' })
              : t('componentsMessages.imageAttachmentA11y')
          }
          accessibilityHint={t('componentsMessages.imageAttachmentHint')}
        >
          <Image
            // En mode gate, on ne fournit PAS `source` (plein format) → seul le
            // placeholder LQIP s'affiche, aucune data consommée.
            source={gateImage ? undefined : attachment.file}
            style={[styles.imageAttachmentWhatsApp, { backgroundColor: colors.gray100 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            placeholder={attachment.image_placeholder || undefined}
            placeholderContentFit="cover"
          />
          {gateImage && (
            <View style={styles.uploadOverlay}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors.white} />
              <Text style={styles.uploadSlowText}>
                {t('conversation.tapToLoadImage', { defaultValue: 'Appuyer pour charger' })}
              </Text>
            </View>
          )}
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color={Colors.white} />
              {isSlow && (
                <Text style={styles.uploadSlowText}>
                  {t('conversation.voiceUploadSlow')}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (attachment.attachment_type === 'voice') {
      // Style WhatsApp : la card voice est INTEGREE dans la bulle parent,
      // pas de bg propre — juste les controls (play btn + waveform + duration)
      // avec les couleurs adaptees au fond de la bulle.
      const voiceBg = 'transparent';
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
        // Pressable parent : intercepte le long-press → menu d'actions
        // message (reply/react/forward/delete). Le tap reste dispatche au
        // play button enfant qui a son propre TouchableOpacity.
        <Pressable
          key={attachment.id || index}
          style={styles.imageWrap}
          onLongPress={() => onLongPress?.(message)}
          delayLongPress={400}
        >
          <VoiceAttachment
            attachment={attachment}
            isPlaying={isPlaying}
            isLoading={isLoading}
            progressRatio={progressRatio}
            currentSeconds={currentSeconds}
            totalSeconds={totalSeconds}
            onPress={() => onPlayVoice?.(
              attachment.file,
              String(message.id),
              attachment.id != null ? String(attachment.id) : undefined,
              typeof attachment.start_offset_ms === 'number' ? attachment.start_offset_ms : undefined,
              typeof attachment.end_offset_ms === 'number' ? attachment.end_offset_ms : undefined,
            )}
            onSeek={isCurrent && onSeekVoice
              ? (ratio) => onSeekVoice(String(message.id), ratio)
              : undefined}
            onLongPressPlay={isCurrent ? onCyclePlaybackRate : undefined}
            onSkipForward={isCurrent ? onSkipForward : undefined}
            rate={isCurrent ? playbackRate : 1.0}
            listened={listenedVoiceIds?.has(String(message.id)) ?? false}
            bg={voiceBg}
            fgIcon={voiceFg}
            activeBar={activeBar}
            inactiveBar={inactiveBar}
            textColor={durationColor}
          />
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color={Colors.white} />
              {isSlow && (
                <Text style={styles.uploadSlowText}>
                  {t('conversation.voiceUploadSlow')}
                </Text>
              )}
            </View>
          )}
        </Pressable>
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
    // Style WhatsApp : le document est INTEGRE dans la bulle parent —
    // bg transparent + une separation subtile (border-top) si le doc est
    // au-dessus d'un autre element (gere via le rendu, ici on garde transparent).
    const docTileBg = 'transparent';

    return (
      <View key={attachment.id || index} style={styles.imageWrap}>
        <TouchableOpacity
          style={[styles.documentAttachment, { backgroundColor: docTileBg }]}
          onPress={() => { if (!isUploading && !isDownloading) downloadAndOpen(attachment); }}
          // Long-press = menu d'actions message (idem images / voice).
          onLongPress={() => { if (!isUploading) onLongPress?.(message); }}
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

  // Render Reactions — chips qui debordent legerement la bulle en bas
  // (pattern WhatsApp / Messenger). Tap pour toggle (TODO si on ajoute le
  // handler parent). Couleurs : bg blanc opaque + ombre subtile pour
  // qu'elles soient visibles sur n'importe quel fond (clair OU bulle).
  const renderReactions = () => {
    const entries = Object.entries(groupedReactions);
    if (entries.length === 0) return null;

    // Position : la chip "deborde" sur le bord inferieur de la bulle
    // (marginTop negatif). Cote droit si isMine, gauche sinon.
    return (
      <View style={[styles.reactionsContainer, isMine && styles.reactionsContainerMine]}>
        {entries.map(([emoji, count]) => (
          <View
            key={emoji}
            style={[
              styles.reactionBadge,
              {
                // Fond toujours opaque (jamais transparent) pour rester
                // lisible sur n'importe quel bg (canvas, bulle indigo, bulle
                // rose, image). En dark mode : card sombre + border claire.
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.08)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 1 && (
              <Text style={[styles.reactionCount, { color: isDark ? colors.gray300 : colors.gray700 }]}>
                {count}
              </Text>
            )}
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
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={swipeAnimStyle}>
        {/* Indice visuel de swipe→répondre : icône qui se révèle en tirant. */}
        {!!onSwipeReply && (
          <View
            pointerEvents="none"
            style={[styles.swipeReplyHint, isMine ? styles.swipeReplyHintMine : styles.swipeReplyHintPeer]}
          >
            <Ionicons name="arrow-undo" size={16} color={colors.gray400} />
          </View>
        )}
        <TouchableOpacity
          style={[styles.messageRow, isMine && styles.messageRowMine, isGrouped && styles.messageRowGrouped]}
          onLongPress={handleLongPress}
          delayLongPress={300}
          activeOpacity={0.8}
          // A11Y : le long-press (seule voie vers Répondre/Réagir/Menu) est
          // INATTEIGNABLE au lecteur d'écran. On expose les actions via le rotor
          // VoiceOver/TalkBack (accessibilityActions) — sinon un aveugle ne peut
          // que LIRE les messages, sans jamais y répondre/réagir.
          accessibilityActions={[
            { name: 'reply', label: t('conversation.reply', { defaultValue: 'Répondre' }) },
            { name: 'react', label: t('conversation.react', { defaultValue: 'Réagir' }) },
            { name: 'more', label: t('common.more', { defaultValue: 'Plus d’actions' }) },
          ]}
          onAccessibilityAction={(e) => {
            const a = e.nativeEvent.actionName;
            if (a === 'reply') onSwipeReply?.(message);
            else if (a === 'react') onQuickReact?.(message);
            else handleLongPress();
          }}
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
        {/* === BULLE UNIFIEE (style WhatsApp) ===
            Reply preview + attachments + texte + timestamp TOUS dans la
            meme bulle. Image attachment "deborde" (full bleed) jusqu'aux
            bords arrondis. Voice/document utilisent le bg de la bulle. */}
        {(replyToMessage || hasAttachments || message.content) && (() => {
          const bubbleBg = isMine ? colors.primary : peerBubbleBg;
          // Image "full bleed" : si la bulle ne contient QUE des images
          // (pas de texte, pas de doc/voice), on enleve le padding et on
          // arrondit l'image elle-meme. Sinon padding standard partout.
          const imageOnlyBubble = hasAttachments
            && !message.content
            && !replyToMessage
            && (message.attachments || []).every(a => a.attachment_type === 'image');
          return (
            <View
              style={[
                styles.bubble,
                isMine
                  ? [styles.bubbleMine, { backgroundColor: bubbleBg }]
                  : [styles.bubbleOther, { backgroundColor: bubbleBg }],
                imageOnlyBubble && styles.bubbleNoPadding,
                // Min width quand la bulle contient une reply preview, sinon
                // un texte court ("ok") fait collapser la bulle a 30px et la
                // preview au-dessus est tronquee. WhatsApp impose ~200px min.
                replyToMessage && styles.bubbleWithReplyMinWidth,
              ]}
            >
              {/* Reply preview integre */}
              {renderReplyPreview()}

              {/* Attachments — voice/document utilisent le bg parent (bubbleBg),
                  image deborde si imageOnlyBubble. */}
              {hasAttachments && (
                <View
                  style={[
                    styles.attachmentsInsideBubble,
                    imageOnlyBubble && { marginBottom: 0 },
                  ]}
                  accessibilityLabel={t('componentsMessages.attachmentA11y')}
                >
                  {message.attachments?.map((att, i) => renderAttachment(att, i))}
                </View>
              )}

              {/* Text content (URLs cliquables) */}
              {message.content && (
                <Text
                  accessibilityRole="text"
                  accessibilityLabel={`${message.sender_name || t('componentsMessages.userFallback')}: ${message.content}`}
                  style={[styles.messageText, { color: isMine ? Colors.white : peerTextColor }]}
                >
                  {renderLinkified(message.content, isMine ? Colors.white : peerTextColor)}
                </Text>
              )}

              {/* Time + status integres dans la bulle, en bas-droite. Style
                  WhatsApp : superposes sur l'image si imageOnlyBubble, sinon
                  inline a la fin du texte. */}
              <View
                style={[
                  styles.timeRowInside,
                  imageOnlyBubble && styles.timeRowOverlay,
                ]}
              >
                {message.is_edited && (
                  <Text style={[
                    styles.editedLabel,
                    {
                      color: imageOnlyBubble
                        ? 'rgba(255,255,255,0.9)'
                        : (isMine ? 'rgba(255,255,255,0.7)' : colors.gray400),
                    },
                  ]}>
                    {t('componentsMessages.messageEdited')}
                  </Text>
                )}
                <Text style={[
                  styles.timeTextInside,
                  {
                    color: imageOnlyBubble
                      ? 'rgba(255,255,255,0.9)'
                      : (isMine ? 'rgba(255,255,255,0.7)' : colors.gray500),
                  },
                ]}>
                  {formatMessageTime(message.created_at)}
                </Text>
                {status && (
                  <View style={styles.statusIcon}>
                    <MessageStatusIcon status={status} />
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Échec d'envoi : bouton « Réessayer » DIRECTEMENT sous la bulle
            (sans passer par la modale) — les testeurs restaient bloqués devant
            un rond rouge sans savoir comment renvoyer. */}
        {status === 'failed' && onRetry && (
          <TouchableOpacity
            style={styles.retryRow}
            onPress={() => onRetry(message)}
            accessibilityRole="button"
            accessibilityLabel={t('conversation.retrySend', { defaultValue: 'Réessayer' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={13} color={colors.error} />
            <Text style={[styles.retryText, { color: colors.error }]}>
              {t('conversation.retrySend', { defaultValue: 'Réessayer' })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Reactions — restent OUT de la bulle (chips qui debordent en bas) */}
        {renderReactions()}

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
      </Animated.View>
    </GestureDetector>
  );
}

// Fonction de comparaison pour memo
function arePropsEqual(prevProps: MessageBubbleProps, nextProps: MessageBubbleProps): boolean {
  // voicePlayback : on ne re-render QUE si ce voicePlayback concerne CE message
  // (sinon les autres bulles re-render inutilement a chaque tick d'une autre
  // lecture). Si c'est nous, on track les transitions de progression.
  const msgIdStr = String(nextProps.message.id);
  const prevVP = prevProps.voicePlayback;
  const nextVP = nextProps.voicePlayback;
  const prevConcernsUs = prevVP?.messageId === msgIdStr;
  const nextConcernsUs = nextVP?.messageId === msgIdStr;
  // Le voicePlayback "concerne nous" change de presence ou de progression
  if (prevConcernsUs !== nextConcernsUs) return false;
  if (nextConcernsUs && (
    prevVP?.currentMs !== nextVP?.currentMs ||
    prevVP?.durationMs !== nextVP?.durationMs ||
    prevVP?.isLoading !== nextVP?.isLoading
  )) return false;

  // Track aussi le passage de "non ecoute" -> "ecoute" pour CE message.
  const isMyVoiceListenedNow = nextProps.listenedVoiceIds?.has(msgIdStr) ?? false;
  const isMyVoiceListenedBefore = prevProps.listenedVoiceIds?.has(msgIdStr) ?? false;
  if (isMyVoiceListenedNow !== isMyVoiceListenedBefore) return false;
  // playbackRate uniquement si on est le voice courant
  if (nextConcernsUs && prevProps.playbackRate !== nextProps.playbackRate) return false;
  // C. Track les transitions normal-upload -> slow-upload pour MES attachments
  const myAttIds = (nextProps.message.attachments || []).map((a: any) => String(a.id));
  const prevSlowMe = myAttIds.some((id) => prevProps.slowUploadAttachmentIds?.has(id));
  const nextSlowMe = myAttIds.some((id) => nextProps.slowUploadAttachmentIds?.has(id));
  if (prevSlowMe !== nextSlowMe) return false;

  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_edited === nextProps.message.is_edited &&
    prevProps.message.is_deleted === nextProps.message.is_deleted &&
    // is_failed : transition envoi→échec doit re-render (icône rouge + Réessayer).
    (prevProps.message as any).is_failed === (nextProps.message as any).is_failed &&
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
  bubbleNoPadding: {
    padding: 0,
    overflow: 'hidden', // image suit les coins arrondis de la bulle
  },
  bubbleWithReplyMinWidth: {
    // Pattern WhatsApp : meme avec un reply contenant un nom court +
    // un texte court ("ok"), la bulle doit avoir ~220px pour rester
    // lisible. Sinon le sender name + preview du reply est tronque a
    // 2-3 caracteres.
    minWidth: 220,
  },

  // === Reply preview integre (style WhatsApp) ===
  replyPreviewInside: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: 6,
    gap: 8,
  },
  replyThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  replyContentInside: {
    flex: 1,
    minWidth: 0,
  },
  replyNameInside: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    marginBottom: 2,
  },
  replyPreviewLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyTextInside: {
    fontSize: 12,
    flex: 1,
  },

  // === Attachments integres dans la bulle ===
  attachmentsInsideBubble: {
    marginBottom: 4,
    gap: 4,
  },
  imageWrapWhatsApp: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageAttachmentWhatsApp: {
    width: '100%',
    aspectRatio: 4 / 3,
    minHeight: 180,
    maxHeight: 260,
    borderRadius: 12,
  },

  // === Time row integre dans la bulle (style WhatsApp) ===
  timeRowInside: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeRowOverlay: {
    // Sur image only : positionner en absolu en bas-droite avec un fond
    // semi-transparent pour rester lisible.
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 0,
  },
  timeTextInside: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
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
    paddingHorizontal: 8,
    gap: 6,
  },
  uploadSlowText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
    letterSpacing: 0.2,
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
  voiceMetaCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  voiceListenedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  voiceSkipBtn: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceSkipText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
  },
  voiceRateBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  voiceRateText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
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

  // Reactions — chips qui debordent la bulle (style WhatsApp)
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // marginTop negatif : la chip chevauche legerement le bord inferieur
    // de la bulle, comme dans WhatsApp / Messenger.
    marginTop: -8,
    marginLeft: 8,
    gap: 4,
    zIndex: 1, // au-dessus de la bulle
  },
  reactionsContainerMine: {
    justifyContent: 'flex-end',
    marginLeft: 0,
    marginRight: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 2,
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
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 3,
    marginRight: 4,
  },
  swipeReplyHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    opacity: 0.6,
  },
  swipeReplyHintMine: {
    right: 8,
  },
  swipeReplyHintPeer: {
    left: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
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
