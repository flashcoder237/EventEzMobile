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
  Alert,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioPlayer,
  useAudioRecorder,
  type AudioPlayer,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';

import { messagesAPI, getMediaUrl } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useMessagingWebSocket } from '../../hooks/useMessagingWebSocket';
import { useMessageState, AttachedFile } from '../../hooks/useMessageState';
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
import { SkeletonList, MessageSkeleton } from '../../components/ui/Skeleton';
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
  ReactionPickerModal,
  ForwardModal,
  InputToolbar,
  ConversationQuotaBanner,
  GroupAdminPanel,
  MessageActionType,
  QuotaState,
} from '../../components/messages';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ConversationRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConversationRouteProp>();
  const insets = useSafeAreaInsets();
  const { conversationId: initialConversationId, userId, userName } = route.params;
  const { user } = useAuth();
  const { showError, showSuccess } = useAlert();
  const { colors, isDark } = useTheme();

  // State centralisé
  const { state, actions } = useMessageState(initialConversationId, userName);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const lastTypingSentRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);
  // Track quel messageId est actuellement chargé dans playerRef. Permet de
  // distinguer "toggle pause/play sur le même" de "lancer un nouveau message".
  const currentPlayerMsgIdRef = useRef<string | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = React.useState('');
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  // État de lecture audio (un seul audio joué à la fois). Mis à jour via le
  // listener playbackStatusUpdate du player. null = aucune lecture en cours.
  const [voicePlayback, setVoicePlayback] = React.useState<{
    messageId: string;
    currentMs: number;
    durationMs: number;
    isLoading: boolean;
  } | null>(null);
  // Set des attachment ids en cours d'upload : permet à MessageBubble
  // d'afficher un overlay de chargement sur le tempMessage avant que l'upload
  // ne se termine.
  const [uploadingIds, setUploadingIds] = React.useState<Set<string>>(new Set());

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
      if (String(newMessage.conversation) === String(state.conversationId)) {
        actions.addMessage(newMessage);
        // FlatList inversé affiche automatiquement les nouveaux messages en bas (index 0)
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
  });

  // Typing users for current conversation
  const typingUsers = useMemo(() => {
    if (!state.conversationId) return [];
    const users = getTypingUsersForConversation(state.conversationId);
    return users.map(u => u.userName);
  }, [state.conversationId, getTypingUsersForConversation]);

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
      currentPlayerMsgIdRef.current = null;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, []);

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
      }

      actions.setHasMore(!!data.next);
      actions.setNextPageUrl(data.next || null);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement messages:', error);
    } finally {
      actions.setLoading(false);
      actions.setLoadingMore(false);
    }
  };

  // Type de conversation (direct / group / event) — alimente le banner quota.
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'event' | null>(null);
  // État quota / read-only utilisé pour bloquer l'envoi côté UI.
  const [quotaState, setQuotaState] = useState<QuotaState | null>(null);
  // Données détaillées de la conversation (pour le panel admin : participants, organizer)
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  // Modale d'administration du groupe (organizer uniquement)
  const [showGroupAdminPanel, setShowGroupAdminPanel] = useState(false);

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

      const otherParticipant = conversation.participants?.find(
        (p: any) => p.id !== user?.id
      );

      const title = conversation.title ||
        conversation.name ||
        (otherParticipant?.first_name && otherParticipant?.last_name
          ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
          : otherParticipant?.email?.split('@')[0] || 'Conversation');

      const avatar = otherParticipant?.profile_picture || otherParticipant?.image || null;

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
            <Image source={avatar} style={styles.headerAvatar} cachePolicy="disk" transition={200} />
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
    // Pour les groupes / événement où l'utilisateur est organizer/admin/moderator,
    // on propose "Gérer le groupe" en plus du blocage. Le bouton "Bloquer" ne
    // s'affiche pas dans les groupes (n'a pas de sens — il faudrait passer par
    // le mute spécifique au groupe).
    const buttons: any[] = [];

    const isAdmin = !!quotaState?.is_organizer;
    const isGroup = conversationType && conversationType !== 'direct';

    if (isGroup && isAdmin) {
      buttons.push({
        text: 'Gérer le groupe',
        onPress: () => setShowGroupAdminPanel(true),
      });
    }

    if (!isGroup) {
      buttons.push({
        text: 'Bloquer cet utilisateur',
        style: 'destructive' as const,
        onPress: handleBlockUser,
      });
    }

    buttons.push({ text: 'Annuler', style: 'cancel' as const });

    Alert.alert('Options', undefined, buttons);
  };

  const handleBlockUser = async () => {
    if (!state.otherUserId) return;

    Alert.alert(
      'Bloquer utilisateur',
      `Voulez-vous vraiment bloquer ${state.conversationTitle} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesAPI.blockUser(state.otherUserId!);
              showSuccess('Utilisateur bloqué', '');
              navigation.goBack();
            } catch (error) {
              showError('Erreur', 'Impossible de bloquer cet utilisateur');
            }
          },
        },
      ]
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
  // ATTACHMENTS
  // ============================================

  const handlePickImage = async () => {
    try {
      // Garde-fou : on ne propose pas de joindre si la conversation est en lecture seule.
      if (quotaState?.is_read_only) {
        showError('Lecture seule', 'Vous ne pouvez plus envoyer de fichiers dans cette conversation.');
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError('Permission requise', 'Autorisez l\'accès aux photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // expo-image-picker v17+ : `MediaTypeOptions.Images` est deprecated,
        // l'API actuelle attend une string ou un array de strings.
        mediaTypes: 'images',
        // 0.7 (au lieu de 0.8) : gain de poids ~30% supplémentaire pour rester
        // sous le quota groupe de 500 MB sans sacrifier la lisibilité.
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'image.jpg';
        // Validation taille par fichier (5 Mo image) + quota cumulé du groupe.
        const sizeBytes = (asset as any).fileSize || 0;
        const { validateAttachmentSize, MESSAGE_LIMITS, formatBytes } = await import('../../constants/messaging');
        const sizeError = validateAttachmentSize(sizeBytes, 'image');
        if (sizeError && sizeBytes > 0) {
          showError('Image trop volumineuse', sizeError);
          return;
        }
        if (quotaState && quotaState.max_bytes != null && sizeBytes > 0) {
          const remaining = Math.max(0, quotaState.max_bytes - quotaState.total_bytes);
          if (sizeBytes > remaining) {
            showError(
              'Plus de place dans ce groupe',
              `${formatBytes(remaining)} restants sur ${formatBytes(quotaState.max_bytes)}. Demandez à l'organisateur de faire le ménage ou utilisez un lien externe.`,
            );
            return;
          }
        }

        actions.setAttachedFiles([{
          uri: asset.uri,
          name: filename,
          type: 'image',
        }]);
      }
    } catch (error) {
      showError('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleRemoveAttachment = () => {
    actions.clearAttachedFiles();
  };

  // ============================================
  // VOICE RECORDING
  // ============================================

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        showError('Permission requise', 'Autorisez l\'accès au microphone.');
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

      recordingIntervalRef.current = setInterval(() => {
        actions.incrementRecordingDuration();
      }, 1000);
    } catch (error) {
      showError('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      await recorder.stop();
      const uri = recorder.uri;

      actions.setRecording(false);

      if (uri && state.recordingDuration >= 1) {
        actions.setAttachedFiles([{
          uri,
          name: `voice_${Date.now()}.m4a`,
          type: 'voice',
          duration: state.recordingDuration,
        }]);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur arrêt enregistrement:', error);
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      await recorder.stop();
      actions.setRecording(false);
    } catch (error) {
      if (__DEV__) console.error('Erreur annulation enregistrement:', error);
    }
  };

  const playVoiceMessage = async (uri: string, messageId: string) => {
    try {
      // Cas 1 : tap sur le message déjà chargé → toggle pause / play sans
      // détruire le player (préserve la position de lecture).
      if (playerRef.current && currentPlayerMsgIdRef.current === messageId) {
        const player: any = playerRef.current;
        const isCurrentlyPlaying = state.playingVoiceId === messageId;
        if (isCurrentlyPlaying) {
          try { player.pause(); } catch { /* noop */ }
          actions.setPlayingVoice(null);
        } else {
          try { player.play(); } catch { /* noop */ }
          actions.setPlayingVoice(messageId);
        }
        return;
      }

      // Cas 2 : tap sur un autre message → couper le player précédent
      if (playerRef.current) {
        try { playerRef.current.remove(); } catch { /* noop */ }
        playerRef.current = null;
        currentPlayerMsgIdRef.current = null;
      }

      const playableUri = getMediaUrl(uri) || uri;

      // Loading visible immédiatement (entre tap et premier sample).
      setVoicePlayback({ messageId, currentMs: 0, durationMs: 0, isLoading: true });
      actions.setPlayingVoice(messageId);

      const player = createAudioPlayer({ uri: playableUri });
      playerRef.current = player;
      currentPlayerMsgIdRef.current = messageId;

      const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
        // status: { isLoaded, currentTime (s), duration (s), didJustFinish, playing }
        if (status?.didJustFinish) {
          actions.setPlayingVoice(null);
          setVoicePlayback(null);
          try { subscription.remove(); } catch { /* noop */ }
          try { player.remove(); } catch { /* noop */ }
          if (playerRef.current === player) playerRef.current = null;
          if (currentPlayerMsgIdRef.current === messageId) currentPlayerMsgIdRef.current = null;
          return;
        }
        if (status?.isLoaded) {
          setVoicePlayback({
            messageId,
            currentMs: Math.round((status.currentTime ?? 0) * 1000),
            durationMs: Math.round((status.duration ?? 0) * 1000),
            isLoading: false,
          });
        }
      });

      player.play();
    } catch (error) {
      if (__DEV__) console.error('[playVoiceMessage] uri=', uri, 'err=', error);
      actions.setPlayingVoice(null);
      setVoicePlayback(null);
      currentPlayerMsgIdRef.current = null;
      showError('Erreur', 'Impossible de lire le message vocal');
    }
  };

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

      case 'edit':
        if (isMyMessage(message, user?.id)) {
          // Limite de 15 min après envoi (comme WhatsApp). Au-delà,
          // l'édition n'est plus autorisée pour préserver la confiance dans
          // l'historique des conversations.
          const EDIT_WINDOW_MS = 15 * 60 * 1000;
          const sentAt = message.created_at ? new Date(message.created_at).getTime() : 0;
          if (sentAt && Date.now() - sentAt > EDIT_WINDOW_MS) {
            showError(
              'Édition non disponible',
              'Tu peux éditer un message uniquement dans les 15 minutes après son envoi.',
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

      case 'react':
        actions.showReactionPicker();
        break;

      case 'copy':
        if (message.content) {
          Clipboard.setString(message.content);
          showSuccess('Copié', 'Message copié dans le presse-papiers');
        }
        break;
    }
  }, [state.selectedMessage, user?.id, actions]);

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Supprimer le message',
      'Voulez-vous vraiment supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
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
            } catch (error) {
              showError('Erreur', 'Impossible de supprimer le message');
            }
          },
        },
      ]
    );
  };

  const handleForwardMessage = async (message: Message) => {
    actions.showForwardModal();
    actions.setLoadingForwardTargets(true);

    try {
      const response = await messagesAPI.getConversations();
      const conversations = response.data.results || response.data || [];

      const targets: User[] = [];
      conversations.forEach((conv: any) => {
        conv.participants?.forEach((p: any) => {
          if (p.id !== user?.id && !targets.find(t => t.id === p.id)) {
            targets.push(p);
          }
        });
      });

      actions.setForwardTargets(targets);
    } catch (error) {
      showError('Erreur', 'Impossible de charger les contacts');
    } finally {
      actions.setLoadingForwardTargets(false);
    }
  };

  const handleForwardToUser = async (targetUserId: string) => {
    if (!state.selectedMessage) return;

    try {
      await messagesAPI.forwardMessage({
        message_id: String(state.selectedMessage.id),
        target_user_id: targetUserId,
      });
      showSuccess('Message transféré', '');
      actions.hideForwardModal();
    } catch (error) {
      showError('Erreur', 'Impossible de transférer le message');
    }
  };

  const handleSelectReaction = async (emoji: string) => {
    const messageId = state.selectedMessage?.id;
    if (!messageId) return;

    const messageIdStr = String(messageId);
    actions.hideReactionPicker();

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

    const messageContent = state.newMessage.trim();
    const hasContent = messageContent.length > 0 || state.attachedFiles.length > 0;
    if (!hasContent) return;

    // Lecture seule : on bloque l'envoi (filet de sécurité, l'UI désactive déjà
    // visuellement le toolbar).
    if (quotaState?.is_read_only) {
      showError(
        'Discussion en lecture seule',
        'Sauvegardez vos messages — la conversation sera bientôt supprimée.',
      );
      return;
    }
    // Permissions d'écriture : muté ou mode restreint
    if ((quotaState as any)?.is_muted) {
      showError('Vous êtes muté', "L'organisateur a restreint votre droit d'écriture dans cette discussion.");
      return;
    }
    if (quotaState && (quotaState as any).can_post === false) {
      showError(
        'Lecture seule',
        "Seul l'organisateur peut écrire dans cette discussion.",
      );
      return;
    }

    const isEditing = !!state.editingMessage;

    actions.setNewMessage('');
    actions.setSending(true);

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
      const tempAttachments = state.attachedFiles.map((f, i) => ({
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

      // Marquer tous les attachments en upload pour l'overlay loader
      if (tempAttachments.length > 0) {
        setUploadingIds(prev => {
          const next = new Set(prev);
          tempAttachments.forEach(a => next.add(String(a.id)));
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
        state.attachedFiles.map(async (att, idx): Promise<UploadOutcome> => {
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
              return { ok: false, error: 'Réponse serveur invalide', tmpIdx: idx, fileType: att.type, fileName: att.name };
            }
            return { ok: true, id, tmpIdx: idx, fileType: att.type, fileName: att.name };
          } catch (uploadError: any) {
            if (__DEV__) console.error('Erreur upload attachment:', uploadError);
            const data = uploadError?.response?.data || {};
            const errorMsg: string = data.error || uploadError?.message || 'Échec de l\'upload';
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
            setUploadingIds(prev => {
              if (!prev.has(`tmp:${tempMessageId}:${idx}`)) return prev;
              const next = new Set(prev);
              next.delete(`tmp:${tempMessageId}:${idx}`);
              return next;
            });
          }
        })
      );

      const failedUploads = uploadOutcomes.filter((o): o is Extract<UploadOutcome, { ok: false }> => !o.ok);
      const attachmentIds: string[] = uploadOutcomes
        .filter((o): o is Extract<UploadOutcome, { ok: true }> => o.ok)
        .map(o => o.id);

      // Surface des erreurs d'upload à l'utilisateur. On distingue :
      //   - Tous échouent + pas de texte : envoi annulé (rollback complet)
      //   - Au moins un réussit OU il y a du texte : envoi du reste, on alerte
      //     juste sur les fichiers rejetés
      if (failedUploads.length > 0) {
        const labelOf = (t: string) => t === 'image' ? 'image' : t === 'voice' ? 'message vocal' : 'fichier';
        const codeMap: Record<string, string> = {
          file_too_large: 'trop volumineux(e)',
          conversation_quota_exceeded: 'plus de place dans le groupe',
          conversation_read_only: 'discussion en lecture seule',
          user_muted: 'vous êtes muté',
          posting_mode_restricted: 'écriture restreinte',
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
            failedUploads.length > 1 ? 'Fichiers refusés' : 'Fichier refusé',
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
          failedUploads.length > 1 ? 'Certains fichiers refusés' : 'Fichier refusé',
          summary,
        );
      }

      // Envoi via WebSocket ou REST
      const wsSent = isConnected && isAuthenticated && wsSendMessage(
        conversationIdToUse,
        messageContent,
        state.replyToMessage?.id,
        attachmentIds.length > 0 ? attachmentIds : undefined
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

      // FlatList inversé affiche automatiquement les nouveaux messages en bas (index 0)
    } catch (error) {
      if (__DEV__) console.error('Erreur envoi message:', error);
      actions.removeTempMessages();
      actions.setNewMessage(messageContent);
      // Cleanup des overlays loader si on a interrompu un upload
      setUploadingIds(new Set());
      showError('Erreur', 'Impossible d\'envoyer le message');
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

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: colors.gray500, backgroundColor: colors.card }]}>{formatMessageDate(item.created_at)}</Text>
          </View>
        )}
        <MessageBubble
          message={item}
          isMine={isMine}
          isGrouped={!!isGrouped}
          replyToMessage={replyToContent}
          otherUserId={state.otherUserId}
          playingVoiceId={state.playingVoiceId}
          voicePlayback={voicePlayback}
          uploadingAttachmentIds={uploadingIds}
          onLongPress={handleMessageLongPress}
          onPlayVoice={playVoiceMessage}
        />
      </View>
    );
  }, [state.messages, state.otherUserId, state.playingVoiceId, voicePlayback, uploadingIds, user?.id, handleMessageLongPress]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.gray300} />
      </View>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {state.isNewConversation ? 'Nouvelle conversation' : 'Aucun message'}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
        {state.isNewConversation
          ? `Envoyez un message à ${state.conversationTitle}`
          : 'Commencez la conversation !'}
      </Text>
    </View>
  );

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
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const renderCustomHeader = () => (
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
      <View style={styles.customHeaderTitle}>
        {headerAvatar ? (
          <Image
            source={headerAvatar}
            style={styles.headerAvatar}
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerAvatarText}>
              {headerTitle.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <Text
          style={[styles.headerTitleText, { color: colors.text }]}
          numberOfLines={1}
        >
          {headerTitle}
        </Text>
      </View>
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

  if (state.loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>CHAT</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          {renderCustomHeader()}
          <View style={styles.loadingContainer}>
            <SkeletonList count={6} Component={MessageSkeleton} />
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>CHAT</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {renderCustomHeader()}

      {/* Connection Status Warning */}
      {!isConnected && state.conversationId && (
        <View
          style={[
            styles.connectionStatus,
            {
              backgroundColor: wsConnectionError ? colors.error : colors.warning,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}
        >
          <Text style={[styles.connectionStatusText, { color: colors.white, flex: 1 }]}>
            {wsConnectionError
              ? wsConnectionError
              : 'Connexion en cours… (mode hors-ligne)'}
          </Text>
          <TouchableOpacity
            onPress={() => wsReconnect()}
            accessibilityRole="button"
            accessibilityLabel="Réessayer la connexion au serveur de messagerie"
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              marginLeft: 8,
            }}
          >
            <Text style={[styles.connectionStatusText, { color: colors.white }]}>
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
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
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={state.messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messagesList}
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

        {/* Input Toolbar — masqué entièrement quand la conversation est en lecture seule,
             que l'utilisateur est muté ou que le mode d'écriture l'exclut. */}
        {(quotaState?.is_read_only || (quotaState as any)?.is_muted || (quotaState && (quotaState as any).can_post === false)) ? (
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
                ? 'Discussion en lecture seule. Pensez à sauvegarder.'
                : (quotaState as any)?.is_muted
                  ? "Vous avez été muté dans cette discussion par l'organisateur."
                  : "Seul l'organisateur peut écrire dans cette discussion."}
            </Text>
          </View>
        ) : (
          <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
            <InputToolbar
              value={state.newMessage}
              onChangeText={(text) => {
                actions.setNewMessage(text);
                handleTyping();
              }}
              onSend={handleSend}
              sending={state.sending}
              attachedFiles={state.attachedFiles}
              onPickImage={handlePickImage}
              onRemoveAttachment={handleRemoveAttachment}
              isRecording={state.isRecording}
              recordingDuration={state.recordingDuration}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancelRecording={cancelRecording}
              replyToMessage={state.replyToMessage}
              editingMessage={state.editingMessage}
              onCancelReply={actions.cancelReply}
              onCancelEdit={actions.cancelEdit}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modals */}
      <MessageActionModal
        visible={state.showActionMenu}
        message={state.selectedMessage}
        userId={user?.id}
        onClose={actions.hideActionMenu}
        onAction={handleMessageAction}
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
        onClose={actions.hideForwardModal}
        onSelectTarget={handleForwardToUser}
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

  // Header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
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
  headerMenuButton: {
    padding: Spacing.sm,
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
});
