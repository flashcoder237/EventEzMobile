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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { messagesAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Message, RootStackParamList } from '../../types';
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
  type: 'image' | 'document';
}

export default function ConversationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConversationRouteProp>();
  const { conversationId } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    fetchConversationDetails();
    markAsRead();

    // Polling for new messages (every 5 seconds)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const fetchConversationDetails = async () => {
    try {
      const response = await messagesAPI.getConversation(conversationId);
      const conversation = response.data;

      // Get other participant info
      const otherParticipant = conversation.participants?.find(
        (p: any) => p.id !== user?.id
      );

      const title = conversation.title ||
        (otherParticipant?.first_name && otherParticipant?.last_name
          ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
          : otherParticipant?.email?.split('@')[0] || 'Conversation');

      setConversationTitle(title);
      setOtherUserAvatar(otherParticipant?.profile_picture || otherParticipant?.image || null);

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
      });
    } catch (error) {
      console.error('Erreur chargement détails conversation:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await messagesAPI.getMessages(conversationId);
      const newMessages = response.data.results || response.data || [];
      setMessages(newMessages.reverse()); // Messages du plus ancien au plus récent
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await messagesAPI.markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'accès aux photos pour envoyer des images.');
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
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFiles([]);
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0) || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation: conversationId,
      sender: user!,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
      attachments: attachedFiles.map(f => ({
        id: `temp-${Date.now()}`,
        file: f.uri,
        attachment_type: f.type,
        file_name: f.name,
      })),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setAttachedFiles([]);

    try {
      // If there are attachments, upload them first
      let attachmentIds: string[] = [];

      if (tempMessage.attachments && tempMessage.attachments.length > 0) {
        for (const att of tempMessage.attachments) {
          const formData = new FormData();
          formData.append('file', {
            uri: att.file,
            name: att.file_name,
            type: 'image/jpeg',
          } as any);
          formData.append('type', att.attachment_type);

          try {
            const uploadResponse = await messagesAPI.uploadAttachment(formData);
            if (uploadResponse.data?.id) {
              attachmentIds.push(uploadResponse.data.id);
            }
          } catch (uploadError) {
            console.error('Erreur upload attachment:', uploadError);
          }
        }
      }

      const response = await messagesAPI.sendMessage(conversationId, {
        content: messageContent,
        attachments: attachmentIds,
      });

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? response.data : msg))
      );
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      setNewMessage(messageContent); // Restore message content
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

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
    const senderId = typeof message.sender === 'string' ? message.sender : message.sender?.id;
    return senderId === user?.id;
  };

  const getInitials = (message: Message) => {
    if (typeof message.sender === 'string') return 'U';
    const sender = message.sender;
    if (sender.first_name && sender.last_name) {
      return `${sender.first_name[0]}${sender.last_name[0]}`.toUpperCase();
    }
    return (sender.email?.[0] || 'U').toUpperCase();
  };

  const renderAttachment = (attachment: any, isMine: boolean) => {
    if (attachment.attachment_type === 'image') {
      return (
        <Image
          source={{ uri: attachment.file }}
          style={styles.attachmentImage}
          resizeMode="cover"
        />
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

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item);
    const showDate = shouldShowDate(index);
    const sender = typeof item.sender === 'object' ? item.sender : null;
    const avatar = sender?.profile_picture || sender?.image;
    const hasAttachments = item.attachments && item.attachments.length > 0;

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
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
            {/* Attachments */}
            {hasAttachments && (
              <View style={styles.attachmentsContainer}>
                {item.attachments?.map((att, i) => (
                  <View key={att.id || i}>
                    {renderAttachment(att, isMine)}
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

            {/* Time */}
            <View style={[styles.messageTimeRow, isMine && styles.messageTimeRowMine]}>
              <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              {isMine && (
                <Ionicons
                  name={item.is_read ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.is_read ? Colors.primary : Colors.gray400}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [messages, user]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.gray300} />
      </View>
      <Text style={styles.emptyText}>Aucun message</Text>
      <Text style={styles.emptySubtext}>Commencez la conversation !</Text>
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

        {/* Attachment Preview */}
        {attachedFiles.length > 0 && (
          <View style={styles.attachmentPreview}>
            {attachedFiles.map((file, index) => (
              <View key={index} style={styles.attachmentPreviewItem}>
                {file.type === 'image' && (
                  <Image source={{ uri: file.uri }} style={styles.attachmentPreviewImage} />
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

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Écrivez votre message..."
              placeholderTextColor={Colors.gray400}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!newMessage.trim() && attachedFiles.length === 0) || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={(!newMessage.trim() && attachedFiles.length === 0) || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  attachmentRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 10,
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
});
