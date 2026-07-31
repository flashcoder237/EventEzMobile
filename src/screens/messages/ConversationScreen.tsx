/**
 * ConversationScreen - Écran de conversation refactorisé
 *
 * Améliorations:
 * - Utilise useMessageState pour centraliser l'état
 * - Composants mémorisés pour performance
 * - Pagination des messages
 * - Meilleure gestion des attachments (upload AVANT optimistic update)
 * - Typing indicator multi-utilisateurs animé
 * - Statut des messages à 3 états
 */

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Clipboard,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { messagesAPI, eventsAPI, connectionsAPI, getMediaUrl } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { UndoGate } from '../../utils/undoGate';
import { useTheme } from '../../contexts/ThemeContext';
import { useMessagingWebSocket } from '../../hooks/useMessagingWebSocket';
import { useMutedConversations } from '../../hooks/useMutedConversations';
import ImageView from 'react-native-image-viewing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMessageState, AttachedFile } from '../../hooks/useMessageState';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import type { QueuedMessage } from '../../lib/utils/messagingHelpers';
import { Message, RootStackParamList, User } from '../../types';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
  TOUCH_OPACITY,
  Shadows,
} from '../../constants/theme';
import { centeredContent } from '../../constants/layout';
import { ConversationSkeleton } from '../../components/ui/Skeleton';
import {
  MESSAGE_AVATAR_SIZE,
  formatMessageDate,
  shouldShowDateSeparator,
  isMyMessage,
  getReplyToContent,
  TYPING_SEND_INTERVAL,
} from '../../lib/utils/messagingHelpers';

// Composants
import {
  MessageBubble,
  TypingIndicator,
  MessageActionModal,
  ReportMessageModal,
  ReactionPickerModal,
  ForwardModal,
  InputToolbar,
  ConversationQuotaBanner,
  GroupAdminPanel,
  MessageActionType,
  ReportReason,
  QuotaState,
} from '../../components/messages';
import EventActionsSheet, {
  EventActionSection,
  EventAction,
} from '../../components/organizer/EventActionsSheet';
import CacheService from '../../services/CacheService';
import { useVoicePrefetch, getCachedVoiceUri, registerSentVoice, getSentVoiceUri } from '../../hooks/useVoicePrefetch';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// TTL court : 30s. Une conversation active bouge vite, on revalide
// rapidement en bg pour rester aligne sur les nouveaux messages que le
// WebSocket aurait pu manquer (deconnexion bref, app en arriere-plan).
const MESSAGES_CACHE_TTL_MS = 30_000;

const messagesCacheKey = (conversationId: string | number, userId: string | number | undefined) =>
  `msgs:conv:${conversationId}:${userId ?? 'anon'}`;
type ConversationRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

/** Format un nombre d'octets en chaîne lisible (KB / MB / GB). Hors composant
 *  pour éviter une recréation à chaque render — utilisé par la galerie média. */
