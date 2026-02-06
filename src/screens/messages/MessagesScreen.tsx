/**
 * MessagesScreen - Liste des conversations refactorisée
 *
 * Améliorations:
 * - Taille d'avatar standardisée (MESSAGE_AVATAR_SIZE)
 * - Skeleton loading
 * - Composants mémorisés
 * - Helpers de formatage centralisés
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { messagesAPI, usersAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Conversation, RootStackParamList, User } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
  TOUCH_OPACITY,
} from '../../constants/theme';
import {
  MESSAGE_AVATAR_SIZE,
  getDisplayName,
  getUserInitials,
  formatRelativeTime,
} from '../../lib/utils/messagingHelpers';
import { MessageSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'all' | 'archived';

// ============================================
// CONVERSATION CARD COMPONENT
// ============================================

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId?: string | number;
  onPress: () => void;
  onLongPress: () => void;
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  currentUserId,
  onPress,
  onLongPress,
}: ConversationCardProps) {
  const otherUser = conversation.participants?.find(p => p.id !== currentUserId) || conversation.participants?.[0];
  const displayName = conversation.title || getDisplayName(otherUser || null);
  const avatar = otherUser?.profile_picture || (otherUser as any)?.image;
  const initials = getUserInitials(displayName);
  const hasUnread = conversation.unread_count > 0;

  return (
    <TouchableOpacity
      style={[styles.conversationCard, hasUnread && styles.unreadCard]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={TOUCH_OPACITY}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      )}

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text
            style={[styles.conversationName, hasUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={styles.conversationTime}>
            {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : ''}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {conversation.last_message || 'Aucun message'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCountText}>
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================
// USER ITEM COMPONENT
// ============================================

interface UserItemProps {
  user: User;
  onPress: () => void;
}

const UserItem = memo(function UserItem({ user, onPress }: UserItemProps) {
  const name = getDisplayName(user);
  const avatar = user.profile_picture || (user as any)?.image;
  const initials = getUserInitials(name);

  return (
    <TouchableOpacity
      style={styles.userItem}
      onPress={onPress}
      activeOpacity={TOUCH_OPACITY}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.userAvatar} />
      ) : (
        <View style={styles.userAvatarPlaceholder}>
          <Text style={styles.userAvatarInitials}>{initials}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{name}</Text>
        {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>
      <Ionicons name="chatbubble-outline" size={20} color={Colors.gray400} />
    </TouchableOpacity>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showConfirm } = useAlert();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New conversation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await messagesAPI.getConversations();
      setConversations(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersAPI.getUsers();
      const users = (response.data.results || response.data || [])
        .filter((u: User) => u.id !== user?.id);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const handleOpenNewModal = () => {
    setShowNewModal(true);
    fetchUsers();
  };

  const handleStartConversation = async (targetUser: User) => {
    // Vérifier si une conversation existe déjà
    const existingConv = conversations.find(conv => {
      if (conv.participants && conv.participants.length > 0) {
        return conv.participants.some(p => p.id === targetUser.id);
      }
      return false;
    });

    setShowNewModal(false);

    if (existingConv) {
      navigation.navigate('Conversation', { conversationId: existingConv.id });
    } else {
      const targetName = getDisplayName(targetUser);
      navigation.navigate('Conversation', {
        userId: targetUser.id,
        userName: targetName,
      });
    }
  };

  const handleArchive = async (conversationId: string) => {
    try {
      await messagesAPI.archiveConversation(conversationId);
      fetchConversations();
    } catch (error) {
      console.error('Erreur archivage:', error);
    }
  };

  const handleDelete = (conversationId: string) => {
    showConfirm(
      'Supprimer',
      'Supprimer cette conversation ?',
      async () => {
        try {
          await messagesAPI.deleteConversation(conversationId);
          fetchConversations();
        } catch (error) {
          console.error('Erreur suppression:', error);
        }
      },
      undefined,
      'Supprimer',
      'Annuler'
    );
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesTab = activeTab === 'all' ? !conv.is_archived : conv.is_archived;
    const otherUser = conv.participants?.find(p => p.id !== user?.id);
    const name = conv.title || getDisplayName(otherUser || null);
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Stats
  const unreadCount = conversations.filter(c => (c.unread_count || 0) > 0 && !c.is_archived).length;

  // Filtered users for new conversation modal
  const filteredUsers = availableUsers.filter(u => {
    const name = getDisplayName(u).toLowerCase();
    const email = (u.email || '').toLowerCase();
    const search = userSearch.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const renderConversation = useCallback(({ item }: { item: Conversation }) => {
    const otherUser = item.participants?.find(p => p.id !== user?.id);
    const displayName = item.title || getDisplayName(otherUser || null);

    return (
      <ConversationCard
        conversation={item}
        currentUserId={user?.id}
        onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}
        onLongPress={() => {
          showConfirm(
            'Options',
            displayName,
            () => handleArchive(item.id),
            () => handleDelete(item.id),
            item.is_archived ? 'Désarchiver' : 'Archiver',
            'Supprimer'
          );
        }}
      />
    );
  }, [user?.id, navigation, showConfirm]);

  const renderEmpty = () => (
    <EmptyState
      icon={activeTab === 'archived' ? 'archive-outline' : 'chatbubbles-outline'}
      title={activeTab === 'archived' ? 'Aucune archive' : 'Aucune conversation'}
      description={
        activeTab === 'archived'
          ? 'Vos conversations archivées apparaîtront ici.'
          : 'Commencez une nouvelle conversation !'
      }
      actionLabel={activeTab === 'all' ? 'Nouveau message' : undefined}
      onAction={activeTab === 'all' ? handleOpenNewModal : undefined}
    />
  );

  const renderUserItem = useCallback(({ item }: { item: User }) => (
    <UserItem user={item} onPress={() => handleStartConversation(item)} />
  ), []);

  // Loading state with skeletons
  if (loading) {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.container}>
            <View style={styles.headerContainer}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons name="chatbubbles" size={24} color={Colors.white} />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <Text style={styles.headerSubtitle}>Chargement...</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.listContent}>
              {[1, 2, 3, 4, 5].map(i => (
                <MessageSkeleton key={i} />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="chatbubbles" size={24} color={Colors.white} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Messages</Text>
                  <Text style={styles.headerSubtitle}>
                    {unreadCount > 0
                      ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
                      : 'Toutes vos conversations'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.newButton} onPress={handleOpenNewModal}>
                <Ionicons name="create-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={Colors.gray400} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher..."
                placeholderTextColor={Colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                  Conversations
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'archived' && styles.tabActive]}
                onPress={() => setActiveTab('archived')}
              >
                <Ionicons
                  name="archive-outline"
                  size={14}
                  color={activeTab === 'archived' ? Colors.white : Colors.gray500}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
                  Archives
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Conversations List */}
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          />

          {/* New Conversation Modal */}
          <Modal
            visible={showNewModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowNewModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nouveau message</Text>
                  <TouchableOpacity onPress={() => setShowNewModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.gray600} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalSearchContainer}>
                  <Ionicons name="search" size={18} color={Colors.gray400} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Rechercher un utilisateur..."
                    placeholderTextColor={Colors.gray400}
                    value={userSearch}
                    onChangeText={setUserSearch}
                    autoFocus
                  />
                </View>

                {loadingUsers ? (
                  <View style={styles.modalLoading}>
                    {[1, 2, 3].map(i => (
                      <MessageSkeleton key={i} />
                    ))}
                  </View>
                ) : (
                  <FlatList
                    data={filteredUsers}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.usersList}
                    ListEmptyComponent={
                      <View style={styles.noUsers}>
                        <Ionicons name="people-outline" size={48} color={Colors.gray300} />
                        <Text style={styles.noUsersText}>Aucun utilisateur trouvé</Text>
                      </View>
                    }
                  />
                )}
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },

  // Header
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: {
    ...TextStyles.h3,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  newButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: Colors.white,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },

  // Conversation Card
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  avatar: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  conversationContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadText: {
    fontFamily: FontFamily.bold,
  },
  conversationTime: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lastMessageUnread: {
    color: Colors.gray700,
    fontFamily: FontFamily.medium,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadCountText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    ...TextStyles.h4,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  modalLoading: {
    padding: Spacing.lg,
  },
  usersList: {
    paddingHorizontal: Spacing.lg,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  userAvatar: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
  },
  userAvatarPlaceholder: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  userEmail: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  noUsers: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  noUsersText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
});
