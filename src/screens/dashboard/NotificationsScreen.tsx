import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
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
import { MyNotifications } from '../../components/illustrations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
  Shadows,
} from '../../constants/theme';
import { NotificationsScreenSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem } from '../../components/ui/Animations';

type FilterType = 'all' | 'unread' | 'read' | 'event' | 'payment' | 'ticket';

// --- Reducer ---

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
  | { type: 'SET_SELECTED_NOTIFICATION'; payload: Notification | null }
  | { type: 'SET_SHOW_DETAIL_MODAL'; payload: boolean }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'OPEN_DETAIL'; payload: Notification }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'FETCH_COMPLETE'; payload: { notifications: Notification[] } }
  | { type: 'REFRESH_COMPLETE'; payload: { notifications: Notification[] } };

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
    case 'SET_SELECTED_NOTIFICATION':
      return { ...state, selectedNotification: action.payload };
    case 'SET_SHOW_DETAIL_MODAL':
      return { ...state, showDetailModal: action.payload };
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
    case 'REFRESH_COMPLETE':
      return { ...state, notifications: action.payload.notifications, refreshing: false };
    default:
      return state;
  }
}

interface NotificationTypeConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  label: string;
}

const typeConfig: Record<string, NotificationTypeConfig> = {
  event_update: {
    icon: 'calendar',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    label: 'Événement',
  },
  registration_confirmation: {
    icon: 'person-add',
    color: '#10B981',
    bgColor: '#D1FAE5',
    label: 'Inscription',
  },
  payment_confirmation: {
    icon: 'card',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    label: 'Paiement',
  },
  event_reminder: {
    icon: 'alarm',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    label: 'Rappel',
  },
  system_message: {
    icon: 'information-circle',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    label: 'Système',
  },
  custom_message: {
    icon: 'chatbubble',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    label: 'Message',
  },
  ticket_purchase: {
    icon: 'ticket',
    color: '#A855F7',
    bgColor: '#FCE7F3',
    label: 'Billet',
  },
  default: {
    icon: 'notifications',
    color: Colors.gray500,
    bgColor: Colors.gray100,
    label: 'Notification',
  },
};

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'unread', label: 'Non lues' },
  { key: 'read', label: 'Lues' },
];

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { markAllNotificationsAsRead, markNotificationAsRead: markOneReadGlobal } = useNotifications();
  const insets = useSafeAreaInsets();
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
          if (!cached.isStale) return; // Données fraîches : pas d'appel réseau
          // Données périmées : refresh silencieux en arrière-plan
        }
      }
      const response = await notificationsAPI.getNotifications({ page_size: 100 });
      const data = response.data.results || response.data || [];
      dispatch({ type: 'FETCH_COMPLETE', payload: { notifications: data } });
      CacheService.set(cacheKey, data, 60 * 1000); // fraîcheur : 1 minute
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

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      today: notifications.filter(n => new Date(n.created_at) >= today).length,
    };
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'read':
        return notifications.filter(n => n.is_read);
      default:
        return notifications;
    }
  }, [notifications, filter]);

  // Group by date
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
      if (date >= today) {
        todayItems.push(notif);
      } else if (date >= yesterday) {
        yesterdayItems.push(notif);
      } else {
        olderItems.push(notif);
      }
    });

    if (todayItems.length > 0) groups.push({ title: "Aujourd'hui", data: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'Hier', data: yesterdayItems });
    if (olderItems.length > 0) groups.push({ title: 'Plus ancien', data: olderItems });

    return groups;
  }, [filteredNotifications]);

  const getTypeConfig = (type: string): NotificationTypeConfig => {
    return typeConfig[type] || typeConfig.default;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
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
      // Invalidate cache so next fetch gets fresh data
      CacheService.invalidate(`notifs:${user?.id}`);
    } catch (error) {
      if (__DEV__) console.error('Erreur marquage tous lus:', error);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      'Supprimer',
      'Supprimer cette notification ?',
      async () => {
        try {
          await notificationsAPI.deleteNotification(id);
          dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
        } catch (error) {
          if (__DEV__) console.error('Erreur suppression:', error);
        }
      }
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    // Show detail modal
    dispatch({ type: 'OPEN_DETAIL', payload: notification });
  };

  const handleNavigateToRelated = () => {
    if (!selectedNotification) return;

    dispatch({ type: 'CLOSE_DETAIL' });

    // Navigate based on notification type or related object
    const { notification_type, related_object_type, related_object_id, event, data } = selectedNotification;

    // Check for event-related notifications
    if (event && typeof event === 'object' && event.id) {
      navigation.navigate('EventDetails', { eventId: event.id });
      return;
    }

    // Check for related object
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
          // No specific payment detail screen, go to tickets
          navigation.navigate('Main', { screen: 'MyTickets' } as any);
          break;
        case 'conversation':
        case 'message':
          navigation.navigate('Conversation', { conversationId: related_object_id });
          break;
        default:
          break;
      }
      return;
    }

    // Check data for event_id or other IDs
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

    // Fallback based on notification type
    switch (notification_type) {
      case 'event_update':
      case 'event_revalidation':
      case 'event_reminder':
        // No specific event to navigate to
        break;
      case 'registration_confirmation':
        navigation.navigate('Main', { screen: 'MyTickets' } as any);
        break;
      case 'payment_confirmation':
        navigation.navigate('Main', { screen: 'MyTickets' } as any);
        break;
      case 'system_message':
      case 'custom_message':
        navigation.navigate('Messages');
        break;
      default:
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
          { backgroundColor: colors.card, borderColor: colors.gray100 },
          !item.is_read && [styles.unreadCard, { borderLeftColor: colors.primary, backgroundColor: colors.card }],
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint="Appui long pour supprimer"
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, { color: colors.gray700 }, !item.is_read && [styles.unreadText, { color: colors.gray900 }]]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
              <Text style={[styles.typeBadgeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.notificationMessage, { color: colors.gray500 }]} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.notificationFooter}>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={colors.gray400} />
              <Text style={[styles.notificationTime, { color: colors.gray400 }]}>{formatTime(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
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
      <MyNotifications color={colors.primary} size={160} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {filter === 'unread'
          ? 'Toutes vos notifications ont été lues.'
          : 'Vous n\'avez pas encore de notifications.\nElles apparaîtront ici.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.rootContainer, { backgroundColor: colors.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <NotificationsScreenSkeleton />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
          {/* Header with Stats */}
          <View style={[styles.headerContainer, { backgroundColor: colors.primary }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <Ionicons name="notifications" size={28} color={Colors.white} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Restez informé de toute l'activité</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{stats.unread}</Text>
              {stats.unread > 0 && <View style={styles.statDot} />}
            </View>
            <Text style={styles.statLabel}>Non lues</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.today}</Text>
            <Text style={styles.statLabel}>Aujourd'hui</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.card }]}>
        <View style={styles.filtersRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterButton, filter === f.key && [styles.filterButtonActive, { backgroundColor: colors.primary }]]}
              onPress={() => dispatch({ type: 'SET_FILTER', payload: f.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f.key }}
              accessibilityLabel={f.label}
            >
              <Text style={[styles.filterText, { color: colors.gray600 }, filter === f.key && { color: Colors.white }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {stats.unread > 0 && (
          <TouchableOpacity
            style={[styles.markAllButton, { borderTopColor: colors.gray100 }]}
            onPress={handleMarkAllAsRead}
            accessibilityRole="button"
            accessibilityLabel="Tout marquer comme lu"
          >
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={[styles.markAllText, { color: colors.primary }]}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

          {/* Notification Detail Modal */}
          <Modal
            visible={showDetailModal}
            transparent
            animationType="fade"
            onRequestClose={() => dispatch({ type: 'CLOSE_DETAIL' })}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                {selectedNotification && (
                  <>
                    <View style={styles.modalHeader}>
                      <View style={[
                        styles.modalIconContainer,
                        { backgroundColor: getTypeConfig(selectedNotification.notification_type).bgColor }
                      ]}>
                        <Ionicons
                          name={getTypeConfig(selectedNotification.notification_type).icon}
                          size={28}
                          color={getTypeConfig(selectedNotification.notification_type).color}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.modalCloseButton, { backgroundColor: colors.gray100 }]}
                        onPress={() => dispatch({ type: 'CLOSE_DETAIL' })}
                        accessibilityRole="button"
                        accessibilityLabel="Fermer"
                      >
                        <Ionicons name="close" size={24} color={colors.gray500} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                      <View style={[
                        styles.modalTypeBadge,
                        { backgroundColor: getTypeConfig(selectedNotification.notification_type).bgColor }
                      ]}>
                        <Text style={[
                          styles.modalTypeBadgeText,
                          { color: getTypeConfig(selectedNotification.notification_type).color }
                        ]}>
                          {getTypeConfig(selectedNotification.notification_type).label}
                        </Text>
                      </View>

                      <Text style={[styles.modalTitle, { color: colors.gray900 }]}>{selectedNotification.title}</Text>
                      <Text style={[styles.modalMessage, { color: colors.gray600 }]}>{selectedNotification.message}</Text>

                      <View style={[styles.modalTimeRow, { borderTopColor: colors.gray100 }]}>
                        <Ionicons name="time-outline" size={16} color={colors.gray400} />
                        <Text style={[styles.modalTime, { color: colors.gray500 }]}>
                          {new Date(selectedNotification.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    </ScrollView>

                    <View style={[styles.modalFooter, { borderTopColor: colors.gray100 }]}>
                      <TouchableOpacity
                        style={[styles.modalSecondaryButton, { backgroundColor: colors.gray100 }]}
                        onPress={() => dispatch({ type: 'CLOSE_DETAIL' })}
                        accessibilityRole="button"
                        accessibilityLabel="Fermer"
                      >
                        <Text style={[styles.modalSecondaryButtonText, { color: colors.gray700 }]}>Fermer</Text>
                      </TouchableOpacity>
                      {canNavigate(selectedNotification) && (
                        <TouchableOpacity
                          style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                          onPress={handleNavigateToRelated}
                          accessibilityRole="button"
                          accessibilityLabel="Voir les details"
                        >
                          <Text style={styles.modalPrimaryButtonText}>Voir les détails</Text>
                          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...TextStyles.h2,
    color: Colors.white,
  },
  headerSubtitle: {
    ...TextStyles.small,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    ...TextStyles.h2,
    color: Colors.white,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
  },
  statLabel: {
    ...TextStyles.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.sm,
  },

  // Filters
  filtersContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    ...Shadows.md,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    ...TextStyles.label,
    color: Colors.gray600,
  },
  filterTextActive: {
    color: Colors.white,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  markAllText: {
    ...TextStyles.label,
    color: Colors.primary,
  },

  // Section
  sectionHeader: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    ...TextStyles.dateAccent,
    color: Colors.gray500,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    backgroundColor: Colors.white,
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
  },
  notificationTitle: {
    ...TextStyles.body,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadText: {
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
  },
  notificationMessage: {
    ...TextStyles.small,
    color: Colors.gray500,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    ...TextStyles.caption,
    color: Colors.gray400,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
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
    textAlign: 'center',
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
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
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
  },
  modalTitle: {
    ...TextStyles.h3,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    ...TextStyles.body,
    color: Colors.gray600,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  modalTime: {
    ...TextStyles.small,
    color: Colors.gray500,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    ...TextStyles.button,
    color: Colors.gray700,
  },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  modalPrimaryButtonText: {
    ...TextStyles.button,
  },
});
