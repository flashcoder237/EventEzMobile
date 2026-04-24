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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { NotificationsScreenSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem } from '../../components/ui/Animations';

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
}

const typeConfig: Record<string, NotificationTypeConfig> = {
  event_update: { icon: 'calendar', color: '#3B82F6', label: 'Événement' },
  registration_confirmation: { icon: 'person-add', color: '#10B981', label: 'Inscription' },
  payment_confirmation: { icon: 'card', color: '#6366F1', label: 'Paiement' },
  event_reminder: { icon: 'alarm', color: '#E0A800', label: 'Rappel' },
  system_message: { icon: 'information-circle', color: '#6B7280', label: 'Système' },
  custom_message: { icon: 'chatbubble', color: '#6366F1', label: 'Message' },
  ticket_purchase: { icon: 'ticket', color: '#A855F7', label: 'Billet' },
  default: { icon: 'notifications', color: '#6B7280', label: 'Notification' },
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

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const config = getTypeConfig(item.notification_type);

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.notificationCard,
            {
              backgroundColor: colors.card,
              borderColor: !item.is_read ? `${colors.primary}40` : hairline,
            },
            Shadows.sm,
          ]}
          onPress={() => handleNotificationPress(item)}
          onLongPress={() => handleDelete(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text
                style={[
                  styles.notificationTitle,
                  { color: colors.text, fontFamily: item.is_read ? FontFamily.medium : FontFamily.semiBold },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.notificationMessage, { color: colors.gray500 }]} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.notificationFooter}>
              <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
                <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={11} color={colors.gray400} />
                <Text style={[styles.notificationTime, { color: colors.gray400 }]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>{section.title}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        <MyNotifications color={colors.primary} size={160} />
      </AnimatedIllustration>
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

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: hairline }]}>
      <TouchableOpacity
        style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={[styles.headerEyebrow, { color: colors.accent }]}>MISES À JOUR</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
      </View>
      {stats.unread > 0 && (
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={handleMarkAllAsRead}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {renderHeader()}
        <NotificationsScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {renderHeader()}

      {/* Stats Row */}
      <View
        style={[
          styles.statsCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: hairline }]} />
        <View style={styles.statItem}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.unread}</Text>
            {stats.unread > 0 && <View style={[styles.statDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Non lues</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: hairline }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.today}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Aujourd'hui</Text>
        </View>
      </View>

      {/* Filters pill bar */}
      <View
        style={[
          styles.filtersContainer,
          { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline },
        ]}
      >
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterButton,
                active && [{ backgroundColor: colors.card }, Shadows.sm],
              ]}
              onPress={() => dispatch({ type: 'SET_FILTER', payload: f.key })}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.text : colors.gray500 },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {groupedNotifications.length === 0 ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={groupedNotifications}
          renderItem={renderNotification}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.lg }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => dispatch({ type: 'CLOSE_DETAIL' })}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: hairline },
            ]}
          >
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconContainer,
                      { backgroundColor: `${getTypeConfig(selectedNotification.notification_type).color}15` },
                    ]}
                  >
                    <Ionicons
                      name={getTypeConfig(selectedNotification.notification_type).icon}
                      size={24}
                      color={getTypeConfig(selectedNotification.notification_type).color}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.iconDisc, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline }]}
                    onPress={() => dispatch({ type: 'CLOSE_DETAIL' })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View
                    style={[
                      styles.modalTypeBadge,
                      { backgroundColor: `${getTypeConfig(selectedNotification.notification_type).color}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalTypeBadgeText,
                        { color: getTypeConfig(selectedNotification.notification_type).color },
                      ]}
                    >
                      {getTypeConfig(selectedNotification.notification_type).label}
                    </Text>
                  </View>

                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedNotification.title}
                  </Text>
                  <Text style={[styles.modalMessage, { color: colors.gray500 }]}>
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
                      styles.modalSecondaryButton,
                      { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline },
                    ]}
                    onPress={() => dispatch({ type: 'CLOSE_DETAIL' })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalSecondaryButtonText, { color: colors.text }]}>
                      Fermer
                    </Text>
                  </TouchableOpacity>
                  {canNavigate(selectedNotification) && (
                    <TouchableOpacity
                      style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                      onPress={handleNavigateToRelated}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modalPrimaryButtonText}>Voir les détails</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  statDivider: { width: 1 },
  filtersContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  notificationTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  notificationMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notificationTime: { fontFamily: FontFamily.regular, fontSize: 11 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  modalTypeBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
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
  modalTime: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  modalPrimaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: '#FFFFFF',
  },
});
