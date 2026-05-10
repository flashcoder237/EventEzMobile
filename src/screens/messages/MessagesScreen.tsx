/**
 * MessagesScreen - Soft Editorial Inbox
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
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
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { messagesAPI, usersAPI, getMediaUrl } from '../../api';
import CacheService from '../../services/CacheService';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useMutedConversations } from '../../hooks/useMutedConversations';
import { useMessagingWebSocket } from '../../hooks/useMessagingWebSocket';
import { useTheme } from '../../contexts/ThemeContext';
import { Conversation, Message, RootStackParamList, User } from '../../types';
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
type TabType = 'all' | 'unread' | 'events' | 'archived';

// Hauteur estimée d'une ligne conversation
const CONVERSATION_ROW_HEIGHT = 76;

// ============================================
// CONVERSATION CARD — soft rounded
// ============================================

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId?: string | number;
  isMuted?: boolean;
  /** True si l'autre user (conversation directe) est en ligne. */
  isOnline?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  currentUserId,
  isMuted: muted = false,
  isOnline = false,
  onPress,
  onLongPress,
}: ConversationCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const otherUser = conversation.participants?.find(p => p.id !== currentUserId) || conversation.participants?.[0];
  const conversationType = (conversation as any).conversation_type;
  const isGroupOrEvent = conversationType === 'event' || conversationType === 'group';
  const displayName = conversation.title
    || (conversation as any).name
    || getDisplayName(otherUser || null);
  // Pour les conversations groupe / event : avatar dérivé du banner event.
  // Pour les directes : photo de profil du participant. Fallback : initiales.
  // getMediaUrl() résout les paths relatifs renvoyés par certains endpoints
  // qui n'ont pas accès au request (signaux, WS) — sans ça, expo-image
  // ne sait pas quoi faire de "/media/..." et le tap-out tombe sur le
  // placeholder initiales.
  const groupAvatar = getMediaUrl((conversation as any).avatar);
  const directAvatar = getMediaUrl(otherUser?.profile_picture || (otherUser as any)?.image);
  const avatar = groupAvatar || directAvatar;
  const initials = getUserInitials(displayName);
  const hasUnread = conversation.unread_count > 0;

  const preview =
    (typeof conversation.last_message === 'object'
      ? conversation.last_message?.content
      : conversation.last_message) || t('messages.noMessageFallback');

  // Anneau d'accent autour de l'avatar pour les conversations non lues —
  // pattern Instagram stories. Couleur = corail (accent), atténuée si mute.
  const ringColor = hasUnread
    ? muted ? colors.gray400 : colors.accent
    : 'transparent';

  return (
    <TouchableOpacity
      style={cardStyles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${displayName}${
        hasUnread ? `, ${conversation.unread_count} non lu${conversation.unread_count > 1 ? 's' : ''}` : ''
      }`}
    >
      {/* Avatar avec ring unread + petit badge type pour les groupes/events */}
      <View style={cardStyles.avatarWrap}>
        <View
          style={[
            cardStyles.avatarRing,
            { borderColor: ringColor },
          ]}
        >
          {avatar ? (
            <Image
              source={avatar}
              style={cardStyles.avatarImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View
              style={[
                cardStyles.avatarImg,
                {
                  backgroundColor: isGroupOrEvent ? `${colors.accent}20` : `${colors.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Text
                style={[
                  cardStyles.avatarInitials,
                  { color: isGroupOrEvent ? colors.accent : colors.primary },
                ]}
              >
                {initials}
              </Text>
            </View>
          )}
        </View>
        {isGroupOrEvent && (
          <View
            style={[
              cardStyles.typeBadge,
              { backgroundColor: colors.primary, borderColor: colors.background },
            ]}
            accessibilityElementsHidden
          >
            <Ionicons name="calendar" size={9} color="#FFFFFF" />
          </View>
        )}
        {/* Pastille de présence en ligne — direct conversation uniquement */}
        {!isGroupOrEvent && isOnline && (
          <View
            style={[
              cardStyles.presenceDot,
              { backgroundColor: '#22C55E', borderColor: colors.background },
            ]}
            accessibilityLabel={t('messages.online')}
          />
        )}
      </View>

      <View style={cardStyles.body}>
        {/* Ligne 1 : nom + heure */}
        <View style={cardStyles.titleRow}>
          <Text
            style={[
              cardStyles.name,
              { color: colors.text },
              hasUnread && cardStyles.nameUnread,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[
              cardStyles.time,
              { color: hasUnread && !muted ? colors.accent : colors.gray400 },
            ]}
          >
            {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : ''}
          </Text>
        </View>

        {/* Ligne 2 : preview + indicateurs (mute + badge unread) */}
        <View style={cardStyles.previewRow}>
          <Text
            style={[
              cardStyles.preview,
              { color: hasUnread ? colors.text : colors.gray500 },
              hasUnread && cardStyles.previewUnread,
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {muted && (
            <Ionicons
              name="notifications-off"
              size={13}
              color={colors.gray400}
              style={{ marginLeft: 6 }}
            />
          )}
          {hasUnread && (
            <View
              style={[
                cardStyles.unreadPill,
                { backgroundColor: muted ? colors.gray400 : colors.accent },
              ]}
            >
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
  // Design "Editorial List" — pas de card individuelle, juste une row aérée.
  // Le séparateur entre items est rendu par la liste parente (border-bottom
  // hairline), pour un look plus moderne, type iMessage / Telegram.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 14,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  typeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  nameUnread: {
    fontFamily: FontFamily.displayExtraBold,
  },
  time: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  preview: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  previewUnread: {
    fontFamily: FontFamily.semiBold,
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    marginLeft: 2,
  },
  unreadPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
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
  const avatar = getMediaUrl(user.profile_picture || (user as any)?.image);
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
          <Image source={avatar} style={userStyles.avatarImg} cachePolicy="memory-disk" transition={200} />
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
  const { t } = useTranslation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Pagination
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  pageRef.current = page;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

  // Recherche globale dans les messages (en plus du filtre conversations)
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const messageSearchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // ID monotone pour ignorer les réponses out-of-order (équivalent AbortController
  // sans avoir à modifier l'API : la requête se termine mais on jette le résultat
  // si une nouvelle requête a été lancée entre-temps).
  const messageSearchReqIdRef = useRef(0);

  // Presence map : userId → status. Alimentée par REST au mount + WS events.
  const [presenceMap, setPresenceMap] = useState<Map<number, string>>(new Map());

  // Index Map id → position dans `conversations`. Reconstruit à chaque
  // changement de la liste via useMemo. Permet à `onNewMessage` de faire un
  // lookup O(1) au lieu d'un findIndex O(n) — gain notable sur 100+ conv.
  // On expose la Map via une ref pour que le handler WebSocket (closure
  // capturée à la création de l'effet) lise toujours la version courante
  // sans dépendance à recréer.
  const conversationIdxMap = useMemo(() => {
    const map = new Map<string, number>();
    conversations.forEach((c, i) => {
      map.set(String(c.id), i);
    });
    return map;
  }, [conversations]);
  const conversationIdxMapRef = useRef(conversationIdxMap);
  conversationIdxMapRef.current = conversationIdxMap;

  const [showNewModal, setShowNewModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const userSearchReqIdRef = useRef(0);

  useEffect(() => {
    fetchConversations();
    fetchPresence();
  }, []);

  // Récupérer la presence map au mount (REST snapshot)
  const fetchPresence = async () => {
    try {
      const response = await messagesAPI.getPresence();
      const data = response.data?.results || response.data || [];
      const next = new Map<number, string>();
      if (Array.isArray(data)) {
        data.forEach((entry: any) => {
          if (entry && entry.user_id != null) {
            next.set(Number(entry.user_id), entry.status || 'offline');
          }
        });
      }
      setPresenceMap(next);
    } catch (error) {
      if (__DEV__) console.warn('[MessagesScreen] fetchPresence failed', error);
    }
  };

  // WebSocket — écoute les nouveaux messages, les changements de présence et
  // les unread.decrement (déclenchés quand l'user marque comme lu depuis un
  // autre device). Côté inbox, on met à jour les compteurs et la preview en
  // place sans refresh complet.
  // `wsConnected` alimente le polling fallback + l'indicateur visuel.
  const { isConnected: wsConnected } = useMessagingWebSocket({
    onNewMessage: (msg) => {
      // Compat snake_case (WS consumer) / camelCase ou flat (REST)
      const incomingConvId = String((msg as any).conversation_id ?? msg.conversation);
      if (__DEV__) {
        console.log('[Inbox] message.new received', {
          convId: incomingConvId,
          msgId: msg.id,
          mapSize: conversationIdxMapRef.current.size,
          mapHasConv: conversationIdxMapRef.current.has(incomingConvId),
        });
      }
      // Toast / haptic léger quand un message arrive depuis l'inbox
      // (l'utilisateur n'est pas dans la conversation correspondante puisqu'il
      // est sur la liste). On évite l'haptic si c'est un message envoyé par
      // l'user lui-même (ex. retour serveur d'un envoi local).
      const senderId = (() => {
        const s: any = msg.sender;
        if (s == null) return null;
        if (typeof s === 'object' && s.id != null) return Number(s.id);
        return Number(s);
      })();
      if (senderId !== Number(user?.id)) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore — haptic non critique
        }
      }
      // Toujours invalider le cache : la prochaine lecture (focus, AppState
      // active, mount d'un autre ecran) doit voir la donnee fraiche.
      CacheService.invalidate(`convos:${user?.id}`);
      // Met à jour la conversation correspondante.
      // Optim : lookup O(1) via la Map indexée (vs findIndex O(n) précédemment).
      // Cas gérés :
      //  - conv inexistante (idx undefined) → refetch (DM reçue d'un nouvel
      //    interlocuteur dont la conversation n'a pas encore été créée
      //    localement, ou conversation créée pendant qu'on était hors-ligne)
      //  - conv déjà en tête (idx === 0) → update in-place sans reorder
      //  - conv au milieu → bring-to-top en construisant le nouveau tableau en O(n) une seule fois
      let convFound = false;
      setConversations(prev => {
        // incomingConvId est calcule plus haut (compat snake_case/flat)
        const convId = incomingConvId;
        const idx = conversationIdxMapRef.current.get(convId);
        if (idx === undefined || idx < 0 || idx >= prev.length) {
          // Conv inconnue → on signale pour declencher un refetch hors callback
          return prev;
        }
        convFound = true;
        const updated = { ...prev[idx] };
        updated.last_message = msg;
        updated.last_message_at = msg.created_at;
        if (senderId !== Number(user?.id)) {
          updated.unread_count = (updated.unread_count || 0) + 1;
        }
        // Si la conv est déjà en tête, on évite de reconstruire le tableau.
        if (idx === 0) {
          const next = prev.slice();
          next[0] = updated;
          return next;
        }
        // Bring-to-top : construire un nouveau tableau en O(n) en sautant idx.
        const next = new Array<Conversation>(prev.length);
        next[0] = updated;
        for (let i = 0, j = 1; i < prev.length; i++) {
          if (i === idx) continue;
          next[j++] = prev[i];
        }
        return next;
      });
      // Refetch si la conv n'a pas ete trouvee (DM d'un nouvel interlocuteur,
      // conv creee pendant qu'on etait hors-ligne, etc.). Hors du setState
      // callback pour eviter un setState pendant render.
      if (!convFound) {
        setTimeout(() => fetchConversations(true).catch(() => {}), 0);
      }
    },
    onPresenceChanged: (data) => {
      setPresenceMap(prev => {
        const next = new Map(prev);
        next.set(data.userId, data.status);
        return next;
      });
    },
    onUnreadDecrement: (data) => {
      // Décrémente le compteur des conversations correspondantes.
      // Le serveur envoie aussi `message_ids` mais on traite via conversation_ids
      // pour simplifier — la décrémentation fine est implicite (on met à 0 si
      // tous les messages d'une conversation sont marqués lus).
      const ids = new Set(data.conversationIds.map(String));
      if (ids.size === 0) return;
      setConversations(prev =>
        prev.map(c => (ids.has(String(c.id)) ? { ...c, unread_count: 0 } : c)),
      );
      // Invalide le cache pour cohérence après reload
      CacheService.invalidate(`convos:${user?.id}`);
    },
    // Conv créée par quelqu'un d'autre (DM initiée vers nous, ajout dans un
    // groupe…) → refetch pour qu'elle apparaisse en tête immédiatement.
    onConversationAdded: () => {
      fetchConversations(true);
    },
    onConversationRemoved: ({ conversationId }) => {
      const id = String(conversationId);
      setConversations(prev => prev.filter(c => String(c.id) !== id));
      CacheService.invalidate(`convos:${user?.id}`);
    },
  });

  // Refresh quand l'ecran reprend le focus (retour depuis ConversationScreen,
  // changement d'onglet, etc.). Sans ca, l'inbox restait sur l'etat du dernier
  // fetch — meme si la WS etait deconnectee entre temps. bypassCache=true
  // pour ne pas servir du cache potentiellement stale au focus.
  useFocusEffect(
    useCallback(() => {
      // Skip le tout premier focus (le mount useEffect le fait deja).
      // On le detecte via `loading=true` initial vs apres premier fetch.
      let cancelled = false;
      const t = setTimeout(() => {
        if (!cancelled) {
          fetchConversations(true).catch(() => {});
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  // AppState : si l'app revient de background → fetch frais + sync presence.
  // Sans ca, apres un verrouillage ecran ou un switch d'app, la liste reste
  // figee meme si la WS s'est reconnectee silencieusement.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        fetchConversations(true).catch(() => {});
        fetchPresence();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Polling fallback : si la WS n'est pas connectee, on poll toutes les 15s
  // pour rattraper les messages manques. Quand WS revient, on stoppe le poll.
  useEffect(() => {
    if (wsConnected) return;
    const interval = setInterval(() => {
      fetchConversations(true).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected, user?.id]);

  // Search globale messages : debounce + appel REST
  useEffect(() => {
    if (messageSearchTimerRef.current) {
      clearTimeout(messageSearchTimerRef.current);
    }
    const q = searchQuery.trim();
    if (!searchOpen || q.length < 2) {
      setMessageSearchResults([]);
      setSearchingMessages(false);
      return;
    }
    setSearchingMessages(true);
    const myReqId = ++messageSearchReqIdRef.current;
    messageSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await messagesAPI.searchMessages(q);
        // Si une recherche plus récente a été lancée, ignorer ce résultat.
        if (myReqId !== messageSearchReqIdRef.current) return;
        const results: Message[] = res.data?.results || res.data || [];
        setMessageSearchResults(results);
      } catch {
        if (myReqId !== messageSearchReqIdRef.current) return;
        setMessageSearchResults([]);
      } finally {
        if (myReqId === messageSearchReqIdRef.current) {
          setSearchingMessages(false);
        }
      }
    }, 300);
    return () => {
      if (messageSearchTimerRef.current) clearTimeout(messageSearchTimerRef.current);
    };
  }, [searchQuery, searchOpen]);

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
    const myReqId = ++userSearchReqIdRef.current;
    userSearchTimerRef.current = setTimeout(async () => {
      try {
        const response = await usersAPI.getUsers({ search: userSearch, page_size: 20 });
        if (myReqId !== userSearchReqIdRef.current) return;
        const users = (response.data.results || response.data || [])
          .filter((u: User) => u.id !== user?.id);
        setAvailableUsers(users);
      } catch (error) {
        if (myReqId !== userSearchReqIdRef.current) return;
        if (__DEV__) console.error('Erreur recherche utilisateurs:', error);
      } finally {
        if (myReqId === userSearchReqIdRef.current) {
          setLoadingUsers(false);
        }
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
      const response = await messagesAPI.getConversations({ page: 1, page_size: PAGE_SIZE });
      const results = response.data?.results || response.data || [];
      const next = response.data?.next;
      setConversations(results);
      setPage(1);
      setHasMore(
        next != null
          ? Boolean(next)
          : Array.isArray(results) && results.length === PAGE_SIZE,
      );
      // On ne cache que la première page (pas la totalité paginée).
      // TTL = 10s : court pour minimiser la stale data, mais suffisant pour
      // absorber les double-fetch (focus + AppState + initial mount qui
      // peuvent se chevaucher en quelques ms).
      CacheService.set(cacheKey, results, 10 * 1000);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMoreConversations = async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const response = await messagesAPI.getConversations({ page: nextPage, page_size: PAGE_SIZE });
      const results = response.data?.results || response.data || [];
      const next = response.data?.next;
      setConversations(prev => {
        // Dédoublonnage par id (les conversations peuvent shifter de page si
        // un nouveau message bumpe leur ordre)
        const existingIds = new Set(prev.map(c => String(c.id)));
        const newOnes = results.filter((c: Conversation) => !existingIds.has(String(c.id)));
        return [...prev, ...newOnes];
      });
      setPage(nextPage);
      setHasMore(
        next != null
          ? Boolean(next)
          : Array.isArray(results) && results.length === PAGE_SIZE,
      );
    } catch (error) {
      if (__DEV__) console.error('Erreur pagination conversations:', error);
    } finally {
      setLoadingMore(false);
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
      t('messages.deleteConvTitle'),
      t('messages.deleteConvDetail'),
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
      if (activeTab === 'unread') {
        if ((conv.unread_count || 0) <= 0) return false;
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
    const otherUserId = otherUser?.id != null ? Number(otherUser.id) : null;
    const isOnline =
      item.conversation_type === 'direct' &&
      otherUserId != null &&
      presenceMap.get(otherUserId) === 'online';

    return (
      <StaggeredItem index={index}>
        <ConversationCard
          conversation={item}
          currentUserId={user?.id}
          isMuted={isMuted(String(item.id))}
          isOnline={isOnline}
          onPress={() => navigation.navigate('Conversation', { conversationId: String(item.id) })}
          onLongPress={() => {
            const convId = String(item.id);
            const muted = isMuted(convId);
            showAlert(
              t('messages.options'),
              `${displayName}\n\nQue veux-tu faire ?`,
              [
                {
                  text: muted ? t('messages.unmuteNotifs') : t('messages.muteNotifs'),
                  onPress: () => toggleMute(convId),
                },
                { text: t('messages.archive'), onPress: () => handleArchive(convId) },
                { text: t('messages.deleteAction'), style: 'destructive', onPress: () => handleDelete(convId) },
                { text: t('common.cancel'), style: 'cancel' },
              ],
              'info',
            );
          }}
        />
      </StaggeredItem>
    );
  }, [user?.id, navigation, showAlert, isMuted, toggleMute, presenceMap]);

  const renderEmpty = () => {
    const eyebrow = activeTab === 'archived' ? 'BOÎTE ARCHIVÉE' : 'BOÎTE VIDE';
    const title = activeTab === 'archived' ? t('messages.archivedEmpty') : t('messages.noConversationsYet');
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
            <Text style={styles.emptyCtaText}>{t('messages.newMessageCTA')}</Text>
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
    { key: 'unread', label: t('messages.filterUnread') },
    { key: 'events', label: t('messages.filterEvents') },
    { key: 'archived', label: t('messages.filterArchived') },
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
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
              {t('messages.headerEyebrow', { count: unreadCount > 0 ? t('messages.headerEyebrowUnread', { count: unreadCount }) : t('messages.headerEyebrowAllRead') })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messages.headerInbox')}</Text>
              {/* Indicateur de connexion temps reel : pastille verte (live)
                  ou orange clignotant (reconnexion en cours). Donne au user
                  la confiance que les messages arrivent en push, ou l'alerte
                  qu'ils sont en pull (polling fallback). */}
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: wsConnected ? '#10B981' : '#F59E0B',
                  opacity: wsConnected ? 1 : 0.7,
                }}
                accessibilityLabel={wsConnected ? t('messages.liveOn') : t('messages.liveReconnecting')}
              />
            </View>
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
            accessibilityLabel={t('common.search')}
          >
            <Ionicons name={searchOpen ? 'close' : 'search'} size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenNewModal}
            style={[styles.composeBtn, { backgroundColor: colors.primary }, Shadows.md]}
            activeOpacity={0.85}
            accessibilityLabel={t('messages.newMessage')}
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
                placeholder={t('messages.searchPlaceholder')}
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

      {/* Section "Messages" — résultats de recherche globale.
          Affichée uniquement quand la search bar est ouverte avec un terme. */}
      {searchOpen && searchQuery.trim().length >= 2 && (
        <View
          style={[
            styles.messageSearchSection,
            {
              backgroundColor: colors.background,
              borderBottomColor: hairline,
            },
          ]}
        >
          <View style={styles.messageSearchHeader}>
            <Text style={[styles.messageSearchEyebrow, { color: colors.accent }]}>
              MESSAGES
            </Text>
            {searchingMessages && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
          {messageSearchResults.length > 0 ? (
            messageSearchResults.slice(0, 6).map(msg => (
              <TouchableOpacity
                key={String(msg.id)}
                style={[
                  styles.messageSearchItem,
                  { borderBottomColor: hairline },
                ]}
                activeOpacity={TOUCH_OPACITY}
                onPress={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  navigation.navigate('Conversation', {
                    conversationId: String(msg.conversation),
                  });
                }}
              >
                <View style={[styles.messageSearchIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.messageSearchSender, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {msg.sender_name || t('messages.userPlaceholder')}
                  </Text>
                  <Text
                    style={[styles.messageSearchContent, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {msg.content || '[Pièce jointe]'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : !searchingMessages ? (
            <Text style={[styles.messageSearchEmpty, { color: colors.gray400 }]}>
              Aucun message ne correspond
            </Text>
          ) : null}
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => (
          <View style={[styles.itemSeparator, { backgroundColor: hairline, marginLeft: 78 }]} />
        )}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMoreConversations}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: Spacing.lg }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, i) => ({ length: CONVERSATION_ROW_HEIGHT, offset: CONVERSATION_ROW_HEIGHT * i, index: i })}
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
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t('messages.newConversationTitle')}</Text>
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
                  placeholder={t('messages.contactSearchPlaceholder')}
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
                      <Text style={[styles.noUsersEyebrow, { color: colors.gray500 }]}>{t('messages.searchEyebrow')}</Text>
                      <Text style={[styles.noUsersTitle, { color: colors.text }]}>
                        {userSearch.length < 2 ? t('messages.searchHint') : t('messages.noOneFound')}
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
    // Le design "Editorial List" gère son padding horizontal au niveau de
    // chaque row. On retire la marge externe pour que le séparateur tire
    // toute la largeur visible.
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  itemSeparator: {
    height: StyleSheet.hairlineWidth,
  },

  // Recherche globale messages
  messageSearchSection: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  messageSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  messageSearchEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  messageSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  messageSearchIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageSearchSender: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  messageSearchContent: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  messageSearchEmpty: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontStyle: 'italic',
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
