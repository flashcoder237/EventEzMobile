import React, { useReducer, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { notificationsAPI } from '../../api';
import CacheService from '../../services/CacheService';
import { Notification, RootStackParamList } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { MyNotifications, AnimatedIllustration } from '../../components/illustrations';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { NotificationsScreenSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem, SectionEntrance } from '../../components/ui/Animations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'all' | 'unread' | 'read';

interface NotificationsState {
  notifications: Notification[];
  loading: boolean;
  refreshing: boolean;
  filter: FilterType;
  selectedNotification: Notification | null;
  showDetailModal: boolean;
}

type NotificationsAction =
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_FILTER'; payload: FilterType }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'OPEN_DETAIL'; payload: Notification }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'FETCH_COMPLETE'; payload: { notifications: Notification[] } };

const initialState: NotificationsState = {
  notifications: [],
  loading: true,
  refreshing: false,
  filter: 'all',
  selectedNotification: null,
  showDetailModal: false,
};

function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, is_read: true } : n
        ),
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'OPEN_DETAIL':
      return { ...state, selectedNotification: action.payload, showDetailModal: true };
    case 'CLOSE_DETAIL':
      return { ...state, showDetailModal: false };
    case 'FETCH_COMPLETE':
      return { ...state, notifications: action.payload.notifications, loading: false, refreshing: false };
    default:
      return state;
  }
}

interface NotificationTypeConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  eyebrow: string;
}