function formatFileSizeForGallery(bytes?: number): string {
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

export default function ConversationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConversationRouteProp>();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  // Sur iPad, plafonner la colonne de chat (messages + composer) pour éviter des
  // bulles étirées bord-à-bord.
  const chatMaxWidth = winW >= 700 ? 640 : undefined;
  const { conversationId: initialConversationId, userId, userName } = route.params;
  const { user } = useAuth();
  const { showError, showSuccess, showConfirm, showAlert } = useAlert();
  const { isMuted: isConvMuted, toggle: toggleConvMute } = useMutedConversations();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

  // State centralisé
  const { state, actions } = useMessageState(initialConversationId, userName);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const lastTypingSentRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // #9 FFT live : on enrichit le preset HIGH_QUALITY avec isMeteringEnabled
  // pour que `useAudioRecorderState(recorder).metering` expose le niveau audio
  // (~30 fps) — utilise pour animer la waveform du recording UI en temps reel.
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  // Poll a ~50ms — assez pour des bars qui suivent la voix sans surcharger.
  const recorderState = useAudioRecorderState(recorder, 50);
  const playerRef = useRef<AudioPlayer | null>(null);
  // Track quel messageId est actuellement chargé dans playerRef. Permet de
  // distinguer "toggle pause/play sur le même" de "lancer un nouveau message".
  const currentPlayerMsgIdRef = useRef<string | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fallback timeout pour forcer la sortie de l'etat "loading" du voice player
  // si aucun status callback n'est arrive (certains backends streamant lentement).
  const loadingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hard timeout : kill le player s'il n'a toujours pas de duration apres 6s.
  // Cas typique : tap play sur son propre voice juste apres l'envoi, alors
  // que le fichier n'est pas encore servi par le backend (404/buffer infini).
  const voiceHardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = React.useState('');
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);

  // Feature: voice preview before send
  const [pendingVoiceUri, setPendingVoiceUri] = useState<string | null>(null);
  const [pendingVoiceDuration, setPendingVoiceDuration] = useState<number>(0);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const previewPlayerRef = useRef<AudioPlayer | null>(null);
  // A. Detection du silence en debut d'enregistrement : on track la date du
  // premier sample > seuil. Le delta est ensuite stocke comme silence skipper
  // a appliquer au playback (start_offset_ms). Si on n'a jamais depasse le
  // seuil, on garde 0 (probablement un voice tres bas ou un enregistrement
  // sans son — on ne risque pas de trimmer du contenu reel).
  const SILENCE_DB_THRESHOLD = -45;
  const recordingStartedAtRef = useRef<number | null>(null);
  const firstSoundAtRef = useRef<number | null>(null);
  // L'offset de demarrage (ms) calcule au stop, persiste sur le voice envoye
  // pour que la lecture skip le silence d'ouverture.
  const [pendingVoiceStartOffsetMs, setPendingVoiceStartOffsetMs] = useState<number>(0);

  // Feature: message search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Feature: report message modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetMessage, setReportTargetMessage] = useState<Message | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  // État de lecture audio (un seul audio joué à la fois). Mis à jour via le
  // listener playbackStatusUpdate du player. null = aucune lecture en cours.
  const [voicePlayback, setVoicePlayback] = React.useState<{
    messageId: string;
    currentMs: number;
    durationMs: number;
    isLoading: boolean;
  } | null>(null);
  // Vitesse de lecture courante (1.0 / 1.5 / 2.0). Long-press sur le bouton
  // play du voice cycle entre ces valeurs. Appliquee au player en cours via
  // player.setPlaybackRate / player.playbackRate.
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const PLAYBACK_RATES = [1.0, 1.5, 2.0];
  // Set des message ids dont le voice a ete ecoute jusqu'au bout. Stocke en
  // AsyncStorage par conversation. Sert a afficher un indicateur visuel
  // "ecoute" different du simple "recu" — un voice ouvert mais pas lu reste
  // "non ecoute".
  const [listenedVoiceIds, setListenedVoiceIds] = useState<Set<string>>(new Set());
  // #5 Recording locked : l'user a tape "lock" pendant l'enregistrement, il
  // peut maintenant scroller, ouvrir la galerie, etc. sans interrompre.
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  // Message en attente d'envoi reel (undo possible pendant N secondes apres
  // tap "Envoyer"). On affiche une snackbar avec "Annuler". Apres expiration
  // du delai, on commit l'envoi reel via WS/REST.
  const UNDO_SEND_DELAY_MS = 5000;
  const [pendingUndoMessage, setPendingUndoMessage] = useState<{
    tempId: string;
    expiresAt: number;
  } | null>(null);
  const undoSnackbarAnim = useRef(new Animated.Value(0)).current;
  // Set des attachment ids en cours d'upload : permet à MessageBubble
  // d'afficher un overlay de chargement sur le tempMessage avant que l'upload
  // ne se termine.
  const [uploadingIds, setUploadingIds] = React.useState<Set<string>>(new Set());
  // C. Track quand chaque upload a commence, pour basculer l'overlay vers
  // "Connexion lente" si ca depasse SLOW_UPLOAD_THRESHOLD_MS. Sans ca, l'user
  // se demande "mon voice part vraiment ?" sans aucun feedback.
  const SLOW_UPLOAD_THRESHOLD_MS = 5000;
  const uploadStartTimesRef = useRef<Map<string, number>>(new Map());
  const [slowUploadIds, setSlowUploadIds] = useState<Set<string>>(new Set());

  // WebSocket
  const {
    isConnected,
    isAuthenticated,
    connectionError: wsConnectionError,
    reconnect: wsReconnect,
    sendMessage: wsSendMessage,
    editMessage: wsEditMessage,
    deleteMessage: wsDeleteMessage,
    startTyping,
    stopTyping,
    addReaction: wsAddReaction,
    removeReaction: wsRemoveReaction,
    getTypingUsersForConversation,
  } = useMessagingWebSocket({
    onNewMessage: (newMessage) => {
      // Compat snake_case (WS consumer expose 'conversation_id') / flat (REST 'conversation')
      const incomingConvId = String((newMessage as any).conversation_id ?? newMessage.conversation);
      if (incomingConvId === String(state.conversationId)) {
        actions.addMessage(newMessage);
        // FlatList inversé affiche automatiquement les nouveaux messages en bas (index 0)
      }
    },
    onMessageSent: ({ clientTempId, message }) => {
      // Réconciliation optimiste : on remplace la bulle temp (client_temp_id)
      // par le message serveur, au lieu d'en afficher un doublon avec l'echo.
      if (clientTempId != null) {
        actions.updateMessage(String(clientTempId), message);
      } else {
        const incomingConvId = String((message as any).conversation_id ?? message.conversation);
        if (incomingConvId === String(state.conversationId)) {
          actions.addMessage(message);
        }
      }
    },
    onTypingIndicator: (data) => {
      if (String(data.conversationId) === String(state.conversationId)) {
        if (data.isTyping) {
          actions.addTypingUser(data.userName);
        } else {
          actions.removeTypingUser(data.userName);
        }
      }
    },
    onMessageRead: (data) => {
      actions.markMessageRead(String(data.messageId), String(data.userId));
    },
    onReactionAdded: (data) => {
      actions.addReaction(String(data.messageId), data.emoji, String(data.userId));
    },
    onReactionRemoved: (data) => {
      actions.removeReaction(String(data.messageId), data.emoji, String(data.userId));
    },
    onMessageUpdated: (data) => {
      actions.updateMessage(String(data.messageId), {
        content: data.content,
        is_edited: true,
        edited_at: data.editedAt,
      });
    },
    onMessageDeleted: (data) => {
      actions.updateMessage(String(data.messageId), {
        is_deleted: true,
        content: '',
        attachments: [],
      });
    },
    onServerError: (code, message) => {
      if (code === 'rate_limited') {
        showError(t('conversation.rateLimitedTitle'), t('conversation.rateLimitedMessage'));
      } else if (code === 'blocked') {
        showError(t('conversation.blockedMsgTitle'), t('conversation.blockedMsgMessage'));
      } else if (code === 'quota_exceeded') {
        showError(t('conversation.quotaExceededTitle'), t('conversation.quotaExceededMessage'));
      } else if (code === 'posting_mode_restricted') {
        showError(t('conversation.postingRestrictedTitle'), t('conversation.postingRestrictedMessage'));
      }
    },
    onRequestStatusChanged: ({ conversationId, requestStatus }) => {
      // Anti-spam DM : la conv courante a ete acceptee/refusee par l'autre.
      // Mettre a jour le local pour masquer/afficher le banner et l'input.
      if (String(conversationId) !== String(state.conversationId)) return;
      setConversationDetails((prev: any) => prev ? {
        ...prev,
        request_status: requestStatus,
        is_read_only: requestStatus === 'declined' ? true : prev.is_read_only,
      } : prev);
    },
  });

  // Typing users for current conversation
  const typingUsers = useMemo(() => {
    if (!state.conversationId) return [];
    const users = getTypingUsersForConversation(state.conversationId);
    return users.map(u => u.userName);
  }, [state.conversationId, getTypingUsersForConversation]);

  // Offline queue : persiste les messages envoyés hors connexion (AsyncStorage
  // scopé par userId) et les rejoue dès que la connexion revient. Le banner
  // "X message(s) en attente" s'affiche au-dessus de l'InputToolbar quand
  // queue.length > 0.
  const offlineQueue = useOfflineQueue({
    isConnected,
    userId: user?.id,
    onSendMessage: useCallback(async (queued: QueuedMessage): Promise<boolean> => {
      try {
        const response = await messagesAPI.sendMessage({
          conversation: queued.conversationId,
          content: queued.content,
          reply_to: queued.replyTo,
          attachment_ids: queued.attachments?.length ? queued.attachments : undefined,
        });
        // Replace any temp message in current view if applicable
        if (String(queued.conversationId) === String(state.conversationId) && response.data) {
          actions.addMessage(response.data);
        }
        return true;
      } catch {
        return false;
      }
    }, [state.conversationId, actions]),
    onMessageFailed: useCallback((queued: QueuedMessage) => {
      showError(
        t('conversation.notSentTitle'),
        t('conversation.notSentMessage'),
      );
    }, [showError, t]),
  });

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (state.conversationId) {
      fetchMessages();
      fetchConversationDetails();
      markAsRead();

      // Polling fallback si WebSocket déconnecté
      const interval = setInterval(() => {
        if (!isConnected) {
          fetchMessages();
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (state.conversationId) {
          stopTyping(state.conversationId);
        }
      };
    } else if (userName) {
      actions.setConversationTitle(userName);
      setupNewConversationHeader();
      actions.setLoading(false);
    }
  }, [state.conversationId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.remove(); } catch { /* noop */ }
        playerRef.current = null;
      }
      if (previewPlayerRef.current) {
        try { previewPlayerRef.current.remove(); } catch { /* noop */ }
        previewPlayerRef.current = null;
      }
      currentPlayerMsgIdRef.current = null;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (loadingFallbackRef.current) {
        clearTimeout(loadingFallbackRef.current);
        loadingFallbackRef.current = null;
      }
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
    };
  }, []);

  // Restore draft on mount — avec TTL 24h pour eviter de remonter un brouillon
  // oublie depuis 3 jours quand l'user revient. Format stocke : "<timestamp>|<text>".
  // Fallback retro-compat : si pas de "|", on traite comme du legacy plain text.
  useEffect(() => {
    const convId = state.conversationId;
    if (!convId) return;
    const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
    AsyncStorage.getItem(`draft:${convId}`)
      .then(raw => {
        if (!raw) return;
        const sepIdx = raw.indexOf('|');
        if (sepIdx > 0) {
          const ts = Number(raw.slice(0, sepIdx));
          const text = raw.slice(sepIdx + 1);
          if (Number.isFinite(ts) && Date.now() - ts < DRAFT_TTL_MS && text) {
            actions.setNewMessage(text);
          } else {
            // Brouillon expire — on nettoie pour ne pas le refaire apparaitre
            AsyncStorage.removeItem(`draft:${convId}`).catch(() => {});
          }
        } else {
          // Legacy (sans timestamp) : restaure mais re-sauvegarde avec ts pour
          // que la prochaine fois le TTL s'applique
          actions.setNewMessage(raw);
          AsyncStorage.setItem(`draft:${convId}`, `${Date.now()}|${raw}`).catch(() => {});
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.conversationId]);

  // Restore "voices ecoutes" set on conversation change.
  useEffect(() => {
    const convId = state.conversationId;
    if (!convId) return;
    AsyncStorage.getItem(`voice_listened:${convId}`)
      .then(raw => {
        if (!raw) return;
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setListenedVoiceIds(new Set(arr.map(String)));
        } catch { /* ignore */ }
      })
      .catch(() => {});
  }, [state.conversationId]);

  // Auto-pause : on coupe la lecture quand l'ecran perd focus (navigation
  // vers un autre ecran). #7 : on N'AUTO-PAUSE PAS quand l'app passe en
  // background — la lecture continue (pattern podcast). Le mode audio est
  // configure en consequence dans le startup hook plus bas.
  const pauseCurrentVoice = useCallback(() => {
    const player: any = playerRef.current;
    if (player && state.playingVoiceId) {
      try { player.pause(); } catch { /* noop */ }
      actions.setPlayingVoice(null);
      // #6 Persiste la position au pause par perte de focus
      if (voicePlayback?.messageId) {
        const convId = state.conversationId;
        if (convId && voicePlayback.currentMs > 1000) {
          AsyncStorage.setItem(
            `voice_pos:${convId}:${voicePlayback.messageId}`,
            String(voicePlayback.currentMs),
          ).catch(() => {});
        }
      }
    }
  }, [state.playingVoiceId, state.conversationId, voicePlayback, actions]);

  useEffect(() => {
    const unsubBlur = navigation.addListener('blur', pauseCurrentVoice);
    return unsubBlur;
  }, [navigation, pauseCurrentVoice]);

  // Pre-fetch automatique des voice messages : telecharge en arriere-plan
  // les .m4a/.mp3/.opus de tous les voices de la conv, pour que le tap
  // play soit instantane (pas de spinner reseau). Skip si offline / 2G.
  useVoicePrefetch(state.messages);

  // Sync state.messages -> CacheService. Toute mutation locale (nouveau
  // msg WS, edit, delete, optimistic send) passe par le reducer. Au
  // prochain mount sur la meme conv, le cache contient l'etat a jour.
  // Debounce 500ms : evite de re-ecrire le cache 10x en 1s pendant un
  // burst de messages.
  useEffect(() => {
    if (!state.conversationId || state.messages.length === 0) return;
    const timer = setTimeout(() => {
      CacheService.set(
        messagesCacheKey(state.conversationId!, user?.id),
        {
          messages: state.messages,
          hasMore: state.hasMore,
          nextPageUrl: state.nextPageUrl,
        },
        MESSAGES_CACHE_TTL_MS,
      ).catch(() => { /* silent */ });
    }, 500);
    return () => clearTimeout(timer);
  }, [state.messages, state.conversationId, state.hasMore, state.nextPageUrl, user?.id]);

  // #7 Configure le mode audio au mount pour permettre la lecture en
  // background (silent mode iOS + interruption sane defaults). N'a effet
  // que si l'app.json declare aussi UIBackgroundModes:["audio"] cote iOS,
  // sinon iOS coupe la lecture quand on quitte l'app — non bloquant ici.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => { /* ignore — mode optionnel */ });
  }, []);

  // C. Tick toutes les 1s pendant qu'au moins un upload est en cours pour
  // basculer les uploads "vieux" dans slowUploadIds. Auto-stop quand plus rien
  // a uploader pour eviter de cycler en idle.
  useEffect(() => {
    if (uploadingIds.size === 0) {
      if (slowUploadIds.size > 0) setSlowUploadIds(new Set());
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      let needsUpdate = false;
      const newSlow = new Set(slowUploadIds);
      uploadingIds.forEach((id) => {
        const startedAt = uploadStartTimesRef.current.get(id);
        if (startedAt && now - startedAt >= SLOW_UPLOAD_THRESHOLD_MS && !newSlow.has(id)) {
          newSlow.add(id);
          needsUpdate = true;
        }
      });
      if (needsUpdate) setSlowUploadIds(newSlow);
    }, 1000);
    return () => clearInterval(interval);
  }, [uploadingIds, slowUploadIds]);

  // A. Track du premier son pendant l'enregistrement. On detecte le moment
  // ou le metering depasse le seuil pour la 1ere fois et on enregistre le
  // timestamp. C'est appele a chaque tick du metering tant qu'on enregistre.
  useEffect(() => {
    if (!state.isRecording) return;
    const level = recorderState?.metering;
    if (typeof level !== 'number') return;
    if (firstSoundAtRef.current !== null) return; // deja detecte
    if (level > SILENCE_DB_THRESHOLD) {
      firstSoundAtRef.current = Date.now();
    }
  }, [state.isRecording, recorderState?.metering]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchMessages = async (loadMore = false) => {
    if (!state.conversationId) {
      actions.setLoading(false);
      return;
    }

    if (loadMore) {
      if (!state.hasMore || state.loadingMore) return;
      actions.setLoadingMore(true);
    } else {
      // Stale-while-revalidate sur le fetch initial : on sert le cache
      // immediatement si dispo, puis on refresh en arriere-plan. Evite
      // de re-charger 20 messages depuis le reseau a chaque retour sur
      // la conv (typique : quitter pour repondre a une notif et revenir).
      const cacheKey = messagesCacheKey(state.conversationId, user?.id);
      try {
        const cached = await CacheService.get<{
          messages: any[];
          hasMore: boolean;
          nextPageUrl: string | null;
        }>(cacheKey);
        if (cached?.data) {
          actions.setMessages(cached.data.messages);
          actions.setHasMore(cached.data.hasMore);
          actions.setNextPageUrl(cached.data.nextPageUrl);
          actions.setLoading(false);
          setMessagesLoadError(null);
          // Cache frais → on saute le fetch reseau, on s'appuie sur le
          // WebSocket pour les diffs.
          if (!cached.isStale) return;
        }
      } catch {
        // CacheService HS → fallback sur fetch reseau standard
      }
    }

    try {
      const params: any = {
        conversation: state.conversationId,
      };

      if (loadMore && state.nextPageUrl) {
        // Extraire le numéro de page de l'URL (PageNumberPagination)
        const url = new URL(state.nextPageUrl, 'http://localhost');
        const page = url.searchParams.get('page');
        if (page) params.page = page;
      }

      const response = await messagesAPI.getMessages(params);
      const data = response.data;
      // API retourne les messages du plus récent au plus ancien (-created_at)
      // On les utilise directement pour le FlatList inversé (index 0 = plus récent = bas)
      const newMessages = data.results || data || [];

      if (loadMore) {
        actions.addMessagesBefore(newMessages);
      } else {
        actions.setMessages(newMessages);
        // Sync cache uniquement sur le fetch initial — le loadMore ajoute
        // l'historique pagine qui n'est pas la "page 1" qu'on veut au mount.
        try {
          await CacheService.set(
            messagesCacheKey(state.conversationId, user?.id),
            {
              messages: newMessages,
              hasMore: !!data.next,
              nextPageUrl: data.next || null,
            },
            MESSAGES_CACHE_TTL_MS,
          );
        } catch {
          // silent
        }
      }

      actions.setHasMore(!!data.next);
      actions.setNextPageUrl(data.next || null);
      setMessagesLoadError(null);
    } catch (error: any) {
      if (__DEV__) console.error('Erreur chargement messages:', error);
      // Surface uniquement l'erreur du fetch initial (loadMore=false). Pour
      // un load more on évite de bloquer l'UI — l'utilisateur a déjà des msgs
      // affichés et peut retenter via le scroll-up à nouveau.
      if (!loadMore && state.messages.length === 0) {
        setMessagesLoadError(
          error?.response?.data?.detail || error?.message || t('conversation.messagesLoadError'),
        );
      }
    } finally {
      actions.setLoading(false);
      actions.setLoadingMore(false);
    }
  };

  // Erreur de chargement des messages — affichée à la place du empty state
  // (conversation.noMessages) quand le fetch initial échoue. Permet retry.
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  // Type de conversation (direct / group / event) — alimente le banner quota.
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'event' | null>(null);
  // État quota / read-only utilisé pour bloquer l'envoi côté UI.
  const [quotaState, setQuotaState] = useState<QuotaState | null>(null);
  // Données détaillées de la conversation (pour le panel admin : participants, organizer)
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  // Modale d'administration du groupe (organizer uniquement)
  const [showGroupAdminPanel, setShowGroupAdminPanel] = useState(false);
  // Bottom sheet d'options de conversation (header •••). Remplace l'Alert
  // natif qui ne supportait pas les sections + icônes + thème custom.
  const [convOptionsSheetVisible, setConvOptionsSheetVisible] = useState(false);
  // Event source de la conversation (group/event conv liée à un Event). On le
  // fetch séparément car le serializer Conversation expose `event` comme
  // PrimaryKeyRelatedField (UUID seul) — pas le détail. Affiché en bannière
  // au-dessus des messages + en sous-titre du header.
  const [eventContext, setEventContext] = useState<{ id: string; slug?: string; title: string; banner?: string | null } | null>(null);
  // Modale détaillée des messages en échec (failed après 3 retries). Permet
  // retry/delete unitaire au lieu de la perte silencieuse précédente.
  const [failedMessagesModalVisible, setFailedMessagesModalVisible] = useState(false);
  // Modale liste des participants (visible par tous les membres, pas que
  // l'organizer). Le GroupAdminPanel reste réservé aux admins (actions
  // mute/posting mode) — ce modal lui est read-only.
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  // Modale galerie médias (Photos / Documents) — agrège tous les attachments
  // des messages déjà chargés. Pattern WhatsApp/Telegram.
  const [mediaGalleryVisible, setMediaGalleryVisible] = useState(false);
  const [mediaGalleryTab, setMediaGalleryTab] = useState<'photos' | 'documents'>('photos');
  const [mediaGalleryViewerIndex, setMediaGalleryViewerIndex] = useState<number | null>(null);

  const fetchConversationDetails = async () => {
    if (!state.conversationId) return;

    try {
      const response = await messagesAPI.getConversation(state.conversationId);
      const conversation = response.data;

      // Mémorise le type pour la gestion du banner et de la lecture seule
      const ctype: 'direct' | 'group' | 'event' = conversation.conversation_type || 'direct';
      setConversationType(ctype);
      // Stocke la conversation détaillée pour le panel admin (participants, event)
      setConversationDetails(conversation);

      // Si la conv est liée à un event, on récupère son titre + bannière pour
      // l'afficher en contexte (header subtitle + bannière cliquable). Fail
      // silencieusement — pas critique pour le chat lui-même.
      const eventId = conversation.event;
      if (eventId && typeof eventId === 'string') {
        eventsAPI.getEvent(eventId)
          .then(res => {
            const ev = res.data;
            if (ev?.id && ev?.title) {
              setEventContext({
                id: String(ev.id),
                slug: ev.slug,
                title: ev.title,
                banner: getMediaUrl(ev.banner_image || (ev as any).display_image),
              });
            }
          })
          .catch(() => {
            // Event supprimé / inaccessible — pas grave, on n'affiche pas le contexte.
          });
      } else {
        setEventContext(null);
      }

      const otherParticipant = conversation.participants?.find(
        (p: any) => p.id !== user?.id
      );

      const title = conversation.title ||
        conversation.name ||
        (otherParticipant?.first_name && otherParticipant?.last_name
          ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
          : otherParticipant?.email?.split('@')[0] || t('conversation.conversationFallback'));

      // getMediaUrl() résout les paths relatifs (`/media/...`) en URLs
      // absolues. Le backend renvoie maintenant des URLs absolues quand le
      // request est dispo, mais on garde le wrap par sécurité (cas WS qui
      // n'a pas de request, ancien backend, etc.).
      const rawAvatar = otherParticipant?.profile_picture || otherParticipant?.image || null;
      const avatar = getMediaUrl(rawAvatar);

      actions.setConversationTitle(title);
      actions.setOtherUser(avatar, otherParticipant?.id || null);

      setupHeader(title, avatar);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement details conversation:', error);
    }
  };

  const markAsRead = async () => {
    if (!state.conversationId) return;
    try {
      await messagesAPI.markConversationAsRead(state.conversationId);
    } catch (error) {
      if (__DEV__) console.error('Erreur marquage lu:', error);
    }
  };

  // ============================================
  // HEADER SETUP
  // ============================================

  const setupHeader = (title: string, avatar: string | null) => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          {avatar ? (
            <Image source={avatar} style={styles.headerAvatar} cachePolicy="memory-disk" transition={200} />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerAvatarText}>
                {title.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.headerTitleText, { color: colors.gray900 }]} numberOfLines={1}>{title}</Text>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerMenuButton}
          onPress={handleShowConversationOptions}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.gray700} />
        </TouchableOpacity>
      ),
    });
  };

  const setupNewConversationHeader = () => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerAvatarText}>
              {(userName || '').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.headerTitleText, { color: colors.gray900 }]} numberOfLines={1}>{userName}</Text>
        </View>
      ),
    });
  };

  // ============================================
  // CONVERSATION OPTIONS
  // ============================================

  const handleShowConversationOptions = () => {
    setConvOptionsSheetVisible(true);
  };

  // Construction des sections du bottom sheet d'options. Mémoizé pour ne pas
  // recalculer à chaque render (le sheet lit `convOptionsSections`).
  const convOptionsSections: EventActionSection[] = useMemo(() => {
    const isAdmin = !!quotaState?.is_organizer;
    const isGroup = conversationType && conversationType !== 'direct';
    const convId = state.conversationId;
    const muted = convId ? isConvMuted(convId) : false;
    const actions: EventAction[] = [];

    // Mute/Unmute — accessible peu importe le type de conv. Permet de couper
    // les notifs sans archiver. Auparavant uniquement accessible depuis le
    // long-press de la row dans l'inbox → friction notable.
    if (convId) {
      actions.push({
        label: muted ? t('conversation.unmuteAction') : t('conversation.muteAction'),
        icon: muted ? 'notifications-outline' : 'notifications-off-outline',
        description: muted ? t('conversation.unmuteActionDesc') : t('conversation.muteActionDesc'),
        onPress: () => toggleConvMute(convId),
      });
    }

    // Pin / Unpin — `conversation.is_starred` côté backend. La conv épinglée
    // remonte en tête de liste (cf. tri inbox). Pattern WhatsApp / iMessage.
    if (convId) {
      const isPinned = !!conversationDetails?.is_starred;
      actions.push({
        label: isPinned ? t('conversation.unpinAction') : t('conversation.pinAction'),
        icon: isPinned ? 'pin' : 'pin-outline',
        description: isPinned ? t('conversation.unpinActionDesc') : t('conversation.pinActionDesc'),
        onPress: async () => {
          // Optimiste : flip local immédiat, rollback si l'API échoue.
          const previous = isPinned;
          setConversationDetails((prev: any) => prev ? { ...prev, is_starred: !previous } : prev);
          try {
            await messagesAPI.starConversation(convId);
          } catch {
            setConversationDetails((prev: any) => prev ? { ...prev, is_starred: previous } : prev);
            showError(t('common.error'), t('conversation.pinError'));
          }
        },
      });
    }

    // Voir les participants — accessible à tous les membres d'un groupe/event,
    // pas que les admins (le GroupAdminPanel reste réservé aux admins pour les
    // actions de modération). Avant, les membres réguliers n'avaient aucun
    // moyen de voir qui était dans le groupe.
    if (isGroup) {
      const count = conversationDetails?.participants?.length || 0;
      actions.push({
        label: t('conversation.viewParticipants'),
        icon: 'people-circle-outline',
        description: count > 0 ? t('conversation.viewParticipantsCount', { count }) : undefined,
        onPress: () => setParticipantsModalVisible(true),
      });
    }

    // Galerie médias — accessible à tous les types de conv. Affiche les
    // attachments groupés par type (photos / documents). Filtré client-side
    // sur state.messages — donc limité aux messages déjà fetched (pas tout
    // l'historique). Pour aller plus loin il faudrait un endpoint dédié.
    actions.push({
      label: t('conversation.viewMedia'),
      icon: 'images-outline',
      onPress: () => {
        setMediaGalleryTab('photos');
        setMediaGalleryVisible(true);
      },
    });
    if (isGroup && isAdmin) {
      actions.push({
        label: t('conversation.manageGroup'),
        icon: 'settings-outline',
        onPress: () => setShowGroupAdminPanel(true),
      });
    }
    if (!isGroup) {
      actions.push({
        label: t('conversation.blockUserOption'),
        icon: 'ban-outline',
        style: 'destructive',
        onPress: () => handleBlockUser(),
      });
    }
    return actions.length > 0 ? [{ actions }] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationType, quotaState?.is_organizer, state.conversationId, isConvMuted, conversationDetails?.participants?.length, t]);

  const handleBlockUser = () => {
    if (!state.otherUserId) return;
    showConfirm(
      t('conversation.blockUserTitle'),
      t('conversation.blockUserConfirm', { name: state.conversationTitle }),
      async () => {
        try {
          await messagesAPI.blockUser(state.otherUserId!);
          showSuccess(t('conversation.userBlocked'), '');
          navigation.goBack();
        } catch {
          showError(t('common.error'), t('conversation.blockError'));
        }
      },
    );
  };

  // ============================================
  // TYPING INDICATOR
  // ============================================

  const handleTyping = useCallback(() => {
    if (!state.conversationId) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_SEND_INTERVAL) {
      startTyping(state.conversationId);
      lastTypingSentRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (state.conversationId) {
        stopTyping(state.conversationId);
      }
    }, 3000);
  }, [state.conversationId, startTyping, stopTyping]);

  // ============================================
  // MESSAGE SEARCH
  // ============================================

  // Debounce + abort controller pour la recherche serveur. Sans ça, chaque
  // keystroke déclenchait un appel API, et la dernière réponse pouvait
  // arriver après-coup et écraser des résultats plus récents (race classique).
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const handleMessageSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    if (!query.trim() || !state.conversationId) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      try {
        // searchMessages prend (query, conversationId) ; pas de signal natif —
        // on gère l'abort côté state (si une requête plus récente arrive, on
        // ignore le résultat de l'ancienne).
        const res = await messagesAPI.searchMessages(query, state.conversationId || undefined);
        if (ctrl.signal.aborted) return;
        const results: Message[] = res.data?.results || res.data || [];
        setSearchResults(results);
      } catch {
        if (!ctrl.signal.aborted) setSearchResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearchLoading(false);
      }
    }, 300);
  }, [state.conversationId]);

  // Cleanup au démontage : évite les setState après unmount sur la dernière
  // requête en vol.
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // ============================================
  // ATTACHMENTS
  // ============================================

  const handlePickImage = async () => {
    try {
      // Garde-fou : on ne propose pas de joindre si la conversation est en lecture seule.
      if (quotaState?.is_read_only) {
        showError(t('conversation.readOnlyTitle'), t('conversation.readOnlyAttachMessage'));
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError(t('conversation.permissionPhotoTitle'), t('conversation.permissionPhotoMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // expo-image-picker v17+ : `MediaTypeOptions.Images` est deprecated,
        // l'API actuelle attend un array de strings (MediaType[]).
        mediaTypes: ['images'],
        // 0.7 (au lieu de 0.8) : gain de poids ~30% supplémentaire pour rester
        // sous le quota groupe de 500 MB sans sacrifier la lisibilité.
        quality: 0.7,
        allowsMultipleSelection: true,
        // Limite raisonnable — au-delà l'upload séquentiel devient pénible
        // et la latence perçue dégrade l'UX. Aligné sur les conventions
        // WhatsApp / Telegram (~10 max par envoi).
        selectionLimit: 10,
      });

      if (!result.canceled && result.assets.length > 0) {
        const { validateAttachmentSize, formatBytes } = await import('../../constants/messaging');

        // On compresse + valide chaque asset en parallèle. Les fichiers
        // rejetés (taille ou quota) sont collectés et signalés en bloc à la fin.
        type Processed =
          | { ok: true; uri: string; name: string; bytes: number }
          | { ok: false; name: string; reason: string };

        const processed: Processed[] = await Promise.all(
          result.assets.map(async (asset): Promise<Processed> => {
            const filename = asset.uri.split('/').pop() || `image-${Date.now()}.jpg`;
            let workingUri = asset.uri;
            try {
              const compressed = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 1920 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
              );
              workingUri = compressed.uri;
            } catch {
              // Compression échouée → fallback sur l'URI brute.
            }
            const sizeBytes = (asset as any).fileSize || 0;
            const sizeError = validateAttachmentSize(sizeBytes, 'image');
            if (sizeError && sizeBytes > 0) {
              return { ok: false, name: filename, reason: sizeError };
            }
            return { ok: true, uri: workingUri, name: filename, bytes: sizeBytes };
          }),
        );

        const accepted = processed.filter((p): p is Extract<Processed, { ok: true }> => p.ok);
        const rejected = processed.filter((p): p is Extract<Processed, { ok: false }> => !p.ok);

        // Vérif quota cumulé : la somme des tailles brutes doit rentrer dans
        // l'espace restant. Pessimiste (sizes pré-compression), mais évite
        // l'upload partiel qui bloquerait à mi-chemin.
        if (quotaState && quotaState.max_bytes != null) {
          const remaining = Math.max(0, quotaState.max_bytes - quotaState.total_bytes);
          const totalBytes = accepted.reduce((s, p) => s + p.bytes, 0);
          if (totalBytes > remaining && totalBytes > 0) {
            showError(
              t('conversation.groupFullTitle'),
              t('conversation.groupFullMessage', {
                remaining: formatBytes(remaining),
                max: formatBytes(quotaState.max_bytes),
              }),
            );
            return;
          }
        }

        if (rejected.length > 0) {
          // Au moins une image rejetée → on alerte sans bloquer les acceptées.
          const summary = rejected.map(r => `• ${r.name} — ${r.reason}`).join('\n');
          showError(t('conversation.imageTooLargeTitle'), summary);
        }

        if (accepted.length > 0) {
          actions.setAttachedFiles(accepted.map(p => ({
            uri: p.uri,
            name: p.name,
            type: 'image',
          })));
        }
      }
    } catch {
      showError(t('common.error'), t('conversation.pickImageError'));
    }
  };

  const handleRemoveAttachment = () => {
    actions.clearAttachedFiles();
  };

  const handlePickDocument = async () => {
    try {
      // Garde-fou : pas d'attachement en read-only (groupe a lecture seule, etc.)
      if (quotaState?.is_read_only) {
        showError(t('conversation.readOnlyTitle'), t('conversation.readOnlyAttachMessage'));
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const sizeBytes = asset.size || 0;

      // Validation taille (10 Mo doc) + quota cumule du groupe
      const { validateAttachmentSize, formatBytes } = await import('../../constants/messaging');
      const sizeError = validateAttachmentSize(sizeBytes, 'document');
      if (sizeError && sizeBytes > 0) {
        showError(t('conversation.documentTooLargeTitle'), sizeError);
        return;
      }
      if (quotaState && quotaState.max_bytes != null && sizeBytes > 0) {
        const remaining = Math.max(0, quotaState.max_bytes - quotaState.total_bytes);
        if (sizeBytes > remaining) {
          showError(
            t('conversation.groupFullTitle'),
            t('conversation.groupFullMessage', { remaining: formatBytes(remaining), max: formatBytes(quotaState.max_bytes) }),
          );
          return;
        }
      }
      actions.setAttachedFiles([{
        uri: asset.uri,
        name: asset.name,
        type: 'document',
      }]);
    } catch (error) {
      if (__DEV__) console.error('[ConvScreen] pickDocument failed:', error);
      showError(t('common.error'), t('conversation.pickDocumentError'));
    }
  };

  // ============================================
  // VOICE RECORDING
  // ============================================

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        showError(t('conversation.permissionMicTitle'), t('conversation.permissionMicMessage'));
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      actions.setRecording(true);
      actions.setRecordingDuration(0);
      // A. Reset les refs de detection silence pour ce nouvel enregistrement.
      recordingStartedAtRef.current = Date.now();
      firstSoundAtRef.current = null;

      recordingIntervalRef.current = setInterval(() => {
        actions.incrementRecordingDuration();
      }, 1000);
    } catch (error) {
      showError(t('common.error'), t('conversation.recordingError'));
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recorder.stop();
      const uri = recorder.uri;
      const duration = state.recordingDuration;

      actions.setRecording(false);
      setIsRecordingLocked(false);

      // A. Calcule le silence d'ouverture detecte. On clamp a 1500ms max et
      // on soustrait 250ms pour ne jamais couper le tout debut du son lui-meme.
      let startOffsetMs = 0;
      if (recordingStartedAtRef.current && firstSoundAtRef.current) {
        const detected = firstSoundAtRef.current - recordingStartedAtRef.current;
        startOffsetMs = Math.max(0, Math.min(1500, detected - 250));
      }
      setPendingVoiceStartOffsetMs(startOffsetMs);
      recordingStartedAtRef.current = null;
      firstSoundAtRef.current = null;

      // Instead of immediately attaching the file, store it for preview
      if (uri && duration >= 1) {
        // Pré-validation taille audio. expo-audio n'expose pas la taille
        // directement — on s'appuie sur la durée comme heuristique (HIGH_QUALITY
        // m4a ~ 32 kbps ≈ 4 Ko/s). On bloque au-delà de ~22 minutes pour rester
        // sous les 5 Mo backend.
        const APPROX_BYTES_PER_SEC = 4 * 1024;
        const estimatedBytes = duration * APPROX_BYTES_PER_SEC;
        const { MESSAGE_LIMITS, formatBytes } = await import('../../constants/messaging');
        if (estimatedBytes > MESSAGE_LIMITS.VOICE_MAX_BYTES) {
          showError(
            t('conversation.voiceTooLongTitle'),
            t('conversation.voiceTooLongMessage', { limit: formatBytes(MESSAGE_LIMITS.VOICE_MAX_BYTES) }),
          );
          return;
        }
        setPendingVoiceUri(uri);
        setPendingVoiceDuration(duration);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur arrêt enregistrement:', error);
    }
  };

  const sendPendingVoice = () => {
    if (!pendingVoiceUri) return;
    const uri = pendingVoiceUri;
    const duration = pendingVoiceDuration;
    // Stop preview player if running
    if (previewPlayerRef.current) {
      try { previewPlayerRef.current.remove(); } catch { /* noop */ }
      previewPlayerRef.current = null;
    }
    setVoicePreviewPlaying(false);
    setPendingVoiceUri(null);
    setPendingVoiceDuration(0);
    // Concatene avec les autres attachments deja attaches (image+doc+voice
    // ensemble) au lieu de remplacer — preserve une eventuelle selection.
    actions.setAttachedFiles([
      ...(state.attachedFiles || []),
      {
        uri,
        name: `voice_${Date.now()}.m4a`,
        type: 'voice',
        duration,
      },
    ]);
    // handleSend reads from state.attachedFiles asynchronously, so we defer
    // by one tick to let the state update propagate before the send fires.
    setTimeout(() => { handleSend(); }, 0);
  };

  const discardPendingVoice = () => {
    if (previewPlayerRef.current) {
      try { previewPlayerRef.current.remove(); } catch { /* noop */ }
      previewPlayerRef.current = null;
    }
    setVoicePreviewPlaying(false);
    setPendingVoiceUri(null);
    setPendingVoiceDuration(0);
  };

  const toggleVoicePreview = async () => {
    if (!pendingVoiceUri) return;
    try {
      if (voicePreviewPlaying) {
        // Pause / stop playback
        if (previewPlayerRef.current) {
          try { (previewPlayerRef.current as any).pause(); } catch { /* noop */ }
        }
        setVoicePreviewPlaying(false);
      } else {
        // Start or resume playback
        if (!previewPlayerRef.current) {
          const player = createAudioPlayer({ uri: pendingVoiceUri });
          previewPlayerRef.current = player;
          // SharedObject<AudioEvents> expose addListener à runtime mais le
          // typing expo-modules-core (typeof ExpoGlobal.SharedObject) n'expose
          // pas la méthode héritée d'EventEmitter. Cast nécessaire.
          (player as any).addListener('playbackStatusUpdate', (status: any) => {
            if (status?.didJustFinish) {
              setVoicePreviewPlaying(false);
              try { (player as any).remove?.(); } catch { /* noop */ }
              if (previewPlayerRef.current === player) previewPlayerRef.current = null;
            }
          });
        }
        (previewPlayerRef.current as any).play();
        setVoicePreviewPlaying(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur lecture preview vocal:', error);
      setVoicePreviewPlaying(false);
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      await recorder.stop();
      actions.setRecording(false);
      setIsRecordingLocked(false);
    } catch (error) {
      if (__DEV__) console.error('Erreur annulation enregistrement:', error);
    }
  };

  // Marque un voice comme "ecoute" (#4) et persiste — utilise au didJustFinish
  // et aussi quand l'user seek >= 90% (l'user a globalement ecoute la totalite).
  const markVoiceListened = useCallback((msgId: string) => {
    const convId = state.conversationId;
    if (!convId) return;
    setListenedVoiceIds((prev) => {
      if (prev.has(msgId)) return prev;
      const next = new Set(prev);
      next.add(msgId);
      AsyncStorage.setItem(`voice_listened:${convId}`, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, [state.conversationId]);

  // #2 Auto-play du voice suivant non ecoute, dans le meme ordre que la liste.
  // Retourne le message vocal qui suit `currentMsgId` chronologiquement.
  const findNextVoiceMessage = useCallback((currentMsgId: string): { uri: string; messageId: string } | null => {
    // FlatList inverted: index 0 = plus recent. "Suivant" pour l'user = plus
    // recent que celui qui vient de finir.
    const messages = state.messages;
    if (!messages || messages.length === 0) return null;
    const idx = messages.findIndex((m) => String(m.id) === String(currentMsgId));
    if (idx === -1) return null;
    // On scanne du courant vers les plus recents (index decroissant car liste inversee)
    for (let i = idx - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.is_deleted) continue;
      const voiceAtt = (m.attachments || []).find((a: any) => a.attachment_type === 'voice');
      if (voiceAtt && !listenedVoiceIds.has(String(m.id))) {
        const uri = typeof voiceAtt.file === 'string' ? voiceAtt.file : (voiceAtt.file as any)?.uri;
        if (uri) return { uri, messageId: String(m.id) };
      }
    }
    return null;
  }, [state.messages, listenedVoiceIds]);

  // #6 Persist position au pause / save explicite. Cle par conversation.
  const persistVoicePosition = useCallback(async (messageId: string, currentMs: number) => {
    const convId = state.conversationId;
    if (!convId || currentMs < 1000) return; // ignore < 1s (debut)
    try {
      await AsyncStorage.setItem(`voice_pos:${convId}:${messageId}`, String(currentMs));
    } catch { /* noop */ }
  }, [state.conversationId]);

  const loadVoicePosition = useCallback(async (messageId: string): Promise<number | null> => {
    const convId = state.conversationId;
    if (!convId) return null;
    try {
      const raw = await AsyncStorage.getItem(`voice_pos:${convId}:${messageId}`);
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch { return null; }
  }, [state.conversationId]);

  const playVoiceMessage = async (
    uri: string,
    messageId: string,
    attachmentId?: string,
    serverStartOffsetMs?: number,
    serverEndOffsetMs?: number,
  ) => {
    try {
      // Cas 1 : tap sur le message déjà chargé → toggle pause / play sans
      // détruire le player (préserve la position de lecture).
      if (playerRef.current && currentPlayerMsgIdRef.current === messageId) {
        const player: any = playerRef.current;
        const isCurrentlyPlaying = state.playingVoiceId === messageId;
        if (isCurrentlyPlaying) {
          try { player.pause(); } catch { /* noop */ }
          actions.setPlayingVoice(null);
          // #6 Persiste la position courante au pause manuel
          if (voicePlayback?.messageId === messageId) {
            persistVoicePosition(messageId, voicePlayback.currentMs);
          }
        } else {
          try { player.play(); } catch { /* noop */ }
          actions.setPlayingVoice(messageId);
        }
        return;
      }

      // Cas 2 : tap sur un autre message → couper le player précédent
      if (playerRef.current) {
        // Persiste la position de l'ancien voice avant de le couper
        if (voicePlayback?.messageId && currentPlayerMsgIdRef.current === voicePlayback.messageId) {
          persistVoicePosition(voicePlayback.messageId, voicePlayback.currentMs);
        }
        try { playerRef.current.remove(); } catch { /* noop */ }
        playerRef.current = null;
        currentPlayerMsgIdRef.current = null;
      }
      if (loadingFallbackRef.current) {
        clearTimeout(loadingFallbackRef.current);
        loadingFallbackRef.current = null;
      }
      if (voiceHardTimeoutRef.current) {
        clearTimeout(voiceHardTimeoutRef.current);
        voiceHardTimeoutRef.current = null;
      }

      // Priorite des URIs (du plus rapide au plus lent) :
      //  1. file:// local du SENDER (sentVoiceCache) : si on a envoye ce voice
      //     nous-meme, on lit directement depuis le disque — instant, et evite
      //     le bug "ca tourne juste apres l'envoi" (fichier serveur pas pret).
      //  2. file:// pre-fetche par useVoicePrefetch (voices recus deja DL).
      //  3. URL distante en streaming HTTP (fallback dernier recours).
      const remoteUri = getMediaUrl(uri) || uri;
      const sentLocal = getSentVoiceUri(attachmentId);
      const playableUri = sentLocal || getCachedVoiceUri(remoteUri) || remoteUri;
      // Charge la position sauvegardee pour ce voice — si > 1s on reprendra la
      // lecture a cette position au premier status callback.
      // Cascade :
      //   1. position sauvee (l'user a pause au milieu, on reprend la)
      //   2. start_offset_ms du serveur (analyse audio backend, universelle)
      //   3. offset local recorder (feature A — fallback sender-only)
      let savedPosMs = await loadVoicePosition(messageId);
      if (!savedPosMs && typeof serverStartOffsetMs === 'number' && serverStartOffsetMs > 0) {
        savedPosMs = serverStartOffsetMs;
      }
      if (!savedPosMs && attachmentId) {
        try {
          const offsetRaw = await AsyncStorage.getItem(`voice_start_offset:${attachmentId}`);
          const offset = Number(offsetRaw);
          if (Number.isFinite(offset) && offset > 0) savedPosMs = offset;
        } catch { /* ignore */ }
      }

      // Loading visible immédiatement (entre tap et premier sample).
      setVoicePlayback({
        messageId,
        currentMs: savedPosMs ?? 0,
        durationMs: 0,
        isLoading: true,
      });
      actions.setPlayingVoice(messageId);

      const player = createAudioPlayer({ uri: playableUri });
      playerRef.current = player;
      currentPlayerMsgIdRef.current = messageId;

      // Si on a une position sauvegardee, on seek juste apres play() (le
      // player doit etre charge avant que seekTo fonctionne — on essaie
      // immediatement puis retry une fois apres premier status callback).
      let seekedToSaved = false;
      const trySeekToSaved = () => {
        if (seekedToSaved || !savedPosMs) return;
        try {
          const p: any = player;
          if (typeof p.seekTo === 'function') {
            p.seekTo(savedPosMs / 1000);
            seekedToSaved = true;
          } else if (typeof p.setPosition === 'function') {
            p.setPosition(savedPosMs);
            seekedToSaved = true;
          }
        } catch { /* ignore */ }
      };
      // #1 Applique la vitesse courante au nouveau player. L'API varie selon
      // la version expo-audio (setPlaybackRate vs playbackRate property) —
      // on essaie les 2 et on tolere l'echec silencieux.
      try {
        const p: any = player;
        if (typeof p.setPlaybackRate === 'function') {
          p.setPlaybackRate(playbackRate);
        } else if ('playbackRate' in p) {
          p.playbackRate = playbackRate;
        }
      } catch { /* ignore */ }

      // Cf. note plus haut : addListener existe au runtime mais pas dans le
      // typing expo-modules-core de SharedObject — d'où le cast.
      const subscription = (player as any).addListener('playbackStatusUpdate', (status: any) => {
        // status: { isLoaded, currentTime (s), duration (s), didJustFinish, playing, isBuffering }
        if (status?.didJustFinish) {
          actions.setPlayingVoice(null);
          setVoicePlayback(null);
          try { subscription.remove(); } catch { /* noop */ }
          try { player.remove(); } catch { /* noop */ }
          if (playerRef.current === player) playerRef.current = null;
          if (currentPlayerMsgIdRef.current === messageId) currentPlayerMsgIdRef.current = null;
          if (loadingFallbackRef.current) {
            clearTimeout(loadingFallbackRef.current);
            loadingFallbackRef.current = null;
          }
          if (voiceHardTimeoutRef.current) {
            clearTimeout(voiceHardTimeoutRef.current);
            voiceHardTimeoutRef.current = null;
          }
          // #4 Marque comme ecoute
          markVoiceListened(messageId);
          // #6 Clear la position sauvegardee — voice termine, plus rien a reprendre
          const convId = state.conversationId;
          if (convId) {
            AsyncStorage.removeItem(`voice_pos:${convId}:${messageId}`).catch(() => {});
          }
          // #2 Auto-play du voice suivant non ecoute, leger delai pour respirer
          const next = findNextVoiceMessage(messageId);
          if (next) {
            setTimeout(() => { playVoiceMessage(next.uri, next.messageId); }, 350);
          }
          return;
        }
        // #6 Premier status valide → si on a une position sauvegardee, on seek
        if (!seekedToSaved && (status?.isLoaded || (status?.duration ?? 0) > 0)) {
          trySeekToSaved();
        }
        // Drop "loading" des qu'on a un signe que le moteur lit (playing ou
        // duration > 0) OU que le media est marque comme charge. Certaines
        // versions d'expo-audio ne settent jamais explicitement isLoaded=true
        // pour les URI distantes — on s'appuyait dessus avant, d'où le spinner
        // qui restait visible indefiniment.
        const hasDuration = (status?.duration ?? 0) > 0;
        const isReady = !!status?.isLoaded || !!status?.playing || hasDuration;
        const currentMs = Math.round((status?.currentTime ?? 0) * 1000);
        const durationMs = Math.round((status?.duration ?? 0) * 1000);
        setVoicePlayback({ messageId, currentMs, durationMs, isLoading: !isReady });
        // Auto-stop avant le silence final (end_offset_ms du serveur).
        // On declenche manuellement la fin si on entre dans la zone de
        // silence terminal — meme effet que didJustFinish mais plus tot.
        if (
          typeof serverEndOffsetMs === 'number'
          && serverEndOffsetMs > 0
          && durationMs > 0
          && currentMs >= durationMs - serverEndOffsetMs
        ) {
          try { player.pause(); } catch { /* noop */ }
          // Simule didJustFinish pour declencher #2 auto-next + #4 listened
          actions.setPlayingVoice(null);
          setVoicePlayback(null);
          try { subscription.remove(); } catch { /* noop */ }
          try { player.remove(); } catch { /* noop */ }
          if (playerRef.current === player) playerRef.current = null;
          if (currentPlayerMsgIdRef.current === messageId) currentPlayerMsgIdRef.current = null;
          if (loadingFallbackRef.current) {
            clearTimeout(loadingFallbackRef.current);
            loadingFallbackRef.current = null;
          }
          markVoiceListened(messageId);
          const convId = state.conversationId;
          if (convId) {
            AsyncStorage.removeItem(`voice_pos:${convId}:${messageId}`).catch(() => {});
          }
          const next = findNextVoiceMessage(messageId);
          if (next) setTimeout(() => { playVoiceMessage(next.uri, next.messageId); }, 350);
          return;
        }
        // #4 Marque "ecoute" si l'user a depasse 90% (compte un seek vers la
        // fin comme "ecoute" sans attendre didJustFinish, qui peut etre rate
        // si l'user pause juste avant la fin).
        if (durationMs > 0 && currentMs / durationMs >= 0.9) {
          markVoiceListened(messageId);
        }
      });

      // Fallback : si aucun status n'est arrive en 2.5s, on assume que la
      // lecture est en cours (le spinner ne doit pas rester eternellement).
      const loadingFallback = setTimeout(() => {
        setVoicePlayback((prev) => {
          if (prev && prev.messageId === messageId && prev.isLoading) {
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }, 2500);
      loadingFallbackRef.current = loadingFallback;

      // Hard timeout : si apres 6s on n'a TOUJOURS recu aucune `duration` du
      // status callback, c'est que le serveur ne sert pas le fichier (404,
      // CDN cold, fichier pas encore ecrit cote backend juste apres upload).
      // On stoppe le player et on remonte une erreur claire avec retry plutot
      // que de laisser tourner indefiniment. Cas typique : tap "play" sur son
      // propre voice juste apres l'avoir envoye, avant que le fichier soit
      // accessible cote storage.
      if (voiceHardTimeoutRef.current) {
        clearTimeout(voiceHardTimeoutRef.current);
        voiceHardTimeoutRef.current = null;
      }
      voiceHardTimeoutRef.current = setTimeout(() => {
        setVoicePlayback((prev) => {
          if (!prev || prev.messageId !== messageId) return prev;
          if (prev.durationMs > 0) return prev; // OK, charge → ne pas killer
          try { subscription.remove(); } catch { /* noop */ }
          try { player.remove(); } catch { /* noop */ }
          if (playerRef.current === player) playerRef.current = null;
          if (currentPlayerMsgIdRef.current === messageId) currentPlayerMsgIdRef.current = null;
          if (loadingFallbackRef.current) {
            clearTimeout(loadingFallbackRef.current);
            loadingFallbackRef.current = null;
          }
          voiceHardTimeoutRef.current = null;
          actions.setPlayingVoice(null);
          showError(t('common.error'), t('conversation.voiceTimeoutHint'));
          if (__DEV__) {
            console.warn('[playVoiceMessage] hard timeout — no audio data', {
              messageId,
              uri: playableUri,
              wasLocal: playableUri.startsWith('file://'),
            });
          }
          return null;
        });
      }, 6000);

      player.play();
    } catch (error) {
      if (__DEV__) console.error('[playVoiceMessage] uri=', uri, 'err=', error);
      actions.setPlayingVoice(null);
      setVoicePlayback(null);
      currentPlayerMsgIdRef.current = null;
      showError(t('common.error'), t('conversation.voicePlayError'));
    }
  };

  // #1 Long-press sur le bouton play : cycle 1.0 → 1.5 → 2.0 → 1.0.
  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRate((current) => {
      const idx = PLAYBACK_RATES.indexOf(current);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      // Applique au player en cours si un voice joue
      const p: any = playerRef.current;
      if (p) {
        try {
          if (typeof p.setPlaybackRate === 'function') p.setPlaybackRate(next);
          else if ('playbackRate' in p) p.playbackRate = next;
        } catch { /* ignore */ }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // #6 Undo send — VRAIE fenetre d'annulation.
  //
  // L'implementation precedente envoyait le message immediatement puis, au tap
  // "Annuler", tentait un delete a posteriori : le destinataire avait deja recu
  // le message (et sa notification push), et si le delete echouait — hors ligne,
  // WS ferme, 403 — il restait affiche. Le bouton mentait.
  //
  // Desormais on DIFFERE l'envoi reseau : `armUndoSend` retourne une promesse
  // resolue a `true` si le delai s'ecoule (=> on envoie), `false` si l'user
  // annule (=> on n'envoie jamais rien). Le message n'existe que localement
  // pendant la fenetre, donc annuler est exact et ne depend d'aucun reseau.
  // La mecanique de la barriere vit dans src/utils/undoGate.ts (testee
  // isolement) ; ici on ne gere que l'UI de la snackbar.
  const undoGateRef = useRef<UndoGate | null>(null);
  if (undoGateRef.current === null) {
    undoGateRef.current = new UndoGate(UNDO_SEND_DELAY_MS);
  }

  const hideUndoSnackbar = useCallback(() => {
    Animated.timing(undoSnackbarAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setPendingUndoMessage(null));
  }, [undoSnackbarAnim]);

  /** Attend la fin de la fenetre d'undo. `true` => envoyer, `false` => annule. */
  const armUndoSend = useCallback((tempId: string): Promise<boolean> => {
    setPendingUndoMessage({ tempId, expiresAt: Date.now() + UNDO_SEND_DELAY_MS });
    Animated.timing(undoSnackbarAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    return undoGateRef.current!.arm().then((commit) => {
      hideUndoSnackbar();
      return commit;
    });
  }, [undoSnackbarAnim, hideUndoSnackbar]);

  /** Tap sur "Annuler" : le message n'a jamais quitte l'appareil. */
  const performUndoSend = useCallback(() => {
    const pending = pendingUndoMessage;
    if (!pending) return;
    // Retire le message optimiste local. Aucun appel reseau : rien n'est parti.
    actions.removeMessage(pending.tempId);
    undoGateRef.current!.cancel();
  }, [pendingUndoMessage, actions]);

  // Au unmount, on commite l'envoi en attente plutot que de le perdre
  // silencieusement (l'user a tape "envoyer" et n'a pas annule).
  useEffect(() => {
    const gate = undoGateRef.current!;
    return () => gate.commit();
  }, []);

  // #10 Skip avant de 15s sur le voice en cours.
  const skipForward15s = useCallback(() => {
    const player: any = playerRef.current;
    if (!player || !voicePlayback) return;
    const { durationMs, currentMs } = voicePlayback;
    if (durationMs <= 0) return;
    const targetSec = Math.min(durationMs / 1000, (currentMs / 1000) + 15);
    try {
      if (typeof player.seekTo === 'function') player.seekTo(targetSec);
      else if (typeof player.setPosition === 'function') player.setPosition(targetSec * 1000);
      setVoicePlayback((prev) =>
        prev && prev.messageId === voicePlayback.messageId
          ? { ...prev, currentMs: Math.round(targetSec * 1000) }
          : prev,
      );
    } catch (e) {
      if (__DEV__) console.warn('[skipForward15s] failed', e);
    }
  }, [voicePlayback]);

  // Tap-to-seek sur la waveform du voice en cours de lecture.
  const seekVoiceMessage = useCallback((messageId: string, ratio: number) => {
    const player: any = playerRef.current;
    if (!player || currentPlayerMsgIdRef.current !== messageId) return;
    const durationMs = voicePlayback?.durationMs ?? 0;
    if (durationMs <= 0) return;
    const targetSec = Math.max(0, Math.min(durationMs / 1000, (durationMs / 1000) * ratio));
    try {
      // expo-audio: seekTo(seconds) (numeric, en secondes)
      if (typeof player.seekTo === 'function') {
        player.seekTo(targetSec);
      } else if (typeof player.setPosition === 'function') {
        player.setPosition(targetSec * 1000);
      }
      // Update optimiste pour que l'UI bouge meme avant le prochain status
      setVoicePlayback((prev) =>
        prev && prev.messageId === messageId
          ? { ...prev, currentMs: Math.round(targetSec * 1000) }
          : prev,
      );
    } catch (e) {
      if (__DEV__) console.warn('[seekVoiceMessage] failed', e);
    }
  }, [voicePlayback?.durationMs]);

  // ============================================
  // MESSAGE ACTIONS
  // ============================================

  const handleMessageLongPress = useCallback((message: Message) => {
    actions.showActionMenu(message);
  }, [actions]);

  const handleMessageAction = useCallback(async (action: MessageActionType) => {
    const message = state.selectedMessage;
    if (!message) return;

    actions.hideActionMenu();

    switch (action) {
      case 'reply':
        actions.startReply(message);
        break;

      case 'reply_voice':
        // B. Raccourci : cite le message + lance l'enregistrement vocal
        // immediatement. Le user voit le pill reply au-dessus de l'input
        // + l'UI recording active en bas. Quand il tap "Envoyer", le voice
        // part avec reply_to deja set.
        actions.startReply(message);
        // Leger delai pour laisser le state replyToMessage propager avant
        // que startRecording configure le mode audio.
        setTimeout(() => { startRecording(); }, 50);
        break;

      case 'edit':
        if (isMyMessage(message, user?.id)) {
          // Limite de 15 min après envoi (comme WhatsApp). Au-delà,
          // l'édition n'est plus autorisée pour préserver la confiance dans
          // l'historique des conversations.
          const EDIT_WINDOW_MS = 15 * 60 * 1000;
          const sentAt = message.created_at ? new Date(message.created_at).getTime() : 0;
          if (sentAt && Date.now() - sentAt > EDIT_WINDOW_MS) {
            showError(
              t('conversation.editUnavailableTitle'),
              t('conversation.editUnavailableMessage'),
            );
            return;
          }
          actions.startEdit(message);
        }
        break;

      case 'delete':
        handleDeleteMessage(String(message.id));
        break;

      case 'forward':
        handleForwardMessage(message);
        break;

      case 'select':
        // Entre en mode selection avec ce message deja coche. Le bouton
        // "Selectionner" du menu d'actions sert d'entree au bulk delete /
        // bulk forward. Tap suivant sur d'autres messages = toggle.
        setSelectionMode(true);
        setSelectedIds(new Set([Number(message.id)]));
        break;

      case 'react':
        // Memoriser la cible AVANT le wipe par hideActionMenu (deja appele
        // ligne ~1793). handleSelectReaction lira cette ref au lieu de
        // selectedMessage qui sera null a ce moment.
        reactionTargetMessageRef.current = message;
        actions.showReactionPicker();
        break;

      case 'copy':
        if (message.content) {
          Clipboard.setString(message.content);
          showSuccess(t('conversation.copiedTitle'), t('conversation.copiedMessage'));
        }
        break;

      case 'report':
        // Conserver le message ciblé et ouvrir la modale dédiée
        setReportTargetMessage(message);
        setShowReportModal(true);
        break;

      case 'block': {
        // Bloquer l'expéditeur du message — uniquement en conversation directe
        const senderId = (() => {
          const s: any = message.sender;
          if (s == null) return null;
          if (typeof s === 'object' && s.id != null) return String(s.id);
          return String(s);
        })();
        if (senderId) {
          handleBlockUserById(senderId, message.sender_name || t('conversation.defaultUserName'));
        }
        break;
      }

      case 'star': {
        // Toggle star — le backend (`views.py:644-653`) bascule `is_starred`
        // et retourne le nouvel état. On update optimiste pour réactivité.
        const wasStarred = !!message.is_starred;
        actions.updateMessage(String(message.id), { is_starred: !wasStarred });
        messagesAPI.starMessage(String(message.id))
          .then((res) => {
            // Sync avec la valeur server (au cas où elle diffère, ex. retry).
            const serverValue = res?.data?.is_starred;
            if (typeof serverValue === 'boolean' && serverValue !== !wasStarred) {
              actions.updateMessage(String(message.id), { is_starred: serverValue });
            }
            showSuccess(
              wasStarred ? t('conversation.unstarredTitle') : t('conversation.starredTitle'),
              '',
            );
          })
          .catch(() => {
            // Rollback en cas d'échec réseau.
            actions.updateMessage(String(message.id), { is_starred: wasStarred });
            showError(t('common.error'), t('conversation.starError'));
          });
        break;
      }

      // ─── Actions specifiques aux attachments (gates cote MessageActionModal) ───
      case 'save_image': {
        const imageAtt = (message.attachments || []).find((a: any) => a?.attachment_type === 'image');
        if (imageAtt) saveImageAttachmentToGallery(imageAtt);
        break;
      }
      case 'open_with': {
        const docAtt = (message.attachments || []).find(
          (a: any) => a?.attachment_type && a.attachment_type !== 'image' && a.attachment_type !== 'voice',
        );
        if (docAtt) downloadAndOpenAttachment(docAtt);
        break;
      }
      case 'share_attachment': {
        const att = (message.attachments || []).find(
          (a: any) => typeof a?.file === 'string' && a.file.startsWith('http'),
        );
        if (att) downloadAndOpenAttachment(att);
        break;
      }
      case 'copy_link': {
        const att = (message.attachments || []).find(
          (a: any) => typeof a?.file === 'string' && a.file.startsWith('http'),
        );
        if (att) {
          try {
            Clipboard.setString(att.file);
            showSuccess(t('conversation.copiedTitle'), t('conversation.copiedMessage'));
          } catch { /* ignore */ }
        }
        break;
      }
    }
  }, [state.selectedMessage, user?.id, actions]);

  // Helpers attachment — appeles depuis le menu d'actions message
  // (save_image, open_with, share_attachment). Telecharge le fichier en
  // cache puis le passe a expo-sharing.shareAsync (gere Save to gallery
  // sur iOS et l'intent system Share sur Android).
  const downloadAndOpenAttachment = useCallback(async (att: any) => {
    try {
      if (typeof att?.file !== 'string') return;
      const url: string = att.file;
      const filename = (att.file_name as string) || url.split('/').pop()?.split('?')[0] || 'download';
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      // Skip download si deja en cache
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        await FileSystem.downloadAsync(url, localUri);
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, {
          mimeType: att.mime_type || undefined,
          dialogTitle: att.file_name || t('componentsMessages.attachmentMenuShare'),
        });
      }
    } catch (err: any) {
      if (__DEV__) console.warn('downloadAndOpenAttachment failed:', err?.message);
      showError(t('common.error'), t('componentsMessages.attachmentDownloadFailed'));
    }
  }, [t, showError]);

  const saveImageAttachmentToGallery = useCallback(async (att: any) => {
    // Pour la galerie photo native, on a besoin de expo-media-library qui
    // n'est peut-etre pas installe. Fallback : share, qui propose "Save
    // image" parmi les options.
    return downloadAndOpenAttachment(att);
  }, [downloadAndOpenAttachment]);

  const handleBlockUserById = (targetUserId: string, targetName: string) => {
    showConfirm(
      t('conversation.blockUserTitle'),
      t('conversation.blockUserConfirmCustom', { name: targetName }),
      async () => {
        try {
          await messagesAPI.blockUser(targetUserId);
          showSuccess(t('conversation.userBlocked'), '');
          // Pour une conversation directe, on remonte. Pour un groupe, on
          // reste sur place mais l'user n'aura plus ses futurs messages.
          if (conversationType === 'direct') {
            navigation.goBack();
          }
        } catch {
          showError(t('common.error'), t('conversation.blockError'));
        }
      },
    );
  };

  const handleSubmitReport = async (reason: ReportReason, description?: string) => {
    if (!reportTargetMessage) return;
    setSubmittingReport(true);
    try {
      await messagesAPI.reportMessage(reportTargetMessage.id, { reason, description });
      setShowReportModal(false);
      setReportTargetMessage(null);
      showSuccess(
        t('conversation.reportSentTitle'),
        t('conversation.reportSentMessage'),
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        t('conversation.reportError');
      showError(t('common.error'), msg);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    showConfirm(
      t('conversation.deleteMessageTitle'),
      t('conversation.deleteMessageConfirm'),
      async () => {
        try {
          if (isConnected && isAuthenticated) {
            wsDeleteMessage(messageId);
          } else {
            await messagesAPI.deleteMessage(messageId);
          }
          // Soft delete: update message in place
          actions.updateMessage(messageId, {
            is_deleted: true,
            content: '',
            attachments: [],
          });
        } catch {
          showError(t('common.error'), t('conversation.deleteMessageError'));
        }
      },
    );
  };

  // Référence du message à transférer — préservée séparément de
  // `state.selectedMessage`, qui est remis à null dès que MessageActionModal
  // se ferme (`hideActionMenu` dans le reducer). Sans cette ref, le tap sur
  // "Envoyer" du ForwardModal voyait `selectedMessage=null` et abandonnait
  // silencieusement.
  const forwardSourceMessageRef = useRef<Message | null>(null);

  // Meme pattern pour la reaction : `state.selectedMessage` est wipe par
  // `hideActionMenu()` au moment ou l'user tape "Reagir" dans le menu,
  // donc quand il choisit ensuite un emoji, selectedMessage est null →
  // la reaction part dans le vide. Cette ref capture le message cible
  // AVANT le wipe.
  const reactionTargetMessageRef = useRef<Message | null>(null);

  // ─────────────────────────────────────────────────────────────────────
  // Bulk selection mode (long-press → entree mode, tap pour toggle).
  // En selection mode : action bar en haut avec count + delete + forward.
  // ─────────────────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Au passage en selection multi-cible, on memorise quel set forwarder
  // (sinon le state.selectionMode disparait avant que le user clique Envoyer)
  const bulkForwardSourceIdsRef = useRef<number[]>([]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleMessageSelection = useCallback((messageId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      // Si l'user deselectionne le dernier, on sort du mode
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    // Filtrer cote client : on ne propose pas le delete sur des messages
    // qui ne sont pas a nous. Backend re-verifie de toute facon.
    const ownIds = ids.filter((id) => {
      const m = state.messages.find((x: any) => x.id === id);
      return m && isMyMessage(m, user?.id) && !m.is_deleted;
    });
    if (ownIds.length === 0) {
      showError(
        t('common.error'),
        t('conversation.bulkDeleteNoOwn'),
      );
      return;
    }
    showConfirm(
      t('conversation.bulkDeleteConfirmTitle', { count: ownIds.length }),
      t('conversation.bulkDeleteConfirmMessage', { count: ownIds.length }),
      async () => {
        try {
          await messagesAPI.bulkDeleteMessages(ownIds);
          // Optimistic : on tag is_deleted dans le state local. Le WS arrivera
          // confirmer mais l'UI est deja a jour.
          for (const id of ownIds) {
            actions.updateMessage(String(id), {
              is_deleted: true,
              content: '',
              attachments: [],
            });
          }
          showSuccess(
            t('conversation.bulkDeleteSuccess', { count: ownIds.length }),
            '',
          );
          exitSelectionMode();
        } catch (err: any) {
          showError(
            t('common.error'),
            err?.response?.data?.detail || t('conversation.bulkDeleteError'),
          );
        }
      },
    );
  }, [selectedIds, state.messages, user?.id, t, showError, showSuccess, showConfirm, actions, exitSelectionMode]);

  /**
   * Charge la liste des cibles autorisees pour un forward. Strategie :
   *
   *  1. Connections etablies (QR / mutual follow) — affichees EN PREMIER,
   *     forward garanti reussi (le destinataire a explicitement consenti).
   *  2. Conversations existantes en complement (dedupliquees vs Connections) —
   *     personnes avec qui on a deja echange mais pas forcement Connection.
   *     Le forward backend re-valide la policy du destinataire : si refus
   *     (recipient_requires_connection), Promise.allSettled remonte l'echec
   *     dans le compteur de failures (cf handleForwardToTargets).
   *
   * On evite ainsi le bug "aucun contact visible" du fix initial (qui ne
   * listait QUE les Connections — souvent vide) tout en gardant le filtrage
   * cote backend pour les destinataires en policy 'connections' stricte.
   */
  const loadForwardTargets = useCallback(async (): Promise<User[]> => {
    const [connectionsRes, conversationsRes] = await Promise.allSettled([
      connectionsAPI.list(),
      messagesAPI.getConversations(),
    ]);

    const seen = new Set<string | number>();
    const targets: User[] = [];

    // 1. Connections d'abord (priorité — destinataires fiables).
    if (connectionsRes.status === 'fulfilled') {
      const connections = connectionsRes.value.data?.results || [];
      connections.forEach((c: any) => {
        const u = c.user;
        if (u && u.id !== user?.id && !seen.has(u.id)) {
          seen.add(u.id);
          targets.push(u);
        }
      });
    }

    // 2. Conversations en complement (deduplique vs Connections).
    if (conversationsRes.status === 'fulfilled') {
      const conversations = conversationsRes.value.data?.results || conversationsRes.value.data || [];
      conversations.forEach((conv: any) => {
        conv.participants?.forEach((p: any) => {
          if (p && p.id !== user?.id && !seen.has(p.id)) {
            seen.add(p.id);
            targets.push(p);
          }
        });
      });
    }

    return targets;
  }, [user?.id]);

  const handleBulkForward = useCallback(async () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const m = state.messages.find((x: any) => x.id === id);
      return m && !m.is_deleted;
    });
    if (ids.length === 0) return;
    // Memo et reutilise le flow forward existant : meme modale, mais
    // handleForwardToTargets detectera bulkForwardSourceIdsRef pour partir
    // sur le bulk endpoint au lieu du forward 1-msg.
    bulkForwardSourceIdsRef.current = ids;
    forwardSourceMessageRef.current = null; // pour disambiguer single vs bulk
    actions.showForwardModal();
    actions.setLoadingForwardTargets(true);
    try {
      const targets = await loadForwardTargets();
      actions.setForwardTargets(targets);
    } catch {
      showError(t('common.error'), t('conversation.forwardTargetsError'));
    } finally {
      actions.setLoadingForwardTargets(false);
    }
  }, [selectedIds, state.messages, user?.id, t, showError, actions, loadForwardTargets]);

  const handleForwardMessage = async (message: Message) => {
    forwardSourceMessageRef.current = message;
    actions.showForwardModal();
    actions.setLoadingForwardTargets(true);

    try {
      const targets = await loadForwardTargets();
      actions.setForwardTargets(targets);
    } catch (error) {
      showError(t('common.error'), t('conversation.forwardTargetsError'));
    } finally {
      actions.setLoadingForwardTargets(false);
    }
  };

  const handleForwardToTargets = async (targetUserIds: string[]) => {
    // Deux modes :
    //  - Bulk (selection mode) : bulkForwardSourceIdsRef.current contient les
    //    IDs source ; on boucle sur (message × destinataire) via l'endpoint
    //    individuel (le bulk endpoint backend prend des conversation_ids mais
    //    le picker retourne des user_ids — boucle pour rester compatible).
    //  - Single : forwardSourceMessageRef.current contient le message.
    const bulkIds = bulkForwardSourceIdsRef.current;
    const isBulk = bulkIds && bulkIds.length > 0;
    const sourceMessage = forwardSourceMessageRef.current;
    if (!isBulk && !sourceMessage) return;
    if (targetUserIds.length === 0) return;

    const sourceIds = isBulk ? bulkIds.map(String) : [String(sourceMessage!.id)];
    const callCount = sourceIds.length * targetUserIds.length;

    const results = await Promise.allSettled(
      sourceIds.flatMap((msgId) =>
        targetUserIds.map((uid) =>
          messagesAPI.forwardMessage({ message_id: msgId, target_user_id: uid }),
        ),
      ),
    );
    const failures = results.filter(r => r.status === 'rejected').length;
    actions.hideForwardModal();
    forwardSourceMessageRef.current = null;
    bulkForwardSourceIdsRef.current = [];
    if (isBulk) exitSelectionMode();

    if (failures === 0) {
      showSuccess(
        callCount === 1
          ? t('conversation.messageForwarded')
          : t('conversation.messageForwardedMultiple', { count: callCount }),
        '',
      );
    } else if (failures < callCount) {
      showError(
        t('conversation.forwardPartialTitle'),
        t('conversation.forwardPartialBody', { ok: callCount - failures, ko: failures }),
      );
    } else {
      showError(t('common.error'), t('conversation.forwardError'));
    }
  };

  const handleSelectReaction = async (emoji: string) => {
    // Source : la ref qu'on a set au moment du 'react' action, sinon
    // fallback sur state.selectedMessage (cas ou le picker est ouvert
    // depuis un autre flow, ex: tap quick reaction).
    const targetMessage = reactionTargetMessageRef.current || state.selectedMessage;
    const messageId = targetMessage?.id;
    if (!messageId) return;

    const messageIdStr = String(messageId);
    actions.hideReactionPicker();
    reactionTargetMessageRef.current = null;

    try {
      if (isConnected && isAuthenticated) {
        wsAddReaction(messageIdStr, emoji);
      } else {
        await messagesAPI.addReaction(messageIdStr, emoji);
      }
      actions.addReaction(messageIdStr, emoji, String(user?.id));
    } catch (error) {
      if (__DEV__) console.error('Erreur ajout réaction:', error);
    }
  };

  // ============================================
  // SEND MESSAGE
  // ============================================

  const handleSend = async () => {
    if (state.sending) return;

    // Annule immediatement tout setTimeout de sauvegarde de brouillon. Sans
    // ce garde, l'envoi peut se finir en ~200ms (WS) puis le timer T+500
    // re-ecrit le draft avec le contenu deja envoye => au retour sur l'ecran
    // l'user voit son message envoye reapparaitre en brouillon.
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }

    // Auto-attache le voice en preview si l'user tape Send : le voice reste
    // dans `pendingVoiceUri` (etat preview) tant que l'user n'a pas valide
    // explicitement avec le bouton dedie. On le merge LOCALEMENT a la liste
    // d'attachments — pas via setState round-trip + setTimeout (stale closure
    // garantie), on travaille avec une variable locale jusqu'a la fin du send.
    let effectiveFiles = state.attachedFiles || [];
    const pickedUpVoice = pendingVoiceUri && pendingVoiceDuration > 0;
    if (pickedUpVoice) {
      effectiveFiles = [
        ...effectiveFiles,
        {
          uri: pendingVoiceUri!,
          name: `voice_${Date.now()}.m4a`,
          type: 'voice' as const,
          duration: pendingVoiceDuration,
        },
      ];
      // Clear preview state immediatement pour que la pill au-dessus de
      // l'input disparaisse sans attendre la fin du send.
      if (previewPlayerRef.current) {
        try { previewPlayerRef.current.remove(); } catch { /* noop */ }
        previewPlayerRef.current = null;
      }
      setVoicePreviewPlaying(false);
      setPendingVoiceUri(null);
      setPendingVoiceDuration(0);
    }

    const messageContent = state.newMessage.trim();
    const hasContent = messageContent.length > 0 || effectiveFiles.length > 0;
    if (!hasContent) return;

    // Lecture seule : on bloque l'envoi (filet de sécurité, l'UI désactive déjà
    // visuellement le toolbar).
    if (quotaState?.is_read_only) {
      showError(
        t('conversation.readOnlyDiscussionTitle'),
        t('conversation.readOnlyDiscussionMessage'),
      );
      return;
    }
    // Permissions d'écriture : muté ou mode restreint
    if ((quotaState as any)?.is_muted) {
      showError(t('conversation.mutedTitle'), t('conversation.mutedMessage'));
      return;
    }
    if (quotaState && (quotaState as any).can_post === false) {
      showError(
        t('conversation.postingLockedTitle'),
        t('conversation.postingLockedMessage'),
      );
      return;
    }

    const isEditing = !!state.editingMessage;

    actions.setNewMessage('');
    actions.setSending(true);
    // Suppression immediate du brouillon (pas seulement apres succes du send) :
    // si l'user navigue away avant la fin du await, le draft est deja parti.
    // Le removeItem en fin de handleSend reste comme filet de securite.
    const draftKey = state.conversationId ? `draft:${state.conversationId}` : null;
    if (draftKey) {
      AsyncStorage.removeItem(draftKey).catch(() => {});
    }

    try {
      // Mode édition
      if (isEditing && state.editingMessage) {
        const editMsgId = String(state.editingMessage.id);
        if (isConnected && isAuthenticated) {
          wsEditMessage(editMsgId, messageContent);
        } else {
          await messagesAPI.updateMessage(editMsgId, { content: messageContent });
        }
        actions.updateMessage(editMsgId, {
          content: messageContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        });
        actions.cancelEdit();
        actions.setSending(false);
        return;
      }

      let conversationIdToUse = state.conversationId;

      // Nouvelle conversation : créer avec le premier message atomiquement
      if (state.isNewConversation && userId && !state.conversationId) {
        const convResponse = await messagesAPI.createConversation({
          participant_ids: [Number(user?.id || 0), Number(userId)],
          message: messageContent,
        } as any);
        conversationIdToUse = convResponse.data.id;
        actions.setConversationId(conversationIdToUse);
        actions.setIsNewConversation(false);
        // Charger les messages depuis le backend (inclut le premier message)
        const msgsResponse = await messagesAPI.getMessages({ conversation: conversationIdToUse ?? undefined });
        const msgs = msgsResponse.data?.results || [];
        msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        msgs.forEach((m: any) => actions.addMessage(m));
        actions.setSending(false);
        return;
      }

      if (!conversationIdToUse) {
        throw new Error('Pas de conversation disponible');
      }

      // Optimistic update IMMÉDIAT — le tempMessage apparaît dans la liste
      // dès le tap sur "envoyer", même si les attachments ne sont pas encore
      // uploadés. Chaque attachment temporaire reçoit un id `tmp:...` qu'on
      // ajoute à `uploadingIds` ; MessageBubble affiche un overlay loader
      // tant que l'id figure dans ce Set.
      const tempMessageId = `temp-${Date.now()}`;
      const tempAttachments = effectiveFiles.map((f, i) => ({
        id: `tmp:${tempMessageId}:${i}`,
        file: f.uri,
        attachment_type: f.type,
        file_name: f.name,
        file_size: 0,
        mime_type: f.type === 'image' ? 'image/jpeg' : f.type === 'voice' ? 'audio/m4a' : 'application/octet-stream',
        duration_seconds: f.duration,
        uploaded_at: new Date().toISOString(),
      }));

      const tempMessage: Message = {
        id: tempMessageId,
        conversation: conversationIdToUse,
        sender: (user?.id ?? '') as any,
        sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || '',
        content: messageContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
        is_starred: false,
        is_edited: false,
        is_deleted: false,
        read_by: [],
        reply_to: state.replyToMessage?.id,
        attachments: tempAttachments,
      };

      actions.addMessage(tempMessage);
      actions.clearAttachedFiles();
      actions.cancelReply();

      // #6 Arme la fenetre d'undo (snackbar "Annuler" pendant 5s). On ne
      // l'attend pas ici : les uploads d'attachments peuvent se faire pendant
      // la fenetre pour ne pas ajouter 5s de latence percue. Seul l'ENVOI du
      // message est bloque, plus bas, sur `undoGate`.
      const undoGate = armUndoSend(tempMessageId);

      // Le message optimiste est affiche : on libere l'input tout de suite.
      // Sans ca, `sending` resterait vrai pendant les 5s de la fenetre d'undo
      // et bloquerait le bouton d'envoi (InputToolbar `disabled={sending}`).
      actions.setSending(false);

      // Marquer tous les attachments en upload pour l'overlay loader.
      // C. On enregistre aussi le timestamp de debut pour pouvoir basculer
      // vers l'overlay "Connexion lente" si l'upload tarde.
      if (tempAttachments.length > 0) {
        const now = Date.now();
        setUploadingIds(prev => {
          const next = new Set(prev);
          tempAttachments.forEach(a => {
            const id = String(a.id);
            next.add(id);
            uploadStartTimesRef.current.set(id, now);
          });
          return next;
        });
      }

      // Upload des attachments en parallèle pour réduire la latence totale.
      // Le backend distingue le field selon l'endpoint :
      //   - upload_attachment lit `request.FILES['file']`
      //   - upload_voice_message lit `request.FILES['audio']`
      // Cf. apps/user_messages/views.py:703,862.
      // Chaque promise retourne un { ok, id?, error?, code?, fileType }
      // pour qu'on puisse remonter à l'UI les raisons exactes des échecs
      // (taille, quota, mute, etc.) — l'erreur silencieuse précédente
      // laissait l'utilisateur dans le noir si une image était rejetée.
      type UploadOutcome =
        | { ok: true; id: string; tmpIdx: number; fileType: 'image' | 'voice' | 'document'; fileName: string }
        | { ok: false; error: string; code?: string; tmpIdx: number; fileType: 'image' | 'voice' | 'document'; fileName: string };

      const uploadOutcomes: UploadOutcome[] = await Promise.all(
        effectiveFiles.map(async (att, idx): Promise<UploadOutcome> => {
          const formData = new FormData();
          const fileFieldName = att.type === 'voice' ? 'audio' : 'file';
          formData.append(fileFieldName, {
            uri: att.uri,
            name: att.name,
            type: att.type === 'image' ? 'image/jpeg' : att.type === 'voice' ? 'audio/m4a' : 'application/octet-stream',
          } as any);
          formData.append('type', att.type);
          if (conversationIdToUse) {
            formData.append('conversation_id', String(conversationIdToUse));
          }

          try {
            const uploadResponse = att.type === 'voice'
              ? await messagesAPI.uploadVoiceMessage(formData)
              : await messagesAPI.uploadAttachment(formData);
            const id = uploadResponse.data?.id ? String(uploadResponse.data.id) : '';
            if (!id) {
              return { ok: false, error: t('conversation.errorInvalidResponse'), tmpIdx: idx, fileType: att.type, fileName: att.name };
            }
            // Pour les voices : on memorise le fichier local sous l'id backend.
            // Cela permet a playVoiceMessage de lire instantanement depuis le
            // disque local au lieu d'attendre que le serveur serve le fichier
            // (qui peut etre lent juste apres l'upload — bug "tourne longtemps").
            if (att.type === 'voice') {
              registerSentVoice(id, att.uri);
            }
            return { ok: true, id, tmpIdx: idx, fileType: att.type, fileName: att.name };
          } catch (uploadError: any) {
            if (__DEV__) console.error('Erreur upload attachment:', uploadError);
            const data = uploadError?.response?.data || {};
            const errorMsg: string = data.error || uploadError?.message || t('conversation.errorFallback');
            return {
              ok: false,
              error: errorMsg,
              code: data.code,
              tmpIdx: idx,
              fileType: att.type,
              fileName: att.name,
            };
          } finally {
            // Lever l'overlay loader sur cet attachment dès qu'il est résolu
            const id = `tmp:${tempMessageId}:${idx}`;
            setUploadingIds(prev => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            // C. Cleanup du tracking "slow upload"
            uploadStartTimesRef.current.delete(id);
            setSlowUploadIds(prev => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        })
      );

      const failedUploads = uploadOutcomes.filter((o): o is Extract<UploadOutcome, { ok: false }> => !o.ok);
      const attachmentIds: string[] = uploadOutcomes
        .filter((o): o is Extract<UploadOutcome, { ok: true }> => o.ok)
        .map(o => o.id);

      // A. Si on a un voice avec un silence d'ouverture detecte, on persiste
      // l'offset par attachment_id pour que la lecture (du moins cote
      // expediteur) skip le silence automatiquement. Le destinataire n'a pas
      // l'info sans un champ backend dedie — limitation acceptee pour l'MVP.
      if (pendingVoiceStartOffsetMs > 0) {
        const voiceOutcome = uploadOutcomes.find(
          (o): o is Extract<UploadOutcome, { ok: true }> => o.ok && o.fileType === 'voice',
        );
        if (voiceOutcome) {
          AsyncStorage.setItem(
            `voice_start_offset:${voiceOutcome.id}`,
            String(pendingVoiceStartOffsetMs),
          ).catch(() => {});
        }
        setPendingVoiceStartOffsetMs(0);
      }

      // Surface des erreurs d'upload à l'utilisateur. On distingue :
      //   - Tous échouent + pas de texte : envoi annulé (rollback complet)
      //   - Au moins un réussit OU il y a du texte : envoi du reste, on alerte
      //     juste sur les fichiers rejetés
      if (failedUploads.length > 0) {
        const labelOf = (ft: string) => ft === 'image' ? t('conversation.fileLabelImage') : ft === 'voice' ? t('conversation.fileLabelVoice') : t('conversation.fileLabelDocument');
        const codeMap: Record<string, string> = {
          file_too_large: t('conversation.errorTooLarge'),
          conversation_quota_exceeded: t('conversation.errorQuotaExceeded'),
          conversation_read_only: t('conversation.errorReadOnly'),
          user_muted: t('conversation.errorMuted'),
          posting_mode_restricted: t('conversation.errorPostingMode'),
        };
        const summary = failedUploads
          .map(f => {
            const reason = (f.code && codeMap[f.code]) || f.error;
            return `• ${labelOf(f.fileType)} — ${reason}`;
          })
          .join('\n');

        // Cas 1 : tous échouent + pas de texte → on rollback le tempMessage
        if (attachmentIds.length === 0 && messageContent.length === 0) {
          actions.removeTempMessages();
          showError(
            failedUploads.length > 1 ? t('conversation.filesRejectedPlural') : t('conversation.filesRejectedSingular'),
            summary,
          );
          return; // sort du try, le finally remet sending=false
        }

        // Cas 2 : au moins un succès OU du texte → on alerte ET on retire les
        // attachments échoués du tempMessage pour ne pas afficher de fantômes
        // (l'image apparaîtrait jusqu'à ce que le vrai message arrive et la
        // remplace, ce qui est trompeur).
        const failedTmpIds = new Set(
          failedUploads.map(f => `tmp:${tempMessageId}:${f.tmpIdx}`)
        );
        const remainingAttachments = (tempMessage.attachments || []).filter(
          a => !failedTmpIds.has(String(a.id))
        );
        actions.updateMessage(tempMessageId, { attachments: remainingAttachments });

        showError(
          failedUploads.length > 1 ? t('conversation.someFilesRejectedPlural') : t('conversation.someFilesRejectedSingular'),
          summary,
        );
      }

      // Barriere d'undo : rien ne part tant que la fenetre de 5s n'est pas
      // ecoulee. Si l'user a tape "Annuler", on s'arrete ici — le message
      // n'aura jamais atteint le serveur ni le destinataire.
      const shouldSend = await undoGate;
      if (!shouldSend) {
        // Les attachments deja uploades deviennent orphelins cote serveur (ils
        // ne sont rattaches a aucun message) ; le nettoyage periodique backend
        // s'en charge. Le message local a ete retire par performUndoSend.
        actions.setSending(false);
        return;
      }

      // Envoi via WebSocket ou REST. On passe l'id du tempMessage comme
      // client_temp_id : le serveur le renvoie dans `message.sent`, ce qui
      // permet de remplacer la bulle optimiste (au lieu d'un doublon avec
      // l'echo `message.new`).
      const wsSent = isConnected && isAuthenticated && wsSendMessage(
        conversationIdToUse,
        messageContent,
        state.replyToMessage?.id,
        attachmentIds.length > 0 ? attachmentIds : undefined,
        String(tempMessage.id),
      );

      if (!wsSent) {
        const response = await messagesAPI.sendMessage({
          conversation: conversationIdToUse,
          content: messageContent,
          reply_to: state.replyToMessage?.id != null ? String(state.replyToMessage.id) : undefined,
          attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
        });

        actions.updateMessage(String(tempMessage.id), response.data);
      }

      // Clear draft after successful send
      AsyncStorage.removeItem(`draft:${conversationIdToUse || state.conversationId}`).catch(() => {});

      // FlatList inversé affiche automatiquement les nouveaux messages en bas (index 0)
    } catch (error: any) {
      if (__DEV__) console.error('Erreur envoi message:', error);
      actions.removeTempMessages();
      // Cleanup des overlays loader si on a interrompu un upload
      setUploadingIds(new Set());

      // Backend a refuse l'envoi avec un code explicite : on affiche un
      // message clair au lieu de l'erreur generique. Couvre 403 (PermissionDenied)
      // ET 429 (Throttled) car les caps abuse retournent 429.
      const httpStatus = error?.response?.status;
      const errData = error?.response?.data || {};
      const reason = errData.reason || errData.code;
      if ((httpStatus === 403 || httpStatus === 429) && reason) {
        const reasonI18nMap: Record<string, { title: string; message: string; cleanupCTA?: boolean }> = {
          messaging_disabled: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.messagingDisabled'),
          },
          blocked: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.blocked'),
          },
          recipient_accepts_nobody: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.recipientAcceptsNobody'),
          },
          recipient_requires_connection: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.recipientRequiresConnection'),
          },
          recipient_pending_quota_exceeded: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.recipientPendingQuotaExceeded'),
          },
          previously_declined: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.previouslyDeclined'),
          },
          conversation_declined: {
            title: t('conversation.dmBlocked.title'),
            message: t('conversation.dmBlocked.conversationDeclined'),
          },
          pending_request_message_cap: {
            title: t('conversation.dmBlocked.pendingTitle'),
            message: t('conversation.dmBlocked.pendingMessageCap'),
          },
          daily_dm_limit_reached: {
            title: t('conversation.dmBlocked.dailyLimitTitle'),
            message: t('conversation.dmBlocked.dailyDmLimitReached'),
          },
          daily_upload_quota_exceeded: {
            title: t('conversation.dmBlocked.dailyLimitTitle'),
            message: t('conversation.dmBlocked.dailyUploadQuotaExceeded'),
          },
          conversation_message_cap: {
            title: t('conversation.dmBlocked.conversationFullTitle'),
            message: t('conversation.dmBlocked.conversationMessageCap'),
            cleanupCTA: true,
          },
          conversation_quota_exceeded: {
            title: t('conversation.dmBlocked.conversationFullTitle'),
            message: t('conversation.dmBlocked.conversationQuotaExceeded'),
            cleanupCTA: true,
          },
          conversation_read_only: {
            title: t('conversation.readOnlyDiscussionTitle'),
            message: t('conversation.readOnlyDiscussionMessage'),
          },
        };
        const entry = reasonI18nMap[reason];
        if (entry) {
          actions.setNewMessage(messageContent);
          if (entry.cleanupCTA) {
            // CTA "Faire du menage" : proposer de supprimer la conv ou des messages
            showAlert(
              entry.title,
              entry.message,
              [
                { text: t('common.cancel'), style: 'cancel' as const },
                {
                  text: t('conversation.cleanupActions.deleteConversation'),
                  style: 'destructive' as const,
                  onPress: async () => {
                    try {
                      if (state.conversationId) {
                        await messagesAPI.deleteConversation(String(state.conversationId));
                        navigation.goBack();
                      }
                    } catch (e: any) {
                      showError(t('common.error'), t('conversation.cleanupActions.deleteFailed'));
                    }
                  },
                },
              ],
              'warning' as const,
            );
            return;
          }
          showError(entry.title, entry.message);
          return;
        }
      }

      // Si pas de connexion, on enqueue le message dans la queue offline
      // persistante (AsyncStorage). Il sera rejoué dès que isConnected===true.
      // Note : on ne peut pas enqueue les attachments (ils sont locaux uri),
      // donc on enqueue le texte seul. Si l'utilisateur veut renvoyer les
      // attachments, il devra les ré-attacher.
      const conversationIdToUse = state.conversationId;
      if (!isConnected && conversationIdToUse && messageContent) {
        try {
          await offlineQueue.enqueue(
            String(conversationIdToUse),
            messageContent,
            state.replyToMessage?.id ? String(state.replyToMessage.id) : undefined,
            [],
          );
          showSuccess(
            t('conversation.pendingMessageTitle'),
            t('conversation.pendingMessageMessage'),
          );
        } catch {
          actions.setNewMessage(messageContent);
          showError(t('common.error'), t('conversation.sendError'));
        }
      } else {
        actions.setNewMessage(messageContent);
        showError(t('common.error'), t('conversation.sendError'));
      }
    } finally {
      actions.setSending(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // In inverted FlatList, scrolling "up" (to older messages) increases offsetY
    setShowScrollToBottom(offsetY > 300);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Scroll-to-original quand l'user tap le reply preview d'un message.
  // FlatList est inversee → index 0 = msg le plus recent (en bas), donc on
  // peut directement utiliser l'index dans state.messages (ordre desc).
  // Si le msg n'est pas dans la fenetre actuellement chargee (pagination
  // upward), on signale via toast — l'user devra remonter manuellement.
  const handleReplyPress = useCallback((originalId: number | string) => {
    const idStr = String(originalId);
    const idx = state.messages.findIndex((m: any) => String(m.id) === idStr);
    if (idx === -1) {
      showError(
        t('common.info', { defaultValue: 'Info' }),
        t('conversation.replyOriginalNotLoaded', {
          defaultValue: 'Le message original n\'est pas encore chargé. Remonte pour le voir.',
        }),
      );
      return;
    }
    try {
      flatListRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.5, // centre le msg dans la vue
      });
    } catch {
      // scrollToIndex peut throw si l'item est trop loin (getItemLayout
      // pas dispo). Fallback : scrollToOffset approximatif.
    }
  }, [state.messages, t, showError]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item, user?.id);
    const showDate = shouldShowDateSeparator(state.messages, index);
    const replyToContent = getReplyToContent(
      item.reply_to != null && typeof item.reply_to !== 'object' ? String(item.reply_to) : item.reply_to,
      state.messages
    );

    // System messages rendered as centered pills
    if (item.message_type === 'system') {
      return (
        <View>
          {showDate && (
            <View style={styles.dateContainer}>
              <Text style={[styles.dateText, { color: colors.gray500, backgroundColor: colors.card }]}>{formatMessageDate(item.created_at)}</Text>
            </View>
          )}
          <View style={styles.systemMessageContainer}>
            <Text style={[styles.systemMessageText, { color: colors.gray500, backgroundColor: colors.gray100 }]}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // Message grouping: in inverted FlatList, index+1 is the visually previous (above) message
    const nextItem = index < state.messages.length - 1 ? state.messages[index + 1] : null;
    // sender peut être un number (REST/temp) ou un objet { id, ... } (payload WS).
    // On extrait l'id de manière robuste pour que le grouping fonctionne aussi
    // après dédup tempMessage ↔ vrai message (cf. useMessageState ADD_MESSAGE).
    const senderIdOf = (s: any): string => {
      if (s == null) return '';
      if (typeof s === 'object' && s.id != null) return String(s.id);
      return String(s);
    };
    const isGrouped = nextItem &&
      nextItem.message_type !== 'system' &&
      senderIdOf(nextItem.sender) === senderIdOf(item.sender) &&
      (new Date(item.created_at).getTime() - new Date(nextItem.created_at).getTime()) < 120000;

    const msgId = Number(item.id);
    const isSelected = selectedIds.has(msgId);
    // En mode selection, on intercepte les taps : la bubble interne devient
    // visuelle uniquement, et un wrapper Pressable au-dessus toggle l'item.
    // Long-press desactive aussi pour ne pas re-ouvrir le menu d'actions.
    const bubble = (
      <MessageBubble
        message={item}
        isMine={isMine}
        isGrouped={!!isGrouped}
        replyToMessage={replyToContent}
        otherUserId={state.otherUserId}
        playingVoiceId={state.playingVoiceId}
        voicePlayback={voicePlayback}
        uploadingAttachmentIds={uploadingIds}
        slowUploadAttachmentIds={slowUploadIds}
        onLongPress={selectionMode ? (() => {}) : handleMessageLongPress}
        onPlayVoice={selectionMode ? () => {} : playVoiceMessage}
        onSeekVoice={selectionMode ? () => {} : seekVoiceMessage}
        onSkipForward={skipForward15s}
        onCyclePlaybackRate={cyclePlaybackRate}
        playbackRate={playbackRate}
        listenedVoiceIds={listenedVoiceIds}
        onForward={selectionMode ? () => {} : handleForwardMessage}
        onReplyPress={selectionMode ? undefined : handleReplyPress}
      />
    );

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: colors.gray500, backgroundColor: colors.card }]}>{formatMessageDate(item.created_at)}</Text>
          </View>
        )}
        {selectionMode ? (
          <Pressable
            onPress={() => toggleMessageSelection(msgId)}
            style={[
              styles.selectionRow,
              isSelected && { backgroundColor: colors.primary + '14' },
            ]}
          >
            <View style={styles.selectionCheckCol}>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isSelected ? colors.primary : colors.gray400}
              />
            </View>
            <View style={{ flex: 1 }} pointerEvents="none">
              {bubble}
            </View>
          </Pressable>
        ) : (
          bubble
        )}
      </View>
    );
  }, [
    state.messages, state.otherUserId, state.playingVoiceId, voicePlayback,
    uploadingIds, slowUploadIds, user?.id, handleMessageLongPress, seekVoiceMessage,
    skipForward15s, cyclePlaybackRate, playbackRate, listenedVoiceIds, handleReplyPress,
    selectionMode, selectedIds, toggleMessageSelection, colors.primary, colors.gray400,
  ]);

  const renderSearchResultItem = useCallback(({ item }: { item: Message }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { borderBottomColor: colors.gray100 }]}
      onPress={closeSearch}
    >
      <Text style={[styles.searchResultSender, { color: colors.primary }]} numberOfLines={1}>
        {item.sender_name}
      </Text>
      <Text style={[styles.searchResultContent, { color: colors.text }]} numberOfLines={2}>
        {item.content}
      </Text>
      <Text style={[styles.searchResultTime, { color: colors.gray400 }]}>
        {new Date(item.created_at).toLocaleDateString(dateLocale)}
      </Text>
    </TouchableOpacity>
  ), [colors.gray100, colors.primary, colors.text, colors.gray400, closeSearch]);

  const renderEmpty = () => {
    // Erreur de chargement prioritaire sur le empty state vide.
    if (messagesLoadError) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="cloud-offline-outline" size={48} color="#991B1B" />
          </View>
          <Text style={[styles.emptyText, { color: '#991B1B' }]}>
            {t('conversation.messagesLoadErrorTitle')}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.gray500 }]} numberOfLines={3}>
            {messagesLoadError}
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: Spacing.md,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.sm,
              borderRadius: BorderRadius.full,
              backgroundColor: colors.primary,
            }}
            onPress={() => {
              setMessagesLoadError(null);
              actions.setLoading(true);
              fetchMessages();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={{ fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' }}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.gray300} />
        </View>
        <Text style={[styles.emptyText, { color: colors.gray500 }]}>
          {state.isNewConversation ? t('conversation.newConversation') : t('conversation.noMessages')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
          {state.isNewConversation
            ? t('conversation.newConversationHint', { name: state.conversationTitle })
            : t('conversation.startConversationHint')}
        </Text>
      </View>
    );
  };

  const renderLoadingMore = () => {
    if (!state.loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const handleLoadMore = () => {
    if (state.hasMore && !state.loadingMore) {
      fetchMessages(true);
    }
  };

  const headerTitle = state.conversationTitle || userName || '';
  const headerAvatar = state.otherUserAvatar;
  // Pour les conversations directes, on récupère l'autre participant depuis
  // conversationDetails pour exposer son statut de présence + last_seen +
  // badge organizer vérifié. Conv groupe : on ne montre pas ces infos
  // individuelles (le header affiche l'event source via `fromEvent`).
  const otherParticipant: any = useMemo(() => {
    if (conversationType !== 'direct') return null;
    return conversationDetails?.participants?.find((p: any) => String(p.id) !== String(user?.id)) || null;
  }, [conversationType, conversationDetails?.participants, user?.id]);
  // Formate "En ligne" / "Vu il y a Xm/Xh/Xj" pour le subtitle du header.
  // Renvoie null si l'utilisateur a opt-out de presence (presence_visible=false
  // côté backend → last_seen=null, status='offline').
  const presenceLabel = useMemo(() => {
    if (!otherParticipant) return null;
    if (otherParticipant.presence_status === 'online') return t('conversation.presenceOnline');
    const lastSeen = otherParticipant.last_seen;
    if (!lastSeen) return null;
    const date = new Date(lastSeen);
    const ms = Date.now() - date.getTime();
    if (ms < 60_000) return t('conversation.presenceJustNow');
    const minutes = Math.round(ms / 60_000);
    if (minutes < 60) return t('conversation.presenceMinutes', { count: minutes });
    const hours = Math.round(ms / 3_600_000);
    if (hours < 24) return t('conversation.presenceHours', { count: hours });
    const days = Math.round(ms / 86_400_000);
    if (days < 7) return t('conversation.presenceDays', { count: days });
    // Au-delà d'une semaine on bascule sur la date pour ne pas afficher "vu il y a 42 jours" qui paraît bizarre.
    return t('conversation.presenceDate', { date: date.toLocaleDateString(dateLocale) });
  }, [otherParticipant, t, dateLocale]);
  const showVerifiedBadge = !!otherParticipant?.is_organizer_verified;
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  // Tap sur le header → navigation vers le profile de l'interlocuteur (DM)
  // ou rien (group/event — la bannière event juste en dessous gère le link).
  const handleHeaderTap = () => {
    if (conversationType === 'direct' && state.otherUserId) {
      navigation.navigate('OrganizerProfile', { organizerId: String(state.otherUserId) });
    } else if (eventContext) {
      navigation.navigate('EventDetails', { eventId: eventContext.slug || eventContext.id });
    }
  };

  const renderCustomHeader = () => {
    // En mode selection, on remplace tout le header par une action bar :
    // X (sortir) + count + delete + forward. Pattern WhatsApp.
    if (selectionMode) {
      const selCount = selectedIds.size;
      return (
        <View
          style={[
            styles.customHeader,
            { backgroundColor: colors.primary + '14', borderBottomColor: hairline },
          ]}
        >
          <TouchableOpacity
            onPress={exitSelectionMode}
            style={styles.customHeaderBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.selectionCount, { color: colors.text }]}>
            {t('conversation.selectionCount', { count: selCount })}
          </Text>
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={handleBulkForward}
            disabled={selCount === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('conversation.bulkForwardA11y')}
          >
            <Ionicons name="arrow-redo" size={22} color={selCount === 0 ? colors.gray400 : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={handleBulkDelete}
            disabled={selCount === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('conversation.bulkDeleteA11y')}
          >
            <Ionicons name="trash" size={22} color={selCount === 0 ? colors.gray400 : '#DC2626'} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
    <View
      style={[
        styles.customHeader,
        {
          backgroundColor: colors.background,
          borderBottomColor: hairline,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.customHeaderBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.customHeaderTitle}
        onPress={handleHeaderTap}
        activeOpacity={0.7}
        disabled={conversationType !== 'direct' && !eventContext}
        accessibilityRole="button"
        accessibilityLabel={t('conversation.headerTapA11y')}
      >
        {headerAvatar ? (
          <Image
            source={headerAvatar}
            style={styles.headerAvatar}
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerAvatarText}>
              {headerTitle.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={[styles.headerTitleText, { color: colors.text, flexShrink: 1 }]}
              numberOfLines={1}
            >
              {headerTitle}
            </Text>
            {/* Badge "vérifié" pour organisateurs avec OrganizerProfile.verified_status.
                Inline avec le nom — pattern Twitter / Instagram. */}
            {showVerifiedBadge && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.primary}
                accessibilityLabel={t('conversation.organizerVerifiedA11y')}
              />
            )}
          </View>
          {/* Sous-titre : priorité au statut de présence pour les conv
              directes (pattern WhatsApp), sinon event source pour les groupes. */}
          {presenceLabel ? (
            <Text
              style={[
                styles.headerSubtitle,
                { color: otherParticipant?.presence_status === 'online' ? '#10B981' : colors.gray500 },
              ]}
              numberOfLines={1}
            >
              {presenceLabel}
            </Text>
          ) : eventContext ? (
            <Text
              style={[styles.headerSubtitle, { color: colors.accent }]}
              numberOfLines={1}
            >
              {t('conversation.fromEvent', { name: eventContext.title })}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerMenuButton}
        onPress={() => {
          setSearchOpen(s => !s);
          setSearchQuery('');
          setSearchResults([]);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={searchOpen ? 'close' : 'search'} size={20} color={colors.gray700} />
      </TouchableOpacity>
      {state.conversationId ? (
        <TouchableOpacity
          style={styles.headerMenuButton}
          onPress={handleShowConversationOptions}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.gray700} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerMenuButton} />
      )}
    </View>
    );
  };

  if (state.loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>{t('conversation.watermark')}</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          {renderCustomHeader()}
          <ConversationSkeleton />
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>{t('conversation.watermark')}</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {renderCustomHeader()}

      {/* Search bar (shown when searchOpen) */}
      {searchOpen && (
        <View style={[styles.searchBar, { backgroundColor: colors.gray100, borderBottomColor: colors.gray200 }]}>
          <Ionicons name="search" size={16} color={colors.gray400} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('conversation.searchPlaceholder')}
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={handleMessageSearch}
            autoFocus
          />
          {searchLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />}
        </View>
      )}

      {/* Search results */}
      {searchOpen && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={item => String(item.id)}
          style={[styles.searchResultsList, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          renderItem={renderSearchResultItem}
        />
      )}

      {/* No results hint */}
      {searchOpen && searchQuery.trim().length > 0 && !searchLoading && searchResults.length === 0 && (
        <View style={[styles.searchNoResults, { backgroundColor: colors.background }]}>
          <Text style={[styles.searchNoResultsText, { color: colors.gray400 }]}>
            {t('conversation.noSearchResults', { query: searchQuery })}
          </Text>
        </View>
      )}

      {/* Connection Status — banner orange "Reconnexion…" avec spinner ;
           rouge si erreur fatale (max_connections, etc.) */}
      {!isConnected && state.conversationId && (
        <View
          style={[
            styles.connectionStatus,
            {
              backgroundColor: wsConnectionError ? colors.error : colors.warning,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 6,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
            {!wsConnectionError ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="warning-outline" size={16} color={colors.white} />
            )}
            <Text style={[styles.connectionStatusText, { color: colors.white, flex: 1 }]}>
              {wsConnectionError ? wsConnectionError : t('conversation.reconnecting')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => wsReconnect()}
            accessibilityRole="button"
            accessibilityLabel={t('conversation.retryA11y')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              marginLeft: 8,
            }}
          >
            <Text style={[styles.connectionStatusText, { color: colors.white }]}>
              {t('conversation.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bannière event source — affichée quand la conv est liée à un event,
          peu importe le type. Donne le contexte instantanément et permet de
          retourner à l'event en un tap (use case organizer fréquent). */}
      {eventContext && (
        <TouchableOpacity
          style={[
            styles.eventBanner,
            { backgroundColor: colors.card, borderColor: hairline },
          ]}
          onPress={() => navigation.navigate('EventDetails', { eventId: eventContext.slug || eventContext.id })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('conversation.openEventA11y', { name: eventContext.title })}
        >
          {eventContext.banner ? (
            <Image
              source={eventContext.banner}
              style={styles.eventBannerThumb}
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View style={[styles.eventBannerThumb, { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="calendar" size={18} color={colors.gray500} />
            </View>
          )}
          <View style={styles.eventBannerBody}>
            <Text style={[styles.eventBannerEyebrow, { color: colors.accent }]} numberOfLines={1}>
              {t('conversation.eventBannerEyebrow')}
            </Text>
            <Text style={[styles.eventBannerTitle, { color: colors.text }]} numberOfLines={1}>
              {eventContext.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
        </TouchableOpacity>
      )}

      {/* Banner quota / cycle de vie (groupes / event uniquement) */}
      {state.conversationId && conversationType && conversationType !== 'direct' && (
        <ConversationQuotaBanner
          conversationId={state.conversationId}
          conversationType={conversationType}
          onQuotaUpdate={(s) => setQuotaState(s)}
        />
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        // Le KAV ne sait PAS qu'on rend un custom header AU-DESSUS de lui
        // (renderCustomHeader, styles.customHeader = back-button 40 + paddingY
        // 8+8 = 56px) ni qu'il y a une status bar (insets.top, 24~44px).
        // Sans cet offset, le KAV calcule la distance keyboard↔écran à partir
        // de son origine au lieu de l'origine de la SafeAreaView, ce qui lui
        // fait sous-estimer la place à laisser → bas de l'input sous le clavier.
        keyboardVerticalOffset={insets.top}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={state.messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.messagesList,
              chatMaxWidth ? centeredContent(chatMaxWidth) : null,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderLoadingMore}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            inverted={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />

          {/* Scroll to bottom button */}
          {showScrollToBottom && (
            <TouchableOpacity
              style={[styles.scrollToBottomButton, { backgroundColor: colors.card, borderColor: colors.gray200 }]}
              onPress={scrollToBottom}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={22} color={colors.gray700} />
            </TouchableOpacity>
          )}
        </View>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator typingUsers={typingUsers} />
        )}

        {/* Anti-spam DM : banner pending_request — style editorial.
              - Initiator : eyebrow "EN ATTENTE" + titre + subtitle (indigo)
              - Recipient : eyebrow "DEMANDE" + titre + subtitle + pill CTAs (corail) */}
        {conversationDetails?.request_status === 'pending_request' && (() => {
          const isInitiator = conversationDetails?.request_initiator === user?.id
            || conversationDetails?.request_initiator?.id === user?.id;
          if (isInitiator) {
            return (
              <View style={[styles.pendingBanner, { backgroundColor: `${colors.primary}10`, borderTopColor: colors.primary }]}>
                <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.pendingBannerEyebrow, { color: colors.primary }]}>
                    {t('messageRequests.eyebrow')}
                  </Text>
                  <Text style={[styles.pendingBannerTitle, { color: colors.text }]}>
                    {t('conversation.pendingBanner.title')}
                  </Text>
                  <Text style={[styles.pendingBannerSubtitle, { color: colors.gray600 }]}>
                    {t('conversation.pendingBanner.subtitle')}
                  </Text>
                </View>
              </View>
            );
          }
          // Recipient : preview + actions
          return (
            <View style={[styles.pendingBanner, { backgroundColor: `${colors.accent}10`, borderTopColor: colors.accent }]}>
              <Ionicons name="mail-open-outline" size={20} color={colors.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.pendingBannerEyebrow, { color: colors.accent }]}>
                  {t('messageRequests.eyebrow')}
                </Text>
                <Text style={[styles.pendingBannerTitle, { color: colors.text }]}>
                  {t('conversation.pendingBanner.previewTitle')}
                </Text>
                <Text style={[styles.pendingBannerSubtitle, { color: colors.gray600 }]}>
                  {t('conversation.pendingBanner.previewSubtitle')}
                </Text>
                <View style={styles.pendingBannerActions}>
                  <TouchableOpacity
                    style={[styles.pendingBannerBtn, styles.pendingBannerBtnGhost, { borderColor: colors.gray300 }]}
                    onPress={async () => {
                      try {
                        await messagesAPI.declineMessageRequest(String(state.conversationId));
                        navigation.goBack();
                      } catch (e: any) {
                        showError(t('common.error'), String(e?.response?.data?.error || t('messageRequests.declineFailed')));
                      }
                    }}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Text style={[styles.pendingBannerBtnText, { color: colors.gray700 }]}>
                      {t('conversation.pendingBanner.decline')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pendingBannerBtn, styles.pendingBannerBtnPrimary, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      try {
                        const res = await messagesAPI.acceptMessageRequest(String(state.conversationId));
                        setConversationDetails((prev: any) => prev ? { ...prev, ...res.data } : res.data);
                      } catch (e: any) {
                        showError(t('common.error'), String(e?.response?.data?.error || t('messageRequests.acceptFailed')));
                      }
                    }}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Text style={[styles.pendingBannerBtnText, { color: Colors.white }]}>
                      {t('conversation.pendingBanner.accept')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Anti-spam : pending_request → input toujours masque (le backend
             cap a 1 message pour l'initiator, et le recipient doit accepter
             avant de pouvoir repondre). La banner au-dessus suffit. On
             preserve quand meme la SafeArea bottom pour eviter que la liste
             touche le bord de l'ecran. */}
        {(() => {
          const isPending = conversationDetails?.request_status === 'pending_request';
          return isPending;
        })() ? (
          <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }} />
        ) : (quotaState?.is_read_only || (quotaState as any)?.is_muted || (quotaState && (quotaState as any).can_post === false)) ? (
          <View style={{
            paddingBottom: insets.bottom + 12,
            paddingTop: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.gray200,
            alignItems: 'center',
          }}>
            <Ionicons name="lock-closed" size={18} color={colors.gray500} />
            <Text style={{ color: colors.gray600, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              {quotaState?.is_read_only
                ? t('conversation.readOnlyLockMessage')
                : (quotaState as any)?.is_muted
                  ? t('conversation.mutedLockMessage')
                  : t('conversation.postingLockMessage')}
            </Text>
          </View>
        ) : (
          <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
            {/* Fond composer bord-à-bord ; seul le contenu (composer + bannières)
                est plafonné + centré sur iPad. */}
            <View style={chatMaxWidth ? centeredContent(chatMaxWidth) : undefined}>
            {/* Voice preview bar — shown after stopping a recording, before send */}
            {pendingVoiceUri && (
              <View style={[styles.voicePreviewBar, { backgroundColor: colors.card, borderTopColor: colors.gray200 }]}>
                <TouchableOpacity
                  onPress={toggleVoicePreview}
                  style={[styles.voicePreviewPlayBtn, { backgroundColor: colors.primary }]}
                  accessibilityLabel={voicePreviewPlaying ? t('conversation.voicePreviewStopA11y') : t('conversation.voicePreviewPlayA11y')}
                >
                  <Ionicons name={voicePreviewPlaying ? 'stop' : 'play'} size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.voicePreviewLabel, { color: colors.gray700 }]}>
                  {t('conversation.voicePreviewLabel', { duration: pendingVoiceDuration })}
                </Text>
                <View style={styles.voicePreviewActions}>
                  <TouchableOpacity
                    onPress={discardPendingVoice}
                    style={[styles.voicePreviewBtn, { backgroundColor: colors.gray100 }]}
                    accessibilityLabel={t('conversation.voicePreviewDeleteA11y')}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.gray500} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={sendPendingVoice}
                    style={[styles.voicePreviewBtn, { backgroundColor: colors.primary }]}
                    accessibilityLabel={t('conversation.voicePreviewSendA11y')}
                  >
                    <Ionicons name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* Banner "messages en attente" — orange. Filtré sur les messages
                de la conv courante seulement (la queue est globale par user). */}
            {(() => {
              const convId = String(state.conversationId || '');
              const convQueue = offlineQueue.queue.filter(m => m.conversationId === convId);
              const pending = convQueue.filter(m => !m.failed);
              const failed = convQueue.filter(m => m.failed);
              return (
                <>
                  {pending.length > 0 && (
                    <View style={styles.offlineQueueBanner}>
                      <Ionicons name="time-outline" size={14} color="#92400E" />
                      <Text style={styles.offlineQueueBannerText}>
                        {pending.length === 1
                          ? t('conversation.pendingQueueSingular')
                          : t('conversation.pendingQueuePlural', { count: pending.length })}
                        {offlineQueue.isSyncing ? t('conversation.pendingQueueSyncing') : ''}
                      </Text>
                    </View>
                  )}
                  {failed.length > 0 && (
                    <TouchableOpacity
                      style={styles.failedQueueBanner}
                      onPress={() => setFailedMessagesModalVisible(true)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('conversation.failedQueueA11y')}
                    >
                      <Ionicons name="alert-circle" size={16} color="#991B1B" />
                      <Text style={styles.failedQueueBannerText}>
                        {failed.length === 1
                          ? t('conversation.failedQueueSingular')
                          : t('conversation.failedQueuePlural', { count: failed.length })}
                      </Text>
                      <Text style={styles.failedQueueBannerCta}>
                        {t('conversation.failedQueueView')}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#991B1B" />
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
            {/* Quick replies — visible uniquement pour l'organisateur d'un
                event group. Permet d'insérer rapidement les réponses
                récurrentes (adresse, horaire, programme). Pattern Eventbrite. */}
            {quotaState?.is_organizer && conversationType !== 'direct' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRepliesStrip}
                keyboardShouldPersistTaps="handled"
              >
                {[
                  { key: 'address', icon: 'location-outline' as const, label: t('conversation.quickReplyAddress'), tpl: t('conversation.quickReplyAddressTpl') },
                  { key: 'schedule', icon: 'time-outline' as const, label: t('conversation.quickReplySchedule'), tpl: t('conversation.quickReplyScheduleTpl') },
                  { key: 'agenda', icon: 'list-outline' as const, label: t('conversation.quickReplyAgenda'), tpl: t('conversation.quickReplyAgendaTpl') },
                  { key: 'dressCode', icon: 'shirt-outline' as const, label: t('conversation.quickReplyDressCode'), tpl: t('conversation.quickReplyDressCodeTpl') },
                  { key: 'parking', icon: 'car-outline' as const, label: t('conversation.quickReplyParking'), tpl: t('conversation.quickReplyParkingTpl') },
                  { key: 'thanks', icon: 'heart-outline' as const, label: t('conversation.quickReplyThanks'), tpl: t('conversation.quickReplyThanksTpl') },
                ].map((tpl) => (
                  <TouchableOpacity
                    key={tpl.key}
                    style={[styles.quickReplyChip, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
                    onPress={() => {
                      // Pré-remplit l'input avec le template. L'organizer
                      // peut éditer avant d'envoyer (mode "smart template").
                      const current = state.newMessage.trim();
                      const next = current ? `${current}\n${tpl.tpl}` : tpl.tpl;
                      actions.setNewMessage(next);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={tpl.label}
                  >
                    <Ionicons name={tpl.icon} size={13} color={colors.primary} />
                    <Text style={[styles.quickReplyChipText, { color: colors.primary }]}>{tpl.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {/* #6 Snackbar Undo Send — l'envoi reel est differe tant qu'elle
                est visible, d'ou "Envoi en cours" et non "Message envoye". */}
            {pendingUndoMessage && (
              <Animated.View
                style={[
                  styles.undoSnackbar,
                  {
                    backgroundColor: colors.gray900,
                    transform: [{
                      translateY: undoSnackbarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    }],
                    opacity: undoSnackbarAnim,
                  },
                ]}
              >
                <Text style={[styles.undoSnackbarText, { color: '#FFFFFF' }]}>
                  {t('conversation.messageSending')}
                </Text>
                <TouchableOpacity
                  onPress={performUndoSend}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.undoSnackbarAction, { color: colors.accent }]}>
                    {t('conversation.undo')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            <InputToolbar
              value={state.newMessage}
              onChangeText={(text) => {
                actions.setNewMessage(text);
                handleTyping();
                if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
                const convId = state.conversationId;
                if (convId) {
                  // Si le champ devient vide, on supprime le brouillon
                  // immediatement plutot que d'attendre 500ms.
                  if (!text) {
                    AsyncStorage.removeItem(`draft:${convId}`).catch(() => {});
                  } else {
                    draftSaveTimeoutRef.current = setTimeout(() => {
                      AsyncStorage.setItem(`draft:${convId}`, `${Date.now()}|${text}`).catch(() => {});
                    }, 500);
                  }
                }
              }}
              onSend={handleSend}
              sending={state.sending}
              attachedFiles={state.attachedFiles}
              onPickImage={handlePickImage}
              onPickDocument={handlePickDocument}
              onRemoveAttachment={handleRemoveAttachment}
              isRecording={state.isRecording}
              recordingDuration={state.recordingDuration}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancelRecording={cancelRecording}
              meteringLevel={recorderState?.metering}
              isRecordingLocked={isRecordingLocked}
              onLockRecording={() => setIsRecordingLocked(true)}
              replyToMessage={state.replyToMessage}
              editingMessage={state.editingMessage}
              onCancelReply={actions.cancelReply}
              onCancelEdit={actions.cancelEdit}
            />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modals */}
      <MessageActionModal
        visible={state.showActionMenu}
        message={state.selectedMessage}
        userId={user?.id}
        conversationType={conversationType}
        onClose={actions.hideActionMenu}
        onAction={handleMessageAction}
      />

      <ReportMessageModal
        visible={showReportModal}
        submitting={submittingReport}
        onClose={() => {
          if (!submittingReport) {
            setShowReportModal(false);
            setReportTargetMessage(null);
          }
        }}
        onSubmit={handleSubmitReport}
      />

      <ReactionPickerModal
        visible={state.showReactionPicker}
        onClose={actions.hideReactionPicker}
        onSelectReaction={handleSelectReaction}
      />

      <ForwardModal
        visible={state.showForwardModal}
        targets={state.forwardTargets}
        loading={state.loadingForwardTargets}
        searchQuery={forwardSearchQuery}
        onSearchChange={setForwardSearchQuery}
        onClose={() => {
          // Clear la ref pour ne pas conserver une référence à un message
          // potentiellement déjà mis à jour / supprimé après la fermeture.
          forwardSourceMessageRef.current = null;
          actions.hideForwardModal();
        }}
        onSendToTargets={handleForwardToTargets}
      />

      {/* Panel d'admin du groupe (organizer uniquement) */}
      {state.conversationId && conversationDetails && (
        <GroupAdminPanel
          visible={showGroupAdminPanel}
          conversationId={state.conversationId}
          participants={conversationDetails.participants || []}
          initialPostingMode={(conversationDetails.posting_mode || quotaState?.posting_mode || 'all') as any}
          organizerId={
            conversationDetails.event?.organizer_id
            ?? conversationDetails.event?.organizer
            ?? null
          }
          onClose={() => setShowGroupAdminPanel(false)}
          onMutationApplied={() => {
            // Force le banner à re-fetcher l'état quota au prochain render
            setQuotaState(null);
          }}
        />
      )}

      {/* Bottom sheet d'options conversation — remplace l'Alert natif L504. */}
      <EventActionsSheet
        visible={convOptionsSheetVisible}
        onClose={() => setConvOptionsSheetVisible(false)}
        title={state.conversationTitle || t('conversation.optionsTitle')}
        subtitle={t('conversation.optionsTitle')}
        sections={convOptionsSections}
      />

      {/* Liste des participants — accessible à tous les membres (vs
          GroupAdminPanel qui est admin-only). Lecture seule. Tap sur un
          participant → ouvre son profil (pour l'organizer ; les autres users
          n'ont pas de profile public donc on les ignore en silence). */}
      <Modal
        visible={participantsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setParticipantsModalVisible(false)}
      >
        <View style={styles.failedModalBackdrop}>
          <View style={[styles.failedModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.failedModalEyebrow, { color: colors.accent }]}>
              {t('conversation.participantsEyebrow')}
            </Text>
            <Text style={[styles.failedModalTitle, { color: colors.text }]}>
              {t('conversation.viewParticipantsCount', {
                count: conversationDetails?.participants?.length || 0,
              })}
            </Text>
            <FlatList
              data={conversationDetails?.participants || []}
              keyExtractor={(item: any) => String(item.id)}
              style={{ maxHeight: 380 }}
              renderItem={({ item }: { item: any }) => {
                const isOrganizer =
                  conversationDetails?.event?.organizer_id === item.id ||
                  conversationDetails?.event?.organizer === item.id;
                const isMe = String(item.id) === String(user?.id);
                const name = `${item.first_name || ''} ${item.last_name || ''}`.trim()
                  || item.full_name
                  || item.email
                  || t('conversation.defaultUserName');
                const avatar = getMediaUrl(item.profile_picture || item.image);
                const initials = (name || '?').slice(0, 2).toUpperCase();
                const navigateToProfile = () => {
                  if (!isMe) {
                    setParticipantsModalVisible(false);
                    navigation.navigate('OrganizerProfile', { organizerId: String(item.id) });
                  }
                };
                return (
                  <TouchableOpacity
                    style={[styles.participantRow, { borderBottomColor: colors.gray100 }]}
                    onPress={navigateToProfile}
                    activeOpacity={isMe ? 1 : 0.7}
                    disabled={isMe}
                  >
                    {avatar ? (
                      <Image source={avatar} style={styles.participantAvatar} cachePolicy="memory-disk" transition={150} />
                    ) : (
                      <View style={[styles.participantAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={styles.participantInitials}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                        {name}{isMe ? ` ${t('conversation.participantYou')}` : ''}
                      </Text>
                      {item.email && (
                        <Text style={[styles.participantEmail, { color: colors.gray500 }]} numberOfLines={1}>
                          {item.email}
                        </Text>
                      )}
                    </View>
                    {isOrganizer && (
                      <View style={[styles.organizerBadge, { backgroundColor: `${colors.accent}18` }]}>
                        <Ionicons name="star" size={11} color={colors.accent} />
                        <Text style={[styles.organizerBadgeText, { color: colors.accent }]}>
                          {t('conversation.organizerBadge')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.failedItemEmpty, { color: colors.gray400 }]}>
                  {t('conversation.participantsEmpty')}
                </Text>
              }
            />
            <View style={styles.failedModalActions}>
              <TouchableOpacity
                style={[styles.failedModalBtn, { backgroundColor: colors.primary }]}
                onPress={() => setParticipantsModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.failedModalBtnText, { color: '#fff' }]}>
                  {t('common.close')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === MEDIA GALLERY MODAL ===
          Agrège les attachments (photos / documents) de TOUS les messages
          déjà fetched. Limité à state.messages — pour une galerie exhaustive
          il faudrait un endpoint dédié /messages/attachments?conversation=…
          Pour l'instant ça couvre 80% du besoin (retrouver une photo récente). */}
      {(() => {
        const allAttachments = state.messages.flatMap(m => m.attachments || []);
        const photos = allAttachments.filter(a => a.attachment_type === 'image');
        const docs = allAttachments.filter(a => a.attachment_type === 'document' || a.attachment_type === 'other');
        const photoUris = photos.map(a => ({ uri: typeof a.file === 'string' ? a.file : '' }));
        return (
          <>
            <Modal
              visible={mediaGalleryVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setMediaGalleryVisible(false)}
            >
              <View style={[styles.mediaGalleryCard, { backgroundColor: colors.background }]}>
                <View style={[styles.mediaGalleryHeader, { borderBottomColor: hairline }]}>
                  <TouchableOpacity
                    onPress={() => setMediaGalleryVisible(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.mediaGalleryTitle, { color: colors.text }]}>
                    {t('conversation.viewMedia')}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>
                <View style={[styles.mediaGalleryTabs, { borderBottomColor: hairline }]}>
                  {(['photos', 'documents'] as const).map(tab => {
                    const active = mediaGalleryTab === tab;
                    const count = tab === 'photos' ? photos.length : docs.length;
                    return (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.mediaGalleryTab,
                          active && { borderBottomColor: colors.primary },
                        ]}
                        onPress={() => setMediaGalleryTab(tab)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.mediaGalleryTabText,
                            { color: active ? colors.primary : colors.gray500 },
                          ]}
                        >
                          {tab === 'photos' ? t('conversation.mediaTabPhotos') : t('conversation.mediaTabDocuments')}
                          {count > 0 ? ` · ${count}` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {mediaGalleryTab === 'photos' ? (
                  photos.length === 0 ? (
                    <Text style={[styles.mediaGalleryEmpty, { color: colors.gray400 }]}>
                      {t('conversation.mediaPhotosEmpty')}
                    </Text>
                  ) : (
                    <FlatList
                      data={photos}
                      keyExtractor={(item) => String(item.id)}
                      numColumns={3}
                      contentContainerStyle={{ padding: 4 }}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          style={styles.mediaPhotoTile}
                          onPress={() => setMediaGalleryViewerIndex(index)}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={{ uri: typeof item.file === 'string' ? item.file : '' }}
                            style={styles.mediaPhotoImage}
                            cachePolicy="memory-disk"
                            transition={150}
                          />
                        </TouchableOpacity>
                      )}
                    />
                  )
                ) : (
                  docs.length === 0 ? (
                    <Text style={[styles.mediaGalleryEmpty, { color: colors.gray400 }]}>
                      {t('conversation.mediaDocumentsEmpty')}
                    </Text>
                  ) : (
                    <FlatList
                      data={docs}
                      keyExtractor={(item) => String(item.id)}
                      contentContainerStyle={{ paddingVertical: Spacing.sm }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.mediaDocRow, { borderBottomColor: hairline }]}
                          onPress={async () => {
                            const url = typeof item.file === 'string' ? item.file : null;
                            if (!url) return;
                            try {
                              const filename = (item.file_name || `file-${item.id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
                              const targetUri = `${FileSystem.cacheDirectory}${item.id}-${filename}`;
                              const info = await FileSystem.getInfoAsync(targetUri);
                              if (!info.exists) {
                                await FileSystem.downloadAsync(url, targetUri);
                              }
                              if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(targetUri, {
                                  dialogTitle: item.file_name,
                                  mimeType: item.mime_type || undefined,
                                });
                              }
                            } catch {
                              // ignore
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.mediaDocIcon, { backgroundColor: `${colors.primary}18` }]}>
                            <Ionicons name="document-outline" size={20} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.mediaDocName, { color: colors.text }]} numberOfLines={1}>
                              {item.file_name || t('componentsMessages.attachmentMenuTitle')}
                            </Text>
                            {item.file_size ? (
                              <Text style={[styles.mediaDocSize, { color: colors.gray500 }]}>
                                {formatFileSizeForGallery(item.file_size)}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                        </TouchableOpacity>
                      )}
                    />
                  )
                )}
              </View>
            </Modal>
            {/* Image viewer fullscreen pour la grille photos. */}
            <ImageView
              images={photoUris}
              imageIndex={mediaGalleryViewerIndex ?? 0}
              visible={mediaGalleryViewerIndex !== null}
              onRequestClose={() => setMediaGalleryViewerIndex(null)}
              presentationStyle="overFullScreen"
            />
          </>
        );
      })()}

      {/* Modale détaillée des messages en échec. Chaque ligne expose le
          contenu + actions Réessayer / Supprimer. Évite la perte silencieuse
          de messages après MAX_RETRY_COUNT tentatives. */}
      <Modal
        visible={failedMessagesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFailedMessagesModalVisible(false)}
      >
        <View style={styles.failedModalBackdrop}>
          <View style={[styles.failedModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.failedModalEyebrow, { color: '#991B1B' }]}>
              {t('conversation.failedModalEyebrow')}
            </Text>
            <Text style={[styles.failedModalTitle, { color: colors.text }]}>
              {t('conversation.failedModalTitle')}
            </Text>
            <Text style={[styles.failedModalBody, { color: colors.gray500 }]}>
              {t('conversation.failedModalBody')}
            </Text>
            <FlatList
              data={offlineQueue.queue.filter(
                m => m.failed && m.conversationId === String(state.conversationId || ''),
              )}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <View style={[styles.failedItem, { borderBottomColor: colors.gray100 }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.failedItemContent, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.content || t('componentsMessages.attachmentPlaceholder')}
                    </Text>
                    <Text style={[styles.failedItemMeta, { color: colors.gray400 }]}>
                      {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.failedItemBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      offlineQueue.retryMessage(item.id);
                    }}
                    activeOpacity={0.85}
                    accessibilityLabel={t('conversation.failedRetry')}
                  >
                    <Ionicons name="refresh" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.failedItemBtn, { backgroundColor: colors.gray100 }]}
                    onPress={() => offlineQueue.dequeue(item.id)}
                    activeOpacity={0.85}
                    accessibilityLabel={t('conversation.failedDelete')}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.gray700} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.failedItemEmpty, { color: colors.gray400 }]}>
                  {t('conversation.failedEmpty')}
                </Text>
              }
            />
            <View style={styles.failedModalActions}>
              <TouchableOpacity
                style={[styles.failedModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setFailedMessagesModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.failedModalBtnText, { color: colors.gray700 }]}>
                  {t('common.close')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.failedModalBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  offlineQueue.queue
                    .filter(m => m.failed && m.conversationId === String(state.conversationId || ''))
                    .forEach(m => offlineQueue.retryMessage(m.id));
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.failedModalBtnText, { color: '#fff' }]}>
                  {t('conversation.failedRetryAll')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },

  // #6 Undo Send snackbar
  undoSnackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  undoSnackbarText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  undoSnackbarAction: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Quick replies strip (organizer-only, au-dessus de l'InputToolbar)
  quickRepliesStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickReplyChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Anti-spam DM : banner pending_request — style editorial
  // (eyebrow uppercase + titre displayBold + pill CTAs)
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  pendingBannerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pendingBannerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  pendingBannerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 4,
  },
  pendingBannerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  pendingBannerBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerBtnGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  pendingBannerBtnPrimary: {
    // borderless pill — color set inline via colors.primary
  },
  pendingBannerBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    letterSpacing: 0.2,
  },

  // Offline queue banner (au-dessus de l'InputToolbar)
  offlineQueueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  offlineQueueBannerText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    color: '#92400E',
    flex: 1,
  },
  failedQueueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  failedQueueBannerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: '#991B1B',
    flex: 1,
  },
  failedQueueBannerCta: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#991B1B',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Failed messages modal
  failedModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  failedModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  failedModalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  failedModalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  failedModalBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  failedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  failedItemContent: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  failedItemMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    marginTop: 2,
  },
  failedItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedItemEmpty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    fontStyle: 'italic',
  },
  failedModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  failedModalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  failedModalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  // Participants list (read-only modal)
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  participantInitials: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  participantName: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  participantEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  organizerBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // Media gallery — modal plein écran
  mediaGalleryCard: {
    flex: 1,
    paddingTop: 44, // safe area approximative
  },
  mediaGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  mediaGalleryTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  mediaGalleryTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mediaGalleryTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mediaGalleryTabText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  mediaGalleryEmpty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing['2xl'],
    fontStyle: 'italic',
  },
  mediaPhotoTile: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
  },
  mediaPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  mediaDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mediaDocIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDocName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  mediaDocSize: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },

  // Header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
  },
  // Bulk selection mode
  selectionCount: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginLeft: 4,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  selectionCheckCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHeaderBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHeaderTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    marginRight: Spacing.sm,
  },
  headerAvatarPlaceholder: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  headerTitleText: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.2,
    maxWidth: 180,
  },
  headerSubtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.1,
    marginTop: 1,
    maxWidth: 180,
  },
  headerMenuButton: {
    padding: Spacing.sm,
  },

  // Event source banner — affiché au-dessus des messages quand la conv est
  // liée à un event. Click → EventDetails.
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  eventBannerThumb: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
  },
  eventBannerBody: {
    flex: 1,
    minWidth: 0,
  },
  eventBannerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  eventBannerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },

  // Messages List
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    flexGrow: 1,
  },

  // Date
  dateContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    transform: [{ scale: -1 }],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray500,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    marginTop: Spacing.xs,
  },

  // Loading More
  loadingMore: {
    padding: Spacing.md,
    alignItems: 'center',
  },

  // Connection Status
  connectionStatus: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  connectionStatusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },

  // System messages
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  systemMessageText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    fontStyle: 'italic',
    overflow: 'hidden',
  },

  // Scroll to bottom
  scrollToBottomButton: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    borderWidth: 1,
  },

  // Voice preview bar
  voicePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  voicePreviewPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePreviewLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  voicePreviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  voicePreviewBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  searchResultsList: {
    maxHeight: 280,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchResultSender: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    marginBottom: 2,
  },
  searchResultContent: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 18,
  },
  searchResultTime: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  searchNoResults: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchNoResultsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
  },
});
