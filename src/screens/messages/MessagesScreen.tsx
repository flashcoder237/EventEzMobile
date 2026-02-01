import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { messagesAPI, usersAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Conversation, RootStackParamList, User } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'all' | 'archived';

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
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
      if (conv.participants) {
        return conv.participants.some(p => p.id === targetUser.id);
      }
      return false;
    });

    if (existingConv) {
      setShowNewModal(false);
      navigation.navigate('Conversation', { conversationId: existingConv.id });
      return;
    }

    // Créer nouvelle conversation
    try {
      const response = await messagesAPI.createConversation({
        participant_ids: [user?.id, targetUser.id],
      });
      setShowNewModal(false);
      await fetchConversations();
      navigation.navigate('Conversation', { conversationId: response.data.id });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la conversation');
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
    Alert.alert(
      'Supprimer',
      'Supprimer cette conversation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesAPI.deleteConversation(conversationId);
              fetchConversations();
            } catch (error) {
              console.error('Erreur suppression:', error);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (conversation.participants && conversation.participants.length > 0) {
      return conversation.participants.find(p => p.id !== user?.id) || conversation.participants[0];
    }
    return null;
  };

  const getDisplayName = (u: User | null): string => {
    if (!u) return 'Utilisateur';
    if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`;
    if (u.first_name) return u.first_name;
    if (u.email) return u.email.split('@')[0];
    return 'Utilisateur';
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesTab = activeTab === 'all' ? !conv.is_archived : conv.is_archived;
    const otherUser = getOtherParticipant(conv);
    const name = conv.title || getDisplayName(otherUser);
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Stats
  const unreadCount = conversations.filter(c => (c.unread_count || 0) > 0 && !c.is_archived).length;

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    const displayName = item.title || getDisplayName(otherUser);
    const avatar = otherUser?.profile_picture || otherUser?.image;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, item.unread_count > 0 && styles.unreadCard]}
        onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}
        onLongPress={() => {
          Alert.alert(
            'Options',
            displayName,
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: item.is_archived ? 'Désarchiver' : 'Archiver',
                onPress: () => handleArchive(item.id),
              },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: () => handleDelete(item.id),
              },
            ]
          );
        }}
        activeOpacity={0.7}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
          </View>
        )}

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.conversationName, item.unread_count > 0 && styles.unreadText]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={styles.conversationTime}>
              {item.last_message_at ? formatTime(item.last_message_at) : ''}
            </Text>
          </View>
          <View style={styles.conversationFooter}>
            <Text
              style={[styles.lastMessage, item.unread_count > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.last_message || 'Aucun message'}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCountText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={activeTab === 'archived' ? 'archive-outline' : 'chatbubbles-outline'}
          size={48}
          color={Colors.gray400}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'archived' ? 'Aucune archive' : 'Aucune conversation'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'archived'
          ? 'Vos conversations archivées apparaîtront ici.'
          : 'Commencez une nouvelle conversation !'}
      </Text>
      {activeTab === 'all' && (
        <TouchableOpacity style={styles.emptyButton} onPress={handleOpenNewModal}>
          <Text style={styles.emptyButtonText}>Nouveau message</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderUserItem = (u: User) => {
    const name = getDisplayName(u);
    const avatar = u.profile_picture || u.image;

    return (
      <TouchableOpacity
        key={u.id}
        style={styles.userItem}
        onPress={() => handleStartConversation(u)}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userAvatarInitials}>{getInitials(name)}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{u.email}</Text>
        </View>
        <Ionicons name="chatbubble-outline" size={20} color={Colors.gray400} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

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
                {unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : 'Toutes vos conversations'}
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
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={availableUsers.filter(u => {
                  const name = getDisplayName(u).toLowerCase();
                  const email = (u.email || '').toLowerCase();
                  const search = userSearch.toLowerCase();
                  return name.includes(search) || email.includes(search);
                })}
                renderItem={({ item }) => renderUserItem(item)}
                keyExtractor={(item) => item.id}
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
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.lg,
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
    color: Colors.gray500,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: FontSizes.sm,
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

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    ...TextStyles.button,
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
    color: Colors.gray900,
  },
  modalLoading: {
    padding: Spacing['3xl'],
    alignItems: 'center',
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
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
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
    color: Colors.gray500,
    marginTop: 2,
  },
  noUsers: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  noUsersText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
});