const typeConfig: Record<string, NotificationTypeConfig> = {
  event_update: { icon: 'calendar', color: '#3B82F6', label: 'Événement', eyebrow: 'EVT' },
  registration_confirmation: { icon: 'person-add', color: '#10B981', label: 'Inscription', eyebrow: 'REG' },
  payment_confirmation: { icon: 'card', color: '#6366F1', label: 'Paiement', eyebrow: 'PAY' },
  event_reminder: { icon: 'alarm', color: '#E0A800', label: 'Rappel', eyebrow: 'RAPPEL' },
  system_message: { icon: 'information-circle', color: '#6B7280', label: 'Système', eyebrow: 'SYS' },
  custom_message: { icon: 'chatbubble', color: '#6366F1', label: 'Message', eyebrow: 'MSG' },
  ticket_purchase: { icon: 'ticket', color: '#A855F7', label: 'Billet', eyebrow: 'TIX' },
  default: { icon: 'notifications', color: '#6B7280', label: 'Notification', eyebrow: 'INFO' },
};

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'unread', label: 'Non lues' },
  { key: 'read', label: 'Lues' },
];

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showConfirm } = useAlert();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { markAllNotificationsAsRead, markNotificationAsRead: markOneReadGlobal } = useNotifications();
  const insets = useSafeAreaInsets();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [state, dispatch] = useReducer(notificationsReducer, initialState);
  const { notifications, loading, refreshing, filter, selectedNotification, showDetailModal } = state;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (bypassCache = false) => {
    const cacheKey = `notifs:${user?.id}`;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<Notification[]>(cacheKey);
        if (cached) {
          dispatch({ type: 'SET_NOTIFICATIONS', payload: cached.data });
          dispatch({ type: 'SET_LOADING', payload: false });
          if (!cached.isStale) return;
        }
      }
      const response = await notificationsAPI.getNotifications({ page_size: 100 });
      const data = response.data.results || response.data || [];
      dispatch({ type: 'FETCH_COMPLETE', payload: { notifications: data } });
      CacheService.set(cacheKey, data, 60 * 1000);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement notifications:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  };

  const onRefresh = async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    await fetchNotifications(true);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      today: notifications.filter(n => new Date(n.created_at) >= today).length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread': return notifications.filter(n => !n.is_read);
      case 'read': return notifications.filter(n => n.is_read);
      default: return notifications;
    }
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const groups: { title: string; data: Notification[] }[] = [];
    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const olderItems: Notification[] = [];

    filteredNotifications.forEach(notif => {
      const date = new Date(notif.created_at);
      if (date >= today) todayItems.push(notif);
      else if (date >= yesterday) yesterdayItems.push(notif);
      else olderItems.push(notif);
    });

    if (todayItems.length > 0) groups.push({ title: "AUJOURD'HUI", data: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'HIER', data: yesterdayItems });
    if (olderItems.length > 0) groups.push({ title: 'PLUS ANCIEN', data: olderItems });

    return groups;
  }, [filteredNotifications]);

  const getTypeConfig = (type: string): NotificationTypeConfig =>
    typeConfig[type] || typeConfig.default;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markOneReadGlobal(id);
      dispatch({ type: 'MARK_AS_READ', payload: id });
    } catch (error) {
      if (__DEV__) console.error('Erreur marquage lu:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      dispatch({ type: 'MARK_ALL_AS_READ' });
      CacheService.invalidate(`notifs:${user?.id}`);
    } catch (error) {
      if (__DEV__) console.error('Erreur marquage tous lus:', error);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm('Supprimer', 'Supprimer cette notification ?', async () => {
      try {
        await notificationsAPI.deleteNotification(id);
        dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
      } catch (error) {
        if (__DEV__) console.error('Erreur suppression:', error);
      }
    });
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    dispatch({ type: 'OPEN_DETAIL', payload: notification });
  };

  const handleNavigateToRelated = () => {
    if (!selectedNotification) return;
    dispatch({ type: 'CLOSE_DETAIL' });

    const { notification_type, related_object_type, related_object_id, event, data } = selectedNotification;

    if (event && typeof event === 'object' && event.id) {
      navigation.navigate('EventDetails', { eventId: event.id });
      return;
    }

    if (related_object_type && related_object_id) {
      switch (related_object_type) {
        case 'event':
          navigation.navigate('EventDetails', { eventId: related_object_id });
          break;
        case 'registration':
          navigation.navigate('RegistrationDetails', { registrationId: related_object_id });
          break;
        case 'ticket':
        case 'ticket_purchase':
          navigation.navigate('QRCode', { ticketId: related_object_id });
          break;
        case 'payment':
          navigation.navigate('Main', { screen: 'MyTickets' } as any);
          break;
        case 'conversation':
        case 'message':
          navigation.navigate('Conversation', { conversationId: related_object_id });
          break;
      }
      return;
    }

    if (data) {
      if (data.event_id) {
        navigation.navigate('EventDetails', { eventId: data.event_id });
        return;
      }
      if (data.registration_id) {
        navigation.navigate('RegistrationDetails', { registrationId: data.registration_id });
        return;
      }
    }

    switch (notification_type) {
      case 'registration_confirmation':
      case 'payment_confirmation':
        navigation.navigate('Main', { screen: 'MyTickets' } as any);
        break;
      case 'system_message':
      case 'custom_message':
        navigation.navigate('Messages');
        break;
    }
  };

  const canNavigate = (notification: Notification): boolean => {
    if (notification.event && typeof notification.event === 'object') return true;
    if (notification.related_object_type && notification.related_object_id) return true;
    if (notification.data?.event_id || notification.data?.registration_id) return true;
    if (['registration', 'registration_confirmation', 'payment', 'payment_confirmation', 'message'].includes(notification.notification_type)) return true;
    return false;
  };

  // === EDITORIAL NOTIFICATION CARD ===
  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const config = getTypeConfig(item.notification_type);
    const unread = !item.is_read;

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.notifCard,
            {
              backgroundColor: colors.card,
              borderColor: unread ? `${config.color}55` : hairline,
            },
            unread ? Shadows.sm : Shadows.xs,
          ]}
          onPress={() => handleNotificationPress(item)}
          onLongPress={() => handleDelete(item.id)}
          activeOpacity={0.85}
        >
          {/* Left rail color stripe for unread */}
          {unread && (
            <View style={[styles.unreadRail, { backgroundColor: config.color }]} />
          )}

          <View style={[styles.notifIconWrap, { backgroundColor: `${config.color}15` }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>

          <View style={styles.notifBody}>
            {/* Eyebrow + time */}
            <View style={styles.notifTopRow}>
              <View style={[styles.eyebrowPill, { backgroundColor: `${config.color}15` }]}>
                <Text style={[styles.eyebrowText, { color: config.color }]}>
                  {config.eyebrow}
                </Text>
              </View>
              <Text style={[styles.notifTime, { color: colors.gray400 }]}>
                {formatTime(item.created_at)}
              </Text>
            </View>

            {/* Display title */}
            <Text
              style={[
                styles.notifTitle,
                { color: colors.text },
                unread ? null : { opacity: 0.75 },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Body message */}
            <Text style={[styles.notifMessage, { color: colors.gray500 }]} numberOfLines={2}>
              {item.message}
            </Text>
          </View>

          {/* Unread dot at right */}
          {unread && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{section.title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: hairline }]} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        <MyNotifications color={colors.primary} size={160} />
      </AnimatedIllustration>
      <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>SILENCE RADIO</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filter === 'unread' ? 'Tout est à jour' : 'Aucune notification'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {filter === 'unread'
          ? 'Toutes vos notifications ont été lues.'
          : "Vous n'avez pas encore de notifications.\nElles apparaîtront ici."}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>BUZZ</WatermarkNumeral>
        <NotificationsScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>BUZZ</WatermarkNumeral>
      <View style={styles.safeArea}>
        {/* === EDITORIAL HEADER (tile) === */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
              borderBottomColor: hairline,
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="chevron-back" size={18} color={colors.gray600} />
            </TouchableOpacity>

            <View style={styles.headerTextCol}>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
                MISES À JOUR • EVENTEZ
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Notifications
              </Text>
            </View>

            {stats.unread > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                style={[styles.markAllBtn, Shadows.buttonPrimary]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tout marquer comme lu"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="checkmark-done" size={16} color={Colors.white} />
                <Text style={styles.markAllText}>Tout lu</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* === STAT STRIP === */}
          <View
            style={[
              styles.statStrip,
              { backgroundColor: colors.card, borderColor: hairline },
            ]}
          >
            <View style={[styles.statCell, { borderRightColor: hairline }]}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.total}</Text>
              <Text style={[styles.statEyebrow, { color: colors.gray500 }]}>TOTAL</Text>
            </View>
            <View style={[styles.statCell, { borderRightColor: hairline }]}>
              <View style={styles.statValueRow}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.unread}</Text>
                {stats.unread > 0 && (
                  <View style={[styles.statDot, { backgroundColor: colors.accent }]} />
                )}
              </View>
              <Text style={[styles.statEyebrow, { color: colors.gray500 }]}>NON LUES</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.today}</Text>
              <Text style={[styles.statEyebrow, { color: colors.gray500 }]}>AUJOURD'HUI</Text>
            </View>
          </View>

          {/* === FILTER CHIPS === */}
          <View style={styles.chipsRow}>
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: colors.primary, ...Shadows.buttonPrimary }
                      : { backgroundColor: colors.gray100 },
                  ]}
                  onPress={() => dispatch({ type: 'SET_FILTER', payload: f.key })}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? Colors.white : colors.gray600 },
                    ]}
                  >
                    {f.label}
                  </Text>
                  {f.key === 'unread' && stats.unread > 0 && (
                    <View
                      style={[
                        styles.chipBadge,
                        {
                          backgroundColor: active
                            ? 'rgba(255,255,255,0.22)'
                            : colors.gray200,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBadgeText,
                          { color: active ? Colors.white : colors.gray600 },
                        ]}
                      >
                        {stats.unread}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* === LIST === */}
        {groupedNotifications.length === 0 ? (
          renderEmpty()
        ) : (
          <SectionList
            sections={groupedNotifications}
            renderItem={renderNotification}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 140 },
            ]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}

        {/* === DETAIL MODAL === */}
        <Modal
          visible={showDetailModal}
          transparent
          animationType="fade"
          onRequestClose={() => dispatch({ type: 'CLOSE_DETAIL' })}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card, borderColor: hairline },
                Shadows.dramatic,
              ]}
            >
              {selectedNotification && (
                <>
                  {/* Modal header */}
                  <View style={styles.modalHeader}>
                    <View
                      style={[
                        styles.modalIconWrap,
                        {
                          backgroundColor: `${getTypeConfig(
                            selectedNotification.notification_type,
                          ).color}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getTypeConfig(selectedNotification.notification_type).icon}
                        size={26}
                        color={getTypeConfig(selectedNotification.notification_type).color}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
                      onPress={() => dispatch({ type: 'CLOSE_DETAIL' })}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Fermer"
                    >
                      <Ionicons name="close" size={18} color={colors.gray600} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <View
                      style={[
                        styles.eyebrowPill,
                        {
                          backgroundColor: `${getTypeConfig(
                            selectedNotification.notification_type,
                          ).color}15`,
                          alignSelf: 'flex-start',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eyebrowText,
                          {
                            color: getTypeConfig(selectedNotification.notification_type).color,
                          },
                        ]}
                      >
                        {getTypeConfig(selectedNotification.notification_type).label.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedNotification.title}
                    </Text>
                    <Text style={[styles.modalMessage, { color: colors.gray600 }]}>
                      {selectedNotification.message}
                    </Text>

                    <View style={[styles.modalTimeRow, { borderTopColor: hairline }]}>
                      <Ionicons name="time-outline" size={14} color={colors.gray400} />
                      <Text style={[styles.modalTime, { color: colors.gray500 }]}>
                        {new Date(selectedNotification.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </ScrollView>

                  <View style={[styles.modalFooter, { borderTopColor: hairline }]}>
                    <TouchableOpacity
                      style={[
                        styles.modalSecondaryBtn,
                        { backgroundColor: colors.gray100 },
                      ]}
                      onPress={() => dispatch({ type: 'CLOSE_DETAIL' })}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.modalSecondaryBtnText, { color: colors.text }]}>
                        Fermer
                      </Text>
                    </TouchableOpacity>
                    {canNavigate(selectedNotification) && (
                      <TouchableOpacity
                        style={[styles.modalPrimaryBtn, Shadows.buttonPrimary]}
                        onPress={handleNavigateToRelated}
                        activeOpacity={0.9}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.modalPrimaryBtnText}>Voir détails</Text>
                        <View style={styles.modalArrowDisc}>
                          <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // === HEADER (tile) ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: Spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTextCol: {
    flex: 1,
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
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  markAllText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.2,
  },

  // === STAT STRIP ===
  statStrip: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
    alignItems: 'flex-start',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.9,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // === CHIPS ===
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },

  // === LIST ===
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },

  // === NOTIF CARD ===
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  unreadRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    gap: 6,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eyebrowPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  notifTime: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  notifTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 19,
  },
  notifMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },

  // === EMPTY ===
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.7,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // === MODAL ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: 28,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.8,
    lineHeight: 28,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  modalTime: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  modalPrimaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  modalPrimaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  modalArrowDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
