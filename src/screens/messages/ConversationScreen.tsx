import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Modal,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

import { messagesAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useMessagingWebSocket } from '../../hooks/useMessagingWebSocket';
import { Message, RootStackParamList, User } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ConversationRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

interface AttachedFile {
  id?: string;
  uri: string;
  name: string;
  type: 'image' | 'document' | 'voice';
  duration?: number;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// Types d'actions possibles sur un message
type MessageAction = 'reply' | 'edit' | 'delete' | 'forward' | 'react';

export default function ConversationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConversationRouteProp>();
  const { conversationId: initialConversationId, userId, userName } = route.params;
  const { user } = useAuth();
  const { showError, showSuccess } = useAlert();

  // States principaux
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!initialConversationId);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversationTitle, setConversationTitle] = useState(userName || '');
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(userId || null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(!initialConversationId && !!userId);
  const [typingIndicator, setTypingIndicator] = useState<string | null>(null);

  // States pour les nouvelles fonctionnalites
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargets, setForwardTargets] = useState<User[]>([]);
  const [loadingForwardTargets, setLoadingForwardTargets] = useState(false);

  // States pour messages vocaux
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Animation
  const recordingAnim = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket hook pour temps reel
  const {
    isConnected,
    sendMessage: wsSendMessage,
    startTyping,
    stopTyping,
    addReaction: wsAddReaction,
    removeReaction: wsRemoveReaction,
    getTypingUsersForConversation,
  } = useMessagingWebSocket({
    onNewMessage: (newMessage) => {
      if (String(newMessage.conversation) === String(currentConversationId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    onTypingIndicator: (data) => {
      if (String(data.conversationId) === String(currentConversationId)) {
        if (data.isTyping) {
          setTypingIndicator(`${data.userName} ecrit...`);
        } else {
          setTypingIndicator(null);
        }
      }
    },
    onMessageRead: (data) => {
      setMessages(prev => prev.map(msg => {
        if (String(msg.id) === String(data.messageId)) {
          const readBy = msg.read_by || [];
          if (!readBy.includes(data.userId)) {
            return { ...msg, read_by: [...readBy, data.userId] };
          }
        }
        return msg;
      }));
    },
    onReactionAdded: (data) => {
      setMessages(prev => prev.map(msg => {
        if (String(msg.id) === String(data.messageId)) {
          const reactions = msg.reactions || [];
          return {
            ...msg,
            reactions: [...reactions, { id: `ws-${Date.now()}`, user: data.userId, emoji: data.emoji, user_name: '', created_at: new Date().toISOString() }],
          };
        }
        return msg;
      }));
    },
    onReactionRemoved: (data) => {
      setMessages(prev => prev.map(msg => {
        if (String(msg.id) === String(data.messageId)) {
          return {
            ...msg,
            reactions: (msg.reactions || []).filter(r => !(r.user === data.userId && r.emoji === data.emoji)),
          };
        }
        return msg;
      }));
    },
  });

  // Gerer l'indicateur de frappe
  const handleTyping = useCallback(() => {
    if (!currentConversationId) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      startTyping(currentConversationId);
      lastTypingSentRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (currentConversationId) {
        stopTyping(currentConversationId);
      }
    }, 3000);
  }, [currentConversationId, startTyping, stopTyping]);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages();
      fetchConversationDetails();
      markAsRead();

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
        if (currentConversationId) {
          stopTyping(currentConversationId);
        }
      };
    } else if (userName) {
      setConversationTitle(userName);
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {userName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.headerTitleText} numberOfLines={1}>{userName}</Text>
          </View>
        ),
      });
      setLoading(false);
    }
  }, [currentConversationId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const fetchConversationDetails = async () => {
    if (!currentConversationId) return;
    try {
      const response = await messagesAPI.getConversation(currentConversationId);
      const conversation = response.data;

      const otherParticipant = conversation.participants?.find(
        (p: any) => p.id !== user?.id
      );

      const title = conversation.title ||
        (otherParticipant?.first_name && otherParticipant?.last_name
          ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
          : otherParticipant?.email?.split('@')[0] || 'Conversation');

      setConversationTitle(title);
      setOtherUserAvatar(otherParticipant?.profile_picture || otherParticipant?.image || null);
      setOtherUserId(otherParticipant?.id || null);

      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            {otherUserAvatar ? (
              <Image source={{ uri: otherUserAvatar }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {title.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.headerTitleText} numberOfLines={1}>{title}</Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={handleShowConversationOptions}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.gray700} />
          </TouchableOpacity>
        ),
      });
    } catch (error) {
      console.error('Erreur chargement details conversation:', error);
    }
  };

  const handleShowConversationOptions = () => {
    Alert.alert(
      'Options',
      undefined,
      [
        {
          text: 'Bloquer cet utilisateur',
          style: 'destructive',
          onPress: handleBlockUser,
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!otherUserId) return;

    Alert.alert(
      'Bloquer utilisateur',
      `Voulez-vous vraiment bloquer ${conversationTitle} ? Vous ne recevrez plus ses messages.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesAPI.blockUser(otherUserId);
              showSuccess('Utilisateur bloque', `${conversationTitle} a ete bloque.`);
              navigation.goBack();
            } catch (error) {
              console.error('Erreur blocage:', error);
              showError('Erreur', 'Impossible de bloquer cet utilisateur');
            }
          },
        },
      ]
    );
  };

  const fetchMessages = async () => {
    if (!currentConversationId) {
      setLoading(false);
      return;
    }
    try {
      const response = await messagesAPI.getMessages({ conversation: currentConversationId });
      const newMessages = response.data.results || response.data || [];
      setMessages(newMessages.reverse());
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!currentConversationId) return;
    try {
      await messagesAPI.markConversationAsRead(currentConversationId);
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError('Permission requise', 'Autorisez l\'acces aux photos pour envoyer des images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'image.jpg';

        setAttachedFiles([{
          uri: asset.uri,
          name: filename,
          type: 'image',
        }]);
      }
    } catch (error) {
      console.error('Erreur selection image:', error);
      showError('Erreur', 'Impossible de selectionner l\'image');
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFiles([]);
  };

  // ============================================
  // MESSAGES VOCAUX
  // ============================================

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        showError('Permission requise', 'Autorisez l\'acces au microphone pour enregistrer des messages vocaux.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Animation pulsation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      // Timer pour la duree
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erreur demarrage enregistrement:', error);
      showError('Erreur', 'Impossible de demarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      recordingAnim.stopAnimation();
      recordingAnim.setValue(1);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setIsRecording(false);
      setRecording(null);

      if (uri && recordingDuration >= 1) {
        setAttachedFiles([{
          uri,
          name: `voice_${Date.now()}.m4a`,
          type: 'voice',
          duration: recordingDuration,
        }]);
      }

      setRecordingDuration(0);
    } catch (error) {
      console.error('Erreur arret enregistrement:', error);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    try {
      recordingAnim.stopAnimation();
      recordingAnim.setValue(1);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Erreur annulation enregistrement:', error);
    }
  };

  const playVoiceMessage = async (attachmentUri: string, messageId: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (playingVoiceId === messageId) {
        setPlayingVoiceId(null);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: attachmentUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingVoiceId(messageId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingVoiceId(null);
        }
      });
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      showError('Erreur', 'Impossible de lire le message vocal');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // ACTIONS SUR MESSAGES
  // ============================================

  const handleLongPressMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowActionMenu(true);
  };

  const handleMessageAction = (action: MessageAction) => {
    if (!selectedMessage) return;

    setShowActionMenu(false);

    switch (action) {
      case 'reply':
        setReplyToMessage(selectedMessage);
        setEditingMessage(null);
        break;
      case 'edit':
        if (isMyMessage(selectedMessage)) {
          setEditingMessage(selectedMessage);
          setNewMessage(selectedMessage.content);
          setReplyToMessage(null);
        }
        break;
      case 'delete':
        handleDeleteMessage(selectedMessage.id);
        break;
      case 'forward':
        handleForwardMessage(selectedMessage);
        break;
      case 'react':
        setSelectedMessageId(selectedMessage.id);
        setShowReactionPicker(true);
        break;
    }
    setSelectedMessage(null);
  };

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
              await messagesAPI.deleteMessage(messageId);
              setMessages(prev => prev.filter(m => m.id !== messageId));
              showSuccess('Message supprime', '');
            } catch (error) {
              console.error('Erreur suppression:', error);
              showError('Erreur', 'Impossible de supprimer le message');
            }
          },
        },
      ]
    );
  };

  const handleForwardMessage = async (message: Message) => {
    setShowForwardModal(true);
    setLoadingForwardTargets(true);
    try {
      // Charger les conversations pour obtenir les utilisateurs
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

      setForwardTargets(targets);
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      showError('Erreur', 'Impossible de charger les contacts');
    } finally {
      setLoadingForwardTargets(false);
    }
  };

  const handleForwardToUser = async (targetUserId: string) => {
    if (!selectedMessage) return;

    try {
      await messagesAPI.forwardMessage({
        message_id: selectedMessage.id,
        target_user_id: targetUserId,
      });
      showSuccess('Message transfere', '');
      setShowForwardModal(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Erreur transfert:', error);
      showError('Erreur', 'Impossible de transferer le message');
    }
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleAddReaction = async (emoji: string) => {
    const messageId = selectedMessageId || selectedMessage?.id;
    if (!messageId) return;

    try {
      if (isConnected) {
        wsAddReaction(messageId, emoji);
      } else {
        await messagesAPI.addReaction(messageId, emoji);
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const existingReaction = msg.reactions?.find(r => r.emoji === emoji && r.user === user?.id);
          if (existingReaction) {
            return {
              ...msg,
              reactions: msg.reactions?.filter(r => !(r.emoji === emoji && r.user === user?.id)) || [],
            };
          } else {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), { id: `temp-${Date.now()}`, emoji, user: user?.id || '', created_at: new Date().toISOString() }],
            };
          }
        }
        return msg;
      }));
    } catch (error) {
      console.error('Erreur ajout reaction:', error);
    } finally {
      setShowReactionPicker(false);
      setSelectedMessageId(null);
    }
  };

  // ============================================
  // ENVOI DE MESSAGE
  // ============================================

  const handleSend = async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0) || sending) return;

    const messageContent = newMessage.trim();
    const isEditing = !!editingMessage;

    setNewMessage('');
    setSending(true);

    try {
      // Mode edition
      if (isEditing && editingMessage) {
        await messagesAPI.updateMessage(editingMessage.id, { content: messageContent });
        setMessages(prev => prev.map(msg =>
          msg.id === editingMessage.id
            ? { ...msg, content: messageContent }
            : msg
        ));
        setEditingMessage(null);
        setSending(false);
        return;
      }

      let conversationIdToUse = currentConversationId;

      // Nouvelle conversation
      if (isNewConversation && userId && !currentConversationId) {
        const convResponse = await messagesAPI.createConversation({
          participant_ids: [user?.id, userId],
        });
        conversationIdToUse = convResponse.data.id;
        setCurrentConversationId(conversationIdToUse);
        setIsNewConversation(false);
      }

      if (!conversationIdToUse) {
        throw new Error('Pas de conversation disponible');
      }

      // Optimistic update
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation: conversationIdToUse,
        sender: user!.id as any,
        sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || '',
        content: messageContent,
        created_at: new Date().toISOString(),
        is_starred: false,
        read_by: [],
        reply_to: replyToMessage?.id,
        attachments: attachedFiles.map(f => ({
          id: `temp-${Date.now()}`,
          file: f.uri,
          attachment_type: f.type,
          file_name: f.name,
          file_size: 0,
          mime_type: f.type === 'image' ? 'image/jpeg' : f.type === 'voice' ? 'audio/m4a' : 'application/octet-stream',
          duration_seconds: f.duration,
          uploaded_at: new Date().toISOString(),
        })),
      };
      setMessages((prev) => [...prev, tempMessage]);
      setAttachedFiles([]);
      setReplyToMessage(null);

      // Upload attachments
      let attachmentIds: string[] = [];

      for (const att of attachedFiles) {
        const formData = new FormData();
        formData.append('file', {
          uri: att.uri,
          name: att.name,
          type: att.type === 'image' ? 'image/jpeg' : att.type === 'voice' ? 'audio/m4a' : 'application/octet-stream',
        } as any);
        formData.append('type', att.type);

        try {
          let uploadResponse;
          if (att.type === 'voice') {
            uploadResponse = await messagesAPI.uploadVoiceMessage(formData);
          } else {
            uploadResponse = await messagesAPI.uploadAttachment(formData);
          }
          if (uploadResponse.data?.id) {
            attachmentIds.push(uploadResponse.data.id);
          }
        } catch (uploadError) {
          console.error('Erreur upload attachment:', uploadError);
        }
      }

      // Envoi via WebSocket ou REST
      const wsSent = isConnected && wsSendMessage(
        conversationIdToUse,
        messageContent,
        replyToMessage?.id,
        attachmentIds.length > 0 ? attachmentIds : undefined
      );

      if (!wsSent) {
        const response = await messagesAPI.sendMessage({
          conversation: conversationIdToUse,
          content: messageContent,
          reply_to: replyToMessage?.id,
        });

        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? response.data : msg))
        );
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('temp-')));
      setNewMessage(messageContent);
      showError('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== previousDate;
  };

  const isMyMessage = (message: Message) => {
    const senderId = typeof message.sender === 'number'
      ? message.sender
      : typeof message.sender === 'string'
        ? message.sender
        : (message.sender as any)?.id;
    return String(senderId) === String(user?.id);
  };

  const getInitials = (message: Message) => {
    if (message.sender_name) {
      const parts = message.sender_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return message.sender_name[0].toUpperCase();
    }
    if (typeof message.sender === 'object' && message.sender !== null) {
      const sender = message.sender as any;
      if (sender.first_name && sender.last_name) {
        return `${sender.first_name[0]}${sender.last_name[0]}`.toUpperCase();
      }
      return (sender.email?.[0] || 'U').toUpperCase();
    }
    return 'U';
  };

  const getReplyToContent = (replyTo: string | Message | undefined) => {
    if (!replyTo) return null;
    if (typeof replyTo === 'string') {
      const replyMessage = messages.find(m => m.id === replyTo);
      return replyMessage || null;
    }
    return replyTo;
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderAttachment = (attachment: any, isMine: boolean, messageId: string) => {
    if (attachment.attachment_type === 'image') {
      return (
        <Image
          source={{ uri: attachment.file }}
          style={styles.attachmentImage}
          resizeMode="cover"
        />
      );
    }

    if (attachment.attachment_type === 'voice') {
      const isPlaying = playingVoiceId === messageId;
      return (
        <TouchableOpacity
          style={[styles.voiceAttachment, isMine && styles.voiceAttachmentMine]}
          onPress={() => playVoiceMessage(attachment.file, messageId)}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={isMine ? Colors.white : Colors.primary}
          />
          <View style={styles.voiceWaveform}>
            {[...Array(20)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  { height: Math.random() * 16 + 4 },
                  isMine && styles.waveformBarMine,
                ]}
              />
            ))}
          </View>
          <Text style={[styles.voiceDuration, isMine && styles.voiceDurationMine]}>
            {formatDuration(attachment.duration_seconds || 0)}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={[styles.attachmentFile, isMine && styles.attachmentFileMine]}>
        <Ionicons name="document-outline" size={20} color={isMine ? Colors.white : Colors.gray600} />
        <Text style={[styles.attachmentFileName, isMine && styles.attachmentFileNameMine]} numberOfLines={1}>
          {attachment.file_name || 'Document'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderReactions = (reactions: any[] | undefined, isMine: boolean) => {
    if (!reactions || reactions.length === 0) return null;

    const grouped = reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <View style={[styles.reactionsContainer, isMine && styles.reactionsContainerMine]}>
        {Object.entries(grouped).map(([emoji, count]) => (
          <View key={emoji} style={styles.reactionBadge}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {(count as number) > 1 && <Text style={styles.reactionCount}>{count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderReplyPreview = (replyTo: Message | null, isMine: boolean) => {
    if (!replyTo) return null;

    return (
      <View style={[styles.replyPreviewInMessage, isMine && styles.replyPreviewInMessageMine]}>
        <View style={[styles.replyPreviewBar, isMine && styles.replyPreviewBarMine]} />
        <View style={styles.replyPreviewContent}>
          <Text style={[styles.replyPreviewName, isMine && styles.replyPreviewNameMine]} numberOfLines={1}>
            {replyTo.sender_name || 'Utilisateur'}
          </Text>
          <Text style={[styles.replyPreviewText, isMine && styles.replyPreviewTextMine]} numberOfLines={1}>
            {replyTo.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item);
    const showDate = shouldShowDate(index);
    const avatar = item.sender_avatar || (typeof item.sender === 'object' ? (item.sender as any)?.profile_picture || (item.sender as any)?.image : null);
    const hasAttachments = item.attachments && item.attachments.length > 0;
    const isRead = item.read_by && item.read_by.length > 0;
    const replyToContent = getReplyToContent(item.reply_to);

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.messageRow, isMine && styles.messageRowMine]}
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={300}
          activeOpacity={0.8}
        >
          {!isMine && (
            avatar ? (
              <Image source={{ uri: avatar }} style={styles.messageAvatar} />
            ) : (
              <View style={styles.messageAvatarPlaceholder}>
                <Text style={styles.messageAvatarInitials}>{getInitials(item)}</Text>
              </View>
            )
          )}
          <View style={styles.messageBubbleContainer}>
            {/* Reply Preview */}
            {replyToContent && renderReplyPreview(replyToContent as Message, isMine)}

            {/* Attachments */}
            {hasAttachments && (
              <View style={styles.attachmentsContainer}>
                {item.attachments?.map((att, i) => (
                  <View key={att.id || i}>
                    {renderAttachment(att, isMine, item.id)}
                  </View>
                ))}
              </View>
            )}

            {/* Text content */}
            {item.content && (
              <View
                style={[
                  styles.messageBubble,
                  isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
                  hasAttachments && styles.messageBubbleWithAttachment,
                ]}
              >
                <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                  {item.content}
                </Text>
              </View>
            )}

            {/* Reactions */}
            {renderReactions(item.reactions, isMine)}

            {/* Time */}
            <View style={[styles.messageTimeRow, isMine && styles.messageTimeRowMine]}>
              <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              {isMine && (
                <Ionicons
                  name={isRead ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={isRead ? Colors.primary : Colors.gray400}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [messages, user, playingVoiceId]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.gray300} />
      </View>
      <Text style={styles.emptyText}>
        {isNewConversation ? 'Nouvelle conversation' : 'Aucun message'}
      </Text>
      <Text style={styles.emptySubtext}>
        {isNewConversation
          ? `Envoyez un message a ${conversationTitle}`
          : 'Commencez la conversation !'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Connection Status Warning */}
      {!isConnected && currentConversationId && (
        <View style={styles.connectionStatus}>
          <Text style={styles.connectionStatusText}>Mode hors-ligne - Rafraichissement automatique</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Typing Indicator */}
        {typingIndicator && (
          <View style={styles.typingIndicatorContainer}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>{typingIndicator}</Text>
          </View>
        )}

        {/* Reply Preview */}
        {replyToMessage && (
          <View style={styles.replyPreviewContainer}>
            <View style={styles.replyPreviewLeft}>
              <View style={styles.replyPreviewBar} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewLabel}>Repondre a {replyToMessage.sender_name}</Text>
                <Text style={styles.replyPreviewMessage} numberOfLines={1}>{replyToMessage.content}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelReply} style={styles.replyPreviewClose}>
              <Ionicons name="close" size={20} color={Colors.gray500} />
            </TouchableOpacity>
          </View>
        )}

        {/* Edit Preview */}
        {editingMessage && (
          <View style={styles.editPreviewContainer}>
            <View style={styles.editPreviewLeft}>
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
              <View style={styles.editPreviewContent}>
                <Text style={styles.editPreviewLabel}>Modifier le message</Text>
                <Text style={styles.editPreviewMessage} numberOfLines={1}>{editingMessage.content}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelEdit} style={styles.editPreviewClose}>
              <Ionicons name="close" size={20} color={Colors.gray500} />
            </TouchableOpacity>
          </View>
        )}

        {/* Attachment Preview */}
        {attachedFiles.length > 0 && (
          <View style={styles.attachmentPreview}>
            {attachedFiles.map((file, index) => (
              <View key={index} style={styles.attachmentPreviewItem}>
                {file.type === 'image' && (
                  <Image source={{ uri: file.uri }} style={styles.attachmentPreviewImage} />
                )}
                {file.type === 'voice' && (
                  <View style={styles.attachmentPreviewVoice}>
                    <Ionicons name="mic" size={24} color={Colors.primary} />
                    <Text style={styles.attachmentPreviewVoiceDuration}>
                      {formatDuration(file.duration || 0)}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.attachmentRemoveButton}
                  onPress={handleRemoveAttachment}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recording UI */}
        {isRecording && (
          <View style={styles.recordingContainer}>
            <TouchableOpacity onPress={cancelRecording} style={styles.recordingCancelButton}>
              <Ionicons name="trash-outline" size={24} color={Colors.error} />
            </TouchableOpacity>
            <View style={styles.recordingInfo}>
              <Animated.View style={[styles.recordingDot, { transform: [{ scale: recordingAnim }] }]} />
              <Text style={styles.recordingDuration}>{formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.recordingStopButton}>
              <Ionicons name="send" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        {!isRecording && (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
                <Ionicons name="image-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={(text) => {
                  setNewMessage(text);
                  handleTyping();
                }}
                placeholder={editingMessage ? 'Modifier le message...' : 'Ecrivez votre message...'}
                placeholderTextColor={Colors.gray400}
                multiline
                maxLength={1000}
              />

              {newMessage.trim() || attachedFiles.length > 0 ? (
                <TouchableOpacity
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={sending}
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
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={22} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <Pressable
          style={styles.actionModalOverlay}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenuContainer}>
            <Text style={styles.actionMenuTitle}>Actions</Text>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleMessageAction('reply')}
            >
              <Ionicons name="arrow-undo-outline" size={22} color={Colors.gray700} />
              <Text style={styles.actionMenuItemText}>Repondre</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleMessageAction('react')}
            >
              <Ionicons name="happy-outline" size={22} color={Colors.gray700} />
              <Text style={styles.actionMenuItemText}>Reagir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleMessageAction('forward')}
            >
              <Ionicons name="arrow-redo-outline" size={22} color={Colors.gray700} />
              <Text style={styles.actionMenuItemText}>Transferer</Text>
            </TouchableOpacity>

            {selectedMessage && isMyMessage(selectedMessage) && (
              <>
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleMessageAction('edit')}
                >
                  <Ionicons name="create-outline" size={22} color={Colors.gray700} />
                  <Text style={styles.actionMenuItemText}>Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleMessageAction('delete')}
                >
                  <Ionicons name="trash-outline" size={22} color={Colors.error} />
                  <Text style={[styles.actionMenuItemText, { color: Colors.error }]}>Supprimer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowReactionPicker(false);
          setSelectedMessageId(null);
        }}
      >
        <Pressable
          style={styles.reactionModalOverlay}
          onPress={() => {
            setShowReactionPicker(false);
            setSelectedMessageId(null);
          }}
        >
          <View style={styles.reactionPickerContainer}>
            <Text style={styles.reactionPickerTitle}>Reagir au message</Text>
            <View style={styles.reactionPickerRow}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionPickerItem}
                  onPress={() => handleAddReaction(emoji)}
                >
                  <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Forward Modal */}
      <Modal
        visible={showForwardModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowForwardModal(false);
          setSelectedMessage(null);
        }}
      >
        <View style={styles.forwardModalContainer}>
          <View style={styles.forwardModalContent}>
            <View style={styles.forwardModalHeader}>
              <Text style={styles.forwardModalTitle}>Transferer a</Text>
              <TouchableOpacity onPress={() => {
                setShowForwardModal(false);
                setSelectedMessage(null);
              }}>
                <Ionicons name="close" size={24} color={Colors.gray700} />
              </TouchableOpacity>
            </View>

            {loadingForwardTargets ? (
              <View style={styles.forwardModalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={forwardTargets}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.forwardTargetItem}
                    onPress={() => handleForwardToUser(String(item.id))}
                  >
                    {item.profile_picture ? (
                      <Image source={{ uri: item.profile_picture }} style={styles.forwardTargetAvatar} />
                    ) : (
                      <View style={styles.forwardTargetAvatarPlaceholder}>
                        <Text style={styles.forwardTargetAvatarText}>
                          {(item.first_name?.[0] || item.email?.[0] || 'U').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.forwardTargetName}>
                      {item.first_name && item.last_name
                        ? `${item.first_name} ${item.last_name}`
                        : item.email?.split('@')[0] || 'Utilisateur'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.forwardEmptyContainer}>
                    <Text style={styles.forwardEmptyText}>Aucun contact disponible</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  headerTitleText: {
    ...TextStyles.bodyBold,
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
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },

  // Message Row
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },

  // Avatar
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
  },
  messageAvatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },

  // Bubble
  messageBubbleContainer: {
    maxWidth: '75%',
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  messageBubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  messageBubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleWithAttachment: {
    marginTop: Spacing.xs,
  },
  messageText: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
    lineHeight: 22,
  },
  messageTextMine: {
    color: Colors.white,
  },

  // Time
  messageTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTimeRowMine: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },

  // Attachments
  attachmentsContainer: {
    marginBottom: Spacing.xs,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  attachmentFileMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  attachmentFileName: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    flex: 1,
  },
  attachmentFileNameMine: {
    color: Colors.white,
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
  voiceWaveform: {
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

  // Reply Preview in Message
  replyPreviewInMessage: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  replyPreviewInMessageMine: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyPreviewBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  replyPreviewBarMine: {
    backgroundColor: Colors.white,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  replyPreviewNameMine: {
    color: Colors.white,
  },
  replyPreviewText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  replyPreviewTextMine: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
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

  // Reply Preview Container
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  replyPreviewLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  replyPreviewLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  replyPreviewMessage: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  replyPreviewClose: {
    padding: Spacing.xs,
  },

  // Edit Preview Container
  editPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  editPreviewLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editPreviewContent: {
    flex: 1,
  },
  editPreviewLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  editPreviewMessage: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  editPreviewClose: {
    padding: Spacing.xs,
  },

  // Attachment Preview
  attachmentPreview: {
    flexDirection: 'row',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  attachmentPreviewItem: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  attachmentPreviewVoice: {
    width: 80,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPreviewVoiceDuration: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    marginTop: 4,
  },
  attachmentRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 10,
  },

  // Recording
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
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
  recordingDuration: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  recordingStopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input
  inputContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
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

  // Action Menu Modal
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginHorizontal: Spacing.xl,
    width: '80%',
    maxWidth: 300,
  },
  actionMenuTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionMenuItemText: {
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },

  // Reaction Picker Modal
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  reactionPickerTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  reactionPickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reactionPickerItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPickerEmoji: {
    fontSize: 24,
  },

  // Forward Modal
  forwardModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  forwardModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
  },
  forwardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  forwardModalTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  forwardModalLoading: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  forwardTargetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  forwardTargetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
  },
  forwardTargetAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  forwardTargetAvatarText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.bold,
    color: Colors.gray600,
  },
  forwardTargetName: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  forwardEmptyContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  forwardEmptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },

  // Typing Indicator
  typingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray400,
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    fontStyle: 'italic',
  },

  // Connection Status
  connectionStatus: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.warning,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 100,
  },
  connectionStatusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
});
