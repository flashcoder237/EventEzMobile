/**
 * MessagesScreen - Soft Editorial Inbox
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { messagesAPI, usersAPI } from '../../api';
import CacheService from '../../services/CacheService';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useMutedConversations } from '../../hooks/useMutedConversations';
import { useTheme } from '../../contexts/ThemeContext';
import { Conversation, RootStackParamList, User } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
  Colors,
} from '../../constants/theme';
import {
  MESSAGE_AVATAR_SIZE,
  getDisplayName,
  getUserInitials,
  formatRelativeTime,
} from '../../lib/utils/messagingHelpers';
import { ConversationItemSkeleton, MessagesScreenSkeleton } from '../../components/ui/Skeleton';
import { NewMessage, PeopleSearch, AnimatedIllustration } from '../../components/illustrations';
import { StaggeredItem } from '../../components/ui/Animations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'all' | 'events' | 'archived';

// ============================================
// CONVERSATION CARD — soft rounded
// ============================================

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId?: string | number;
  isMuted?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  currentUserId,
  isMuted: muted = false,
  onPress,
  onLongPress,
}: ConversationCardProps) {
  const { colors, isDark } = useTheme();
  const otherUser = conversation.participants?.find(p => p.id !== currentUserId) || conversation.participants?.[0];
  const displayName = conversation.title || getDisplayName(otherUser || null);
  const avatar = otherUser?.profile_picture || (otherUser as any)?.image;
  const initials = getUserInitials(displayName);
  const hasUnread = conversation.unread_count > 0;
  const isOrganizer = (otherUser as any)?.role === 'organizer' || (otherUser as any)?.user_type === 'organization';

  const preview =
    (typeof conversation.last_message === 'object'
      ? conversation.last_message?.content
      : conversation.last_message) || 'Aucun message';

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.05)',
        },
        Shadows.sm,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${displayName}${
        hasUnread ? `, ${conversation.unread_count} non lu${conversation.unread_count > 1 ? 's' : ''}` : ''
      }`}
    >
      {/* Avatar — rounded */}
      <View style={cardStyles.avatarWrap}>
        {avatar ? (
          <Image
            source={avatar}
            style={cardStyles.avatarImg}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View
            style={[
              cardStyles.avatarImg,
              { backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <Text style={[cardStyles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
          </View>
        )}
        {hasUnread && (
          <View
            style={[
              cardStyles.avatarDot,
              { backgroundColor: colors.accent, borderColor: colors.card },
            ]}
          />
        )}
      </View>

      <View style={cardStyles.body}>
        {/* Eyebrow row: organizer badge + time */}
        <View style={cardStyles.eyebrowRow}>
          {isOrganizer ? (
            <View
              style={[
                cardStyles.organizerBadge,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Text style={[cardStyles.organizerText, { color: colors.primary }]}>ORGANIZER</Text>
            </View>
          ) : (
            <Text style={[cardStyles.directLabel, { color: colors.gray500 }]}>DIRECT</Text>
          )}
          <Text style={[cardStyles.time, { color: colors.gray500 }]}>
            {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : ''}
          </Text>
        </View>

        <Text
          style={[
            cardStyles.name,
            { color: colors.text },
            hasUnread && { fontFamily: FontFamily.displayExtraBold },
          ]}
          numberOfLines={1}
        >
          {displayName}
        </Text>

        <View style={cardStyles.footerRow}>
          <Text
            style={[
              cardStyles.preview,
              { color: hasUnread ? colors.text : colors.gray500 },
              hasUnread && { fontFamily: FontFamily.semiBold },
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnread && (
            <View style={[cardStyles.unreadPill, { backgroundColor: colors.accent }]}>
              <Text style={cardStyles.unreadPillText}>
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'visible',
    position: 'relative',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitials: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  avatarDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  organizerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  organizerText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  directLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  time: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 16,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  preview: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
});

// ============================================
// USER ITEM (for new conversation modal)
// ============================================

interface UserItemProps {
  user: User;
  onPress: () => void;
}

const UserItem = memo(function UserItem({ user, onPress }: UserItemProps) {
  const { colors, isDark } = useTheme();
  const name = getDisplayName(user);
  const avatar = user.profile_picture || (user as any)?.image;
  const initials = getUserInitials(name);

  return (
    <TouchableOpacity
      style={[
        userStyles.row,
        { borderBottomColor: isDark ? colors.gray200 : colors.gray100 },
      ]}
      onPress={onPress}
      activeOpacity={TOUCH_OPACITY}
    >
      <View style={userStyles.avatarWrap}>
        {avatar ? (
          <Image source={avatar} style={userStyles.avatarImg} cachePolicy="disk" transition={200} />
        ) : (
          <View
            style={[
              userStyles.avatarImg,
              { backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <Text style={{ fontFamily: FontFamily.displayBold, fontSize: 16, color: colors.primary }}>
              {initials}
            </Text>
          </View>
        )}
      </View>
      <View style={userStyles.info}>
        <Text style={[userStyles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        {user.email && <Text style={[userStyles.email, { color: colors.gray500 }]} numberOfLines={1}>{user.email}</Text>}
      </View>
      <View style={[userStyles.chevronDisc, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
});

const userStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  chevronDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showConfirm, showAlert } = useAlert();
  const { isMuted, toggle: toggleMute } = useMutedConversations();
  const { colors, isDark } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (userSearchTimerRef.current) {
      clearTimeout(userSearchTimerRef.current);
    }

    if (userSearch.length < 2) {
      setAvailableUsers([]);
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    userSearchTimerRef.current = setTimeout(async () => {
      try {
        const response = await usersAPI.getUsers({ search: userSearch, page_size: 20 });
        const users = (response.data.results || response.data || [])
          .filter((u: User) => u.id !== user?.id);
        setAvailableUsers(users);
      } catch (error) {
        if (__DEV__) console.error('Erreur recherche utilisateurs:', error);
      } finally {
        setLoadingUsers(false);
      }
    }, 300);

    return () => {
      if (userSearchTimerRef.current) {
        clearTimeout(userSearchTimerRef.current);
      }
    };
  }, [userSearch, user?.id]);

  const fetchConversations = async (bypassCache = false) => {
    const cacheKey = `convos:${user?.id}`;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<Conversation[]>(cacheKey);
        if (cached) {
          setConversations(cached.data);
          setLoading(false);
          if (!cached.isStale) return;
        }
      }
      const response = await messagesAPI.getConversations();
      const data = response.data.results || response.data || [];
      setConversations(data);
      CacheService.set(cacheKey, data, 30 * 1000);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations(true);
  };

  const handleOpenNewModal = () => {
    setShowNewModal(true);
  };

  const handleStartConversation = async (targetUser: User) => {
    const existingConv = conversations.find(conv => {
      if (conv.participants && conv.participants.length > 0) {
        return conv.participants.some(p => p.id === targetUser.id);
      }
      return false;
    });

    setShowNewModal(false);

    if (existingConv) {
      navigation.navigate('Conversation', { conversationId: String(existingConv.id) });
    } else {
      const targetName = getDisplayName(targetUser);
      navigation.navigate('Conversation', {
        userId: String(targetUser.id),
        userName: targetName,
      });
    }
  };

  const handleArchive = async (conversationId: string) => {
    try {
      await messagesAPI.archiveConversation(conversationId);
      CacheService.invalidate(`convos:${user?.id}`);
      fetchConversations(true);
    } catch (error) {
      if (__DEV__) console.error('Erreur archivage:', error);
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
          if (__DEV__) console.error('Erreur suppression:', error);
        }
      }
    );
  };

  const filteredConversations = conversations
    .filter(conv => {
      if (activeTab === 'archived') {
        if (!conv.is_archived) return false;
      } else {
        if (conv.is_archived) return false;
      }
      if (activeTab === 'events') {
        const otherUser = conv.participants?.find(p => p.id !== user?.id);
        const role = (otherUser as any)?.role;
        const uType = (otherUser as any)?.user_type;
        if (role !== 'organizer' && uType !== 'organization') return false;
      }
      const otherUser = conv.participants?.find(p => p.id !== user?.id);
      const name = conv.title || getDisplayName(otherUser || null);
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.is_starred && !b.is_starred) return -1;
      if (!a.is_starred && b.is_starred) return 1;
      const aTime = new Date(a.last_message_at || a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });

  const unreadCount = conversations.filter(c => (c.unread_count || 0) > 0 && !c.is_archived).length;
  const filteredUsers = availableUsers;

  const renderConversation = useCallback(({ item, index }: { item: Conversation; index: number }) => {
    const otherUser = item.participants?.find(p => p.id !== user?.id);
    const displayName = item.title || getDisplayName(otherUser || null);

    return (
      <StaggeredItem index={index}>
        <ConversationCard
          conversation={item}
          currentUserId={user?.id}
          isMuted={isMuted(String(item.id))}
          onPress={() => navigation.navigate('Conversation', { conversationId: String(item.id) })}
          onLongPress={() => {
            const convId = String(item.id);
            const muted = isMuted(convId);
            showAlert(
              'Options',
              `${displayName}\n\nQue veux-tu faire ?`,
              [
                {
                  text: muted ? 'Réactiver les notifs' : 'Couper les notifs',
                  onPress: () => toggleMute(convId),
                },
                { text: 'Archiver', onPress: () => handleArchive(convId) },
                { text: 'Supprimer', style: 'destructive', onPress: () => handleDelete(convId) },
                { text: 'Annuler', style: 'cancel' },
              ],
              'info',
            );
          }}
        />
      </StaggeredItem>
    );
  }, [user?.id, navigation, showAlert, isMuted, toggleMute]);

  const renderEmpty = () => {
    const eyebrow = activeTab === 'archived' ? 'BOÎTE ARCHIVÉE' : 'BOÎTE VIDE';
    const title = activeTab === 'archived' ? 'Rien ici' : 'Pas encore';
    const sub =
      activeTab === 'archived'
        ? 'Les conversations archivées viendront se loger ici.'
        : 'Commence un nouveau message — on trouvera quelqu\'un à qui parler.';
    return (
      <View style={styles.emptyWrap}>
        <AnimatedIllustration entry="fadeIn" idle="sway">
          <NewMessage color={colors.primary} size={140} />
        </AnimatedIllustration>
        <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{eyebrow}</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyDesc, { color: colors.gray500 }]}>{sub}</Text>
        {activeTab === 'all' && (
          <TouchableOpacity
            style={[
              styles.emptyCta,
              { backgroundColor: colors.primary },
              Shadows.md,
            ]}
            onPress={handleOpenNewModal}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyCtaText}>NOUVEAU MESSAGE</Text>
            <View style={styles.emptyCtaDisc}>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUserItem = useCallback(({ item }: { item: User }) => (
    <UserItem user={item} onPress={() => handleStartConversation(item)} />
  ), []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MessagesScreenSkeleton />
      </SafeAreaView>
    );
  }

  const hairline = isDark ? colors.gray200 : colors.gray100;

  type ChipDef = { key: TabType; label: string };
  const chips: ChipDef[] = [
    { key: 'all', label: 'Tous' },
    { key: 'events', label: 'Événements' },
    { key: 'archived', label: 'Archives' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header row */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: isDark ? colors.border : 'rgba(255,255,255,0.5)',
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.iconDisc,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
              },
              Shadows.sm,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
              ÉCHANGES • {unreadCount > 0 ? `${unreadCount} NON LUS` : 'TOUT LU'}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Inbox</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSearchOpen(s => !s)}
            style={[
              styles.iconDisc,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
                marginRight: 8,
              },
              Shadows.sm,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Rechercher"
          >
            <Ionicons name={searchOpen ? 'close' : 'search'} size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenNewModal}
            style={[styles.composeBtn, { backgroundColor: colors.primary }, Shadows.md]}
            activeOpacity={0.85}
            accessibilityLabel="Nouveau message"
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search bar — only when open */}
        {searchOpen && (
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? colors.gray100 : colors.gray50,
                  borderColor: isDark ? colors.gray200 : colors.gray100,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.gray500} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Chercher une conversation…"
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Chips */}
        <View style={styles.chipsRow}>
          {chips.map((c) => {
            const active = activeTab === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setActiveTab(c.key)}
                activeOpacity={0.85}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active
                      ? colors.primary
                      : isDark
                      ? colors.gray200
                      : 'rgba(0,0,0,0.05)',
                  },
                  !active && Shadows.sm,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />

      {/* Footer eyebrow */}
      <View style={styles.footerBlock}>
        <View style={[styles.footerLine, { backgroundColor: hairline }]} />
        <Text style={[styles.footerText, { color: colors.gray500 }]}>EVENTEZ — ÉDITION 2026</Text>
      </View>

      {/* New Conversation Modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(17,17,16,0.5)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
                },
                Shadows.lg,
              ]}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.gray300 }]} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalEyebrow, { color: colors.accent }]}>DÉMARRER</Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowNewModal(false)}
                  style={[
                    styles.iconDisc,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.gray50,
                      borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.modalSearchBar,
                  {
                    backgroundColor: isDark ? colors.gray100 : colors.gray50,
                    borderColor: isDark ? colors.gray200 : colors.gray100,
                  },
                ]}
              >
                <Ionicons name="search" size={16} color={colors.gray500} />
                <TextInput
                  style={[styles.modalSearchInput, { color: colors.text }]}
                  placeholder="Chercher un contact…"
                  placeholderTextColor={colors.gray400}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  autoFocus
                />
              </View>

              {loadingUsers ? (
                <View style={styles.modalLoading}>
                  {[1, 2, 3].map(i => (
                    <ConversationItemSkeleton key={i} />
                  ))}
                </View>
              ) : (
                <FlatList
                  data={filteredUsers}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.usersList}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <View style={styles.noUsers}>
                      <AnimatedIllustration entry="fadeIn" idle="breathe">
                        <PeopleSearch color={colors.primary} size={120} />
                      </AnimatedIllustration>
                      <Text style={[styles.noUsersEyebrow, { color: colors.gray500 }]}>RECHERCHE</Text>
                      <Text style={[styles.noUsersTitle, { color: colors.text }]}>
                        {userSearch.length < 2 ? 'Tape pour chercher' : 'Personne trouvée'}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    paddingVertical: 0,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: 10,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    letterSpacing: -1.2,
  },
  emptyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 14,
    gap: 10,
  },
  emptyCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  emptyCtaDisc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 6,
  },
  footerLine: {
    width: 40,
    height: 1,
  },
  footerText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,16,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    height: '85%',
    paddingBottom: Spacing.lg,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
  modalLoading: {
    padding: Spacing.lg,
  },
  usersList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  noUsers: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: 6,
  },
  noUsersEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  noUsersTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.9,
    textAlign: 'center',
  },
});
