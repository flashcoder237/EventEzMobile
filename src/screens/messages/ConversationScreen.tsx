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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { messagesAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Message, RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
  Gradients,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ConversationRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

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
      setConversationTitle(conversation.title || 'Conversation');
      navigation.setOptions({ headerTitle: conversation.title || 'Conversation' });
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

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

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
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await messagesAPI.sendMessage(conversationId, { content: messageContent });
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? response.data : msg))
      );
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      setNewMessage(messageContent); // Restore message content
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

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item);
    const showDate = shouldShowDate(index);
    const sender = typeof item.sender === 'object' ? item.sender : null;
    const avatar = sender?.profile_picture || sender?.image;

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
              <LinearGradient colors={Gradients.primary} style={styles.messageAvatarPlaceholder}>
                <Text style={styles.messageAvatarInitials}>{getInitials(item)}</Text>
              </LinearGradient>
            )
          )}
          <View
            style={[
              styles.messageBubble,
              isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
            ]}
          >
            <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
              {formatTime(item.created_at)}
              {isMine && item.is_read && (
                <Text style={styles.readIndicator}> ✓✓</Text>
              )}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [messages, user]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.gray300} />
      <Text style={styles.emptyText}>Aucun message</Text>
      <Text style={styles.emptySubtext}>Commencez la conversation !</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
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
                (!newMessage.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={20} color={Colors.white} />
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    flexGrow: 1,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },
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
  },
  messageAvatarInitials: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  messageBubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  messageBubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
    lineHeight: 22,
  },
  messageTextMine: {
    color: Colors.white,
  },
  messageTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  readIndicator: {
    color: 'rgba(255,255,255,0.8)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    marginTop: Spacing.xs,
  },
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
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.base,
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
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
});
