import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import ExportButton from '../../components/common/ExportButton';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { registrationsAPI } from '../../api';
import { Searching, Empty, AnimatedIllustration } from '../../components/illustrations';
import { Registration, RootStackParamList, Event } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { MyTicketsScreenSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem } from '../../components/ui/Animations';
import { useOfflineTickets } from '../../hooks/useOfflineTickets';
import CacheService from '../../services/CacheService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'upcoming' | 'past' | 'cancelled';
type RegistrationType = 'billetterie' | 'inscription';
type FilterType = 'all' | 'billetterie' | 'inscription';
type StatusFilterType = 'all' | 'confirmed' | 'pending' | 'checked_in';
type SortType = 'registration_date' | 'event_date' | 'name';

// Warm editorial canvas (light mode) — dark mode falls back to surface
const CANVAS_LIGHT = '#F6F6F9';
const STUB_WIDTH = 104;
const NOTCH_RADIUS = 10;

// --- Reducer state management ---

interface TicketsState {
  registrations: Registration[];
  loading: boolean;
  refreshing: boolean;
  activeTab: TabType;
  typeFilter: FilterType;
  searchQuery: string;
  statusFilter: StatusFilterType;
  sortBy: SortType;
  showFilters: boolean;
  searchOpen: boolean;
}

type TicketsAction =
  | { type: 'SET_REGISTRATIONS'; payload: Registration[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: TabType }
  | { type: 'SET_TYPE_FILTER'; payload: FilterType }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: StatusFilterType }
  | { type: 'SET_SORT_BY'; payload: SortType }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'SET_SEARCH_OPEN'; payload: boolean }
  | { type: 'RESET_FILTERS' };

const initialState: TicketsState = {
  registrations: [],
  loading: true,
  refreshing: false,
  activeTab: 'upcoming',
  typeFilter: 'all',
  searchQuery: '',
  statusFilter: 'all',
  sortBy: 'event_date',
  showFilters: false,
  searchOpen: false,
};

function ticketsReducer(state: TicketsState, action: TicketsAction): TicketsState {
  switch (action.type) {
    case 'SET_REGISTRATIONS':
      return { ...state, registrations: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_TYPE_FILTER':
      return { ...state, typeFilter: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_SHOW_FILTERS':
      return { ...state, showFilters: action.payload };
    case 'SET_SEARCH_OPEN':
      return { ...state, searchOpen: action.payload };
    case 'RESET_FILTERS':
      return {
        ...state,
        typeFilter: 'all',
        statusFilter: 'all',
        sortBy: 'event_date',
        searchQuery: '',
        showFilters: false,
      };
    default:
      return state;
  }
}

// ============================================================
// Countdown Ring (SVG)
// ============================================================
function CountdownRing({
  days,
  color,
  trackColor,
  size = 56,
}: {
  days: number;
  color: string;
  trackColor: string;
  size?: number;
}) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, 1 - days / 14));
  const offset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        style={{
          fontFamily: FontFamily.displayExtraBold,
          fontSize: 18,
          color,
          letterSpacing: -0.5,
        }}
      >
        J-{days}
      </Text>
    </View>
  );
}

// ============================================================
// Shimmer band (animated gradient sweep)
// ============================================================
function ShimmerBand({
  label,
  bgColor,
  textColor,
  delay = 0,
}: {
  label: string;
  bgColor: string;
  textColor: string;
  delay?: number;
}) {
  const progress = useSharedValue(-1);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [delay, progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 120 }],
  }));

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 6,
        paddingVertical: 5,
        paddingHorizontal: 4,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '80%',
          },
          animStyle,
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.35)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontFamily: FontFamily.bold,
          fontSize: 9,
          color: textColor,
          textAlign: 'center',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// SECURITY note: a fake QR pattern used to live here. It was removed because
// users / staff at venues could mistake it for a scannable code. The real QR
// is rendered only inside RegistrationDetails / QRCodeScreen. The list view
// shows a neutral "tap to reveal" placeholder instead.

// ============================================================
// Component
// ============================================================
export default function MyTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { cacheMultipleTickets, cachedTicketCount } = useOfflineTickets();
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(ticketsReducer, initialState);
  const {
    registrations,
    loading,
    refreshing,
    activeTab,
    typeFilter,
    searchQuery,
    statusFilter,
    sortBy,
    showFilters,
    searchOpen,
  } = state;

  // Canvas: warm light gray in light mode, dark slate in dark mode
  const canvasBg = isDark ? colors.background : CANVAS_LIGHT;

  useEffect(() => {
    fetchRegistrations();
  }, [user?.id]);

  const fetchRegistrations = async (bypassCache = false) => {
    const cacheKey = `my-tickets:${user?.id}`;
    try {
      if (!bypassCache && user?.id) {
        const cached = await CacheService.get<Registration[]>(cacheKey);
        if (cached) {
          dispatch({ type: 'SET_REGISTRATIONS', payload: cached.data });
          dispatch({ type: 'SET_LOADING', payload: false });
          if (!cached.isStale) return;
        }
      }
      const response = await registrationsAPI.getMyRegistrations();
      const data = response.data?.results || response.data || [];
      if (user?.id) {
        CacheService.set(cacheKey, data, 2 * 60 * 1000);
      }
      dispatch({ type: 'SET_REGISTRATIONS', payload: data });
      const ticketsToCache = data
        .filter((r: any) => r.status === 'confirmed' && r.tickets?.length > 0)
        .flatMap((r: any) =>
          r.tickets
            .filter((t: any) => t.qr_code)
            .map((t: any) => ({
              id: t.id,
              registration: {
                id: r.id,
                reference_code: r.reference_code,
                event: {
                  id: r.event_details?.id || r.event,
                  title: r.event_details?.title || t('tickets.eventFallback'),
                  start_date: r.event_details?.start_date || '',
                },
              },
              ticket_type_name: t.ticket_type_name || t.type_name,
              quantity: t.quantity || 1,
              qr_code: t.qr_code,
            }))
        );
      if (ticketsToCache.length > 0) {
        cacheMultipleTickets(ticketsToCache).catch((e: any) => {
          if (__DEV__) console.error(e);
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement inscriptions:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getEventData = useCallback((reg: Registration): Partial<Event> | null => {
    if (reg.event_detail && typeof reg.event_detail === 'object') {
      return reg.event_detail;
    }
    if (reg.event && typeof reg.event === 'object') {
      return reg.event as Event;
    }
    return null;
  }, []);

  const onRefresh = async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    await fetchRegistrations(true);
    dispatch({ type: 'SET_REFRESHING', payload: false });
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
      year: date.getFullYear(),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }),
    };
  }, []);

  const getDaysUntil = useCallback((dateString?: string): number | null => {
    if (!dateString) return null;
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  const getStatusConfig = useCallback(
    (status: string) => {
      switch (status) {
        case 'confirmed':
        case 'completed':
          return { bg: colors.primary, fg: Colors.white, label: t('tickets.statusConfirmed') };
        case 'pending':
        case 'pending_approval':
          return { bg: colors.warning, fg: Colors.white, label: t('tickets.statusPendingFr') };
        case 'cancelled':
          return { bg: colors.error, fg: Colors.white, label: t('tickets.statusCancelledFr') };
        case 'rejected':
          return { bg: colors.error, fg: Colors.white, label: t('tickets.statusRefusedFr') };
        case 'checked_in':
          return { bg: colors.success, fg: Colors.white, label: t('tickets.statusValidatedFr') };
        default:
          return { bg: colors.gray400, fg: Colors.white, label: status || t('tickets.statusUnknown') };
      }
    },
    [colors],
  );

  const getRegistrationType = useCallback(
    (reg: Registration): RegistrationType => {
      if (reg.registration_type) return reg.registration_type;
      const event = getEventData(reg);
      if (event?.event_type) return event.event_type;
      if (reg.tickets && reg.tickets.length > 0) return 'billetterie';
      return 'inscription';
    },
    [getEventData],
  );

  const filterRegistrations = useCallback(
    (tab: TabType, type: FilterType, status: StatusFilterType, search: string) => {
      const now = new Date();
      return registrations.filter((reg) => {
        const event = getEventData(reg);
        const eventDate = event?.start_date ? new Date(event.start_date) : null;
        const isCancelled = reg.status === 'cancelled' || reg.status === 'rejected';
        const isPendingApproval =
          reg.approval_status === 'pending' || reg.status === 'pending_approval';

        if (type !== 'all') {
          const regType = getRegistrationType(reg);
          if (regType !== type) return false;
        }

        if (status !== 'all') {
          if (status === 'confirmed' && reg.status !== 'confirmed' && reg.status !== 'completed')
            return false;
          if (status === 'pending' && reg.status !== 'pending' && reg.status !== 'pending_approval')
            return false;
          if (status === 'checked_in' && reg.status !== 'checked_in') return false;
        }

        if (search.trim()) {
          const searchLower = search.toLowerCase();
          const eventTitle = (event?.title || '').toLowerCase();
          const refCode = (reg.reference_code || '').toLowerCase();
          const location = (event?.location_city || '').toLowerCase();
          if (
            !eventTitle.includes(searchLower) &&
            !refCode.includes(searchLower) &&
            !location.includes(searchLower)
          ) {
            return false;
          }
        }

        switch (tab) {
          case 'upcoming':
            if (isCancelled) return false;
            if (!eventDate) return true;
            return eventDate >= now || isPendingApproval;
          case 'past':
            return !isCancelled && eventDate && eventDate < now && !isPendingApproval;
          case 'cancelled':
            return isCancelled;
          default:
            return true;
        }
      });
    },
    [registrations, getEventData, getRegistrationType],
  );

  const sortRegistrations = useCallback(
    (regs: Registration[], sort: SortType) => {
      return [...regs].sort((a, b) => {
        const eventA = getEventData(a);
        const eventB = getEventData(b);
        switch (sort) {
          case 'registration_date':
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          case 'event_date': {
            const dateA = eventA?.start_date ? new Date(eventA.start_date).getTime() : Infinity;
            const dateB = eventB?.start_date ? new Date(eventB.start_date).getTime() : Infinity;
            return dateA - dateB;
          }
          case 'name':
            return (eventA?.title || '').localeCompare(eventB?.title || '');
          default:
            return 0;
        }
      });
    },
    [getEventData],
  );

  const filteredRegistrations = useMemo(() => {
    const filtered = filterRegistrations(activeTab, typeFilter, statusFilter, searchQuery);
    return sortRegistrations(filtered, sortBy);
  }, [filterRegistrations, sortRegistrations, activeTab, typeFilter, statusFilter, searchQuery, sortBy]);

  // Partition: active (upcoming, not archived) vs archived (past/cancelled)
  const { activeRegistrations, archivedRegistrations } = useMemo(() => {
    if (activeTab !== 'upcoming') {
      return { activeRegistrations: filteredRegistrations, archivedRegistrations: [] };
    }
    // When showing upcoming, no archived here
    return { activeRegistrations: filteredRegistrations, archivedRegistrations: [] };
  }, [filteredRegistrations, activeTab]);

  // typeCounts depends only on registrations + activeTab — counts are filtered
  // per-tab only, not by searchQuery/typeFilter (those would make counts circular).
  const typeCounts = useMemo(() => {
    const now = new Date();
    const tabRegistrations = registrations.filter((reg) => {
      const event = getEventData(reg);
      const eventDate = event?.start_date ? new Date(event.start_date) : null;
      const isCancelled = reg.status === 'cancelled' || reg.status === 'rejected';
      const isPendingApproval =
        reg.approval_status === 'pending' || reg.status === 'pending_approval';
      switch (activeTab) {
        case 'upcoming':
          if (isCancelled) return false;
          if (!eventDate) return true;
          return eventDate >= now || isPendingApproval;
        case 'past':
          return !isCancelled && eventDate && eventDate < now && !isPendingApproval;
        case 'cancelled':
          return isCancelled;
        default:
          return true;
      }
    });
    return {
      all: tabRegistrations.length,
      billetterie: tabRegistrations.filter((r) => getRegistrationType(r) === 'billetterie').length,
      inscription: tabRegistrations.filter((r) => getRegistrationType(r) === 'inscription').length,
    };
  }, [registrations, activeTab, getEventData, getRegistrationType]);

  const statusCounts = useMemo(() => {
    const tabRegistrations = filterRegistrations(activeTab, typeFilter, 'all', searchQuery);
    return {
      all: tabRegistrations.length,
      confirmed: tabRegistrations.filter(
        (r) => r.status === 'confirmed' || r.status === 'completed',
      ).length,
      pending: tabRegistrations.filter(
        (r) => r.status === 'pending' || r.status === 'pending_approval',
      ).length,
      checked_in: tabRegistrations.filter((r) => r.status === 'checked_in').length,
    };
  }, [filterRegistrations, activeTab, typeFilter, searchQuery]);

  const getTicketInfo = useCallback(
    (reg: Registration) => {
      const type = getRegistrationType(reg);
      if (type === 'billetterie' && reg.tickets && reg.tickets.length > 0) {
        const firstTicket = reg.tickets[0];
        const ticketType =
          typeof firstTicket.ticket_type === 'object' ? firstTicket.ticket_type : null;
        const totalQty = reg.tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
        return {
          name: ticketType?.name || firstTicket.ticket_type_name || t('tickets.ticketFallback'),
          quantity: totalQty,
          type: 'billetterie' as RegistrationType,
        };
      }
      return { name: t('tickets.registrationFallback'), quantity: 1, type: 'inscription' as RegistrationType };
    },
    [getRegistrationType],
  );

  const stats = useMemo(() => {
    const upcoming = filterRegistrations('upcoming', 'all', 'all', '').length;
    const past = filterRegistrations('past', 'all', 'all', '').length;
    const cancelled = filterRegistrations('cancelled', 'all', 'all', '').length;
    return { total: registrations.length, upcoming, past, cancelled };
  }, [registrations, filterRegistrations]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (sortBy !== 'event_date') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [typeFilter, statusFilter, sortBy, searchQuery]);

  const clearAllFilters = () => dispatch({ type: 'RESET_FILTERS' });

  // ==========================================================
  // Ticket Stub Card
  // ==========================================================
  const renderTicketStub = useCallback((item: Registration, index: number, variant: 'active' | 'archived') => {
    const event = getEventData(item);
    const dateInfo = event?.start_date ? formatDate(event.start_date) : null;
    const daysUntil = getDaysUntil(event?.start_date);
    const ticketInfo = getTicketInfo(item);
    const isInscription = ticketInfo.type === 'inscription';
    const isArchived = variant === 'archived';
    const statusConfig = getStatusConfig(item.status);
    const isPending = item.status === 'pending' || item.status === 'pending_approval';

    // Overlap behavior — first active card sits full, next ones overlap slightly
    const isFirst = index === 0;
    const isPendingStack = isPending && !isFirst;
    const overlapMargin = !isFirst && !isArchived ? -Spacing.xl - 20 : 0;

    // Dimensions for accent fills
    const accentColor = isArchived
      ? colors.gray400
      : isPending
      ? colors.warning
      : daysUntil !== null && daysUntil <= 7 && daysUntil >= 0
      ? colors.accent
      : colors.primary;

    // === TYPE THEMING (billetterie vs inscription) ===
    const typeColor = isInscription ? '#A855F7' : colors.primary; // violet vs indigo
    const typeIcon: keyof typeof Ionicons.glyphMap = isInscription ? 'document-text' : 'ticket';
    const typeLabel = isInscription ? t('tickets.labelInscription') : t('tickets.labelTicket');
    const stubLabel = isInscription ? t('tickets.stubPass') : t('tickets.stubTix');

    // Eyebrow label (category or type)
    const eyebrow = isArchived
      ? t('tickets.ticketEnded')
      : isInscription
      ? t('tickets.registrationFallback')
      : event?.category?.name || t('tickets.eventFallback');

    return (
      <StaggeredItem index={index} staggerDelay={60}>
        <View style={[styles.ticketWrap, { marginTop: overlapMargin, zIndex: 100 - index }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('RegistrationDetails', { registrationId: item.id })
            }
            style={[
              styles.ticketCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
              },
              isArchived && { opacity: 0.6 },
              isFirst && !isArchived && Shadows.lg,
              !isFirst && !isArchived && Shadows.md,
              isArchived && Shadows.sm,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${event?.title || t('tickets.eventFallback')}${
              dateInfo ? `, ${dateInfo.full}` : ''
            }`}
          >
            {/* Type rail (left edge color band) */}
            {!isArchived && (
              <View style={[styles.typeRail, { backgroundColor: typeColor }]} />
            )}

            {/* Main section */}
            <View style={styles.ticketMain}>
              <View style={styles.ticketMainHeader}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <View style={styles.typePillRow}>
                    {/* Colored TYPE pill (BILLET / INSCRIPTION) */}
                    <View
                      style={[
                        styles.typePill,
                        { backgroundColor: isArchived ? colors.gray100 : `${typeColor}15` },
                      ]}
                    >
                      <Ionicons
                        name={typeIcon}
                        size={10}
                        color={isArchived ? colors.gray500 : typeColor}
                      />
                      <Text
                        style={[
                          styles.typePillText,
                          { color: isArchived ? colors.gray500 : typeColor },
                        ]}
                        numberOfLines={1}
                      >
                        {typeLabel}
                      </Text>
                    </View>
                    {/* Category eyebrow (only for billetterie with category) */}
                    {!isInscription && event?.category?.name && !isArchived && (
                      <Text
                        style={[styles.categoryEyebrow, { color: colors.gray500 }]}
                        numberOfLines={1}
                      >
                        · {event.category.name.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.ticketTitle,
                      { color: isArchived ? colors.gray500 : colors.text },
                      isArchived && styles.ticketTitleArchived,
                    ]}
                    numberOfLines={2}
                  >
                    {event?.title || t('tickets.eventFallback')}
                  </Text>
                </View>

                {/* Countdown ring (featured, within 14 days) OR date tile */}
                {isFirst && !isArchived && daysUntil !== null && daysUntil >= 0 && daysUntil <= 14 ? (
                  <CountdownRing
                    days={daysUntil}
                    color={accentColor}
                    trackColor={colors.gray100}
                    size={58}
                  />
                ) : dateInfo ? (
                  <View
                    style={[
                      styles.dateTile,
                      {
                        backgroundColor: isArchived
                          ? colors.gray100
                          : isInscription
                          ? colors.primaryBg
                          : `${accentColor}1A`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateTileDay,
                        { color: isArchived ? colors.gray500 : accentColor },
                      ]}
                    >
                      {dateInfo.day}
                    </Text>
                    <Text
                      style={[
                        styles.dateTileMonth,
                        { color: isArchived ? colors.gray500 : accentColor },
                      ]}
                    >
                      {dateInfo.month}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Footer meta */}
              <View style={styles.ticketMainFooter}>
                {dateInfo && !isPendingStack && (
                  <View style={[styles.dateChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={isArchived ? colors.gray400 : colors.primary}
                    />
                    <Text
                      style={[
                        styles.dateChipText,
                        { color: isArchived ? colors.gray400 : colors.gray600 },
                      ]}
                    >
                      {dateInfo.day} {dateInfo.month} • {dateInfo.time}
                    </Text>
                  </View>
                )}
                {isPendingStack && (
                  <View style={styles.pendingRow}>
                    <View style={[styles.pendingIcon, { backgroundColor: colors.warningLight }]}>
                      <Ionicons name="alert-circle" size={14} color={colors.warning} />
                    </View>
                    <Text style={[styles.pendingText, { color: colors.gray600 }]}>
                      Attente paiement
                    </Text>
                    <TouchableOpacity
                      style={[styles.payInlineBtn, { backgroundColor: colors.warning }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('Payment', { registrationId: item.id });
                      }}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('eventDetails.finalizePayment')}
                    >
                      <Ionicons name="card-outline" size={11} color="#fff" />
                      <Text style={styles.payInlineBtnText}>{t('tickets.payInline')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {event?.location_city && !isPendingStack && (
                  <View style={styles.locRow}>
                    <Ionicons name="location" size={12} color={colors.gray400} />
                    <Text style={[styles.locText, { color: colors.gray500 }]} numberOfLines={1}>
                      {event.location_city}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Dashed vertical perforation */}
            <View
              style={[
                styles.perforation,
                { borderLeftColor: isDark ? colors.gray300 : colors.gray200 },
              ]}
            />

            {/* Stub section (right) — tinted by type */}
            <View
              style={[
                styles.ticketStub,
                !isArchived && !isPending && {
                  backgroundColor: isDark ? `${typeColor}10` : `${typeColor}08`,
                },
              ]}
            >
              {/* Stub label at top (TIX / PASS) */}
              {!isArchived && !isPending && (
                <Text style={[styles.stubLabel, { color: typeColor }]}>{stubLabel}</Text>
              )}

              {/* QR / status icon */}
              {isArchived ? (
                <View
                  style={[
                    styles.qrLocked,
                    { backgroundColor: colors.gray100, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={26} color={colors.gray400} />
                </View>
              ) : isPending ? (
                <View
                  style={[
                    styles.qrLocked,
                    { backgroundColor: colors.gray50, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="lock-closed" size={20} color={colors.gray400} />
                </View>
              ) : isInscription ? (
                /* Inscription: document badge (no QR) */
                <View
                  style={[
                    styles.passBox,
                    { backgroundColor: Colors.white, borderColor: typeColor },
                  ]}
                >
                  <Ionicons name="document-text" size={20} color={typeColor} />
                  <View style={[styles.passLines, { backgroundColor: `${typeColor}30` }]} />
                  <View style={[styles.passLines, { backgroundColor: `${typeColor}30`, width: 18 }]} />
                </View>
              ) : (
                /* Billetterie: neutral QR placeholder — real QR lives in RegistrationDetails */
                <View
                  style={[
                    styles.qrBox,
                    {
                      backgroundColor: Colors.white,
                      borderColor: typeColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                  accessibilityLabel={t('tickets.tapToShowQR')}
                >
                  <Ionicons name="qr-code-outline" size={32} color={typeColor} />
                  <Text
                    style={{
                      fontFamily: FontFamily.bold,
                      fontSize: 6,
                      letterSpacing: 0.6,
                      color: typeColor,
                      marginTop: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    Voir QR
                  </Text>
                </View>
              )}

              {/* Qty badge */}
              {!isArchived && !isPending && !isInscription && (
                <View
                  style={[
                    styles.qtyBadge,
                    {
                      backgroundColor: isDark ? colors.gray100 : Colors.white,
                      borderColor: `${typeColor}40`,
                    },
                  ]}
                >
                  <Ionicons name="ticket" size={10} color={typeColor} />
                  <Text style={[styles.qtyText, { color: colors.text }]}>×{ticketInfo.quantity}</Text>
                </View>
              )}
              {!isArchived && !isPending && isInscription && (
                <View
                  style={[
                    styles.qtyBadge,
                    {
                      backgroundColor: isDark ? colors.gray100 : Colors.white,
                      borderColor: `${typeColor}40`,
                    },
                  ]}
                >
                  <Ionicons name="person" size={10} color={typeColor} />
                  <Text style={[styles.qtyText, { color: colors.text }]}>{t('tickets.qtySolo')}</Text>
                </View>
              )}

              {/* Status pill at bottom */}
              {!isArchived && (
                <ShimmerBand
                  label={statusConfig.label}
                  bgColor={statusConfig.bg}
                  textColor={Colors.white}
                  delay={index * 220}
                />
              )}
              {isArchived && (
                <View style={[styles.archivedPill, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.archivedPillText, { color: colors.gray500 }]}>{t('tickets.archivedLabel')}</Text>
                </View>
              )}
            </View>

            {/* Top & bottom notches */}
            <View
              style={[
                styles.notchTop,
                { backgroundColor: canvasBg },
              ]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.notchBottom,
                { backgroundColor: canvasBg },
              ]}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </View>
      </StaggeredItem>
    );
  }, [
    colors,
    isDark,
    navigation,
    canvasBg,
    getEventData,
    getTicketInfo,
    getStatusConfig,
    formatDate,
    getDaysUntil,
  ]);

  // ==========================================================
  // Sectioned list (group by month when > 10 tickets)
  // ==========================================================
  const SECTION_THRESHOLD = 10;
  const MONTHS_FR_LONG = [
    t('tickets.monthJanuary'), t('tickets.monthFebruary'), t('tickets.monthMarch'), t('tickets.monthApril'), t('tickets.monthMay'), t('tickets.monthJune'),
    t('tickets.monthJuly'), t('tickets.monthAugust'), t('tickets.monthSeptember'), t('tickets.monthOctober'), t('tickets.monthNovember'), t('tickets.monthDecember'),
  ];
  type ListItem =
    | { kind: 'header'; key: string; label: string }
    | { kind: 'ticket'; key: string; registration: Registration; ticketIndex: number };

  const sectionedItems = useMemo<ListItem[]>(() => {
    if (filteredRegistrations.length <= SECTION_THRESHOLD) {
      return filteredRegistrations.map((r, i) => ({
        kind: 'ticket' as const,
        key: r.id,
        registration: r,
        ticketIndex: i,
      }));
    }
    const out: ListItem[] = [];
    let lastKey: string | null = null;
    let ticketIdx = 0;
    filteredRegistrations.forEach((r) => {
      const ev = getEventData(r);
      const dateStr = ev?.start_date;
      let key = t('tickets.noDateKey');
      let label = t('tickets.noDateLabel');
      if (dateStr) {
        try {
          const d = new Date(dateStr);
          key = `${d.getFullYear()}-${d.getMonth()}`;
          label = `${MONTHS_FR_LONG[d.getMonth()]} ${d.getFullYear()}`;
        } catch {
          // ignore parse failure
        }
      }
      if (key !== lastKey) {
        out.push({ kind: 'header', key: `h-${key}`, label });
        lastKey = key;
      }
      out.push({ kind: 'ticket', key: r.id, registration: r, ticketIndex: ticketIdx });
      ticketIdx += 1;
    });
    return out;
  }, [filteredRegistrations, getEventData]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.monthSectionHeader}>
          <View style={[styles.monthSectionLine, { backgroundColor: colors.gray200 }]} />
          <Text style={[styles.monthSectionLabel, { color: colors.gray500 }]}>{item.label}</Text>
          <View style={[styles.monthSectionLine, { backgroundColor: colors.gray200 }]} />
        </View>
      );
    }
    return renderTicketStub(
      item.registration,
      item.ticketIndex,
      activeTab === 'past' || activeTab === 'cancelled' ? 'archived' : 'active',
    );
  }, [activeTab, colors.gray200, colors.gray500, renderTicketStub]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        {activeTab === 'cancelled' ? (
          <Empty color={colors.primary} size={160} />
        ) : (
          <Searching color={colors.primary} size={160} />
        )}
      </AnimatedIllustration>
      <Text style={[styles.emptyTitle, { color: colors.gray700 }]}>
        {activeTab === 'upcoming' && t('tickets.emptyUpcoming')}
        {activeTab === 'past' && t('tickets.emptyPast')}
        {activeTab === 'cancelled' && t('tickets.emptyCancelled')}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {activeTab === 'upcoming'
          ? t('tickets.emptyHint')
          : 'Les billets correspondants apparaîtront ici.'}
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyButtonText}>{t('tickets.emptyExplore')}</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Tabs config (chips) — memoized to avoid recreating on every render
  const tabs = useMemo<{ key: TabType; label: string; count: number }[]>(
    () => [
      { key: 'upcoming', label: t('tickets.tabUpcoming'), count: stats.upcoming },
      { key: 'past', label: t('tickets.tabPast'), count: stats.past },
      { key: 'cancelled', label: t('tickets.tabCancelled'), count: stats.cancelled },
    ],
    [stats],
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>TIX</WatermarkNumeral>
        <MyTicketsScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>TIX</WatermarkNumeral>
      <View style={styles.safeArea}>
        {/* Editorial header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.8)',
              borderBottomColor: isDark ? colors.border : 'rgba(255,255,255,0.5)',
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('tickets.myTicketsEyebrow')}</Text>
              <View style={styles.headerTitleRow}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tickets.myTicketsHeading')}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => dispatch({ type: 'SET_SEARCH_OPEN', payload: !searchOpen })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('common.search')}
              >
                <Ionicons
                  name={searchOpen ? 'close' : 'search'}
                  size={18}
                  color={colors.gray600}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => dispatch({ type: 'SET_SHOW_FILTERS', payload: !showFilters })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  activeFilterCount > 0
                    ? `Filtres (${activeFilterCount} actifs)`
                    : t('tickets.myTicketsFilters')
                }
              >
                <Ionicons name="options" size={18} color={colors.gray600} />
                {activeFilterCount > 0 && (
                  <View style={[styles.filterCountBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <ExportButton endpoint="/registrations/export/" filename="mes-billets" compact />
            </View>
          </View>

          {/* Tab chips row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabChipsRow}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabChip,
                    isActive
                      ? { backgroundColor: colors.primary, ...Shadows.buttonPrimary }
                      : { backgroundColor: colors.gray100 },
                  ]}
                  onPress={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.key })}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      { color: isActive ? Colors.white : colors.gray500 },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.count > 0 && (
                    <View
                      style={[
                        styles.tabChipCount,
                        {
                          backgroundColor: isActive
                            ? 'rgba(255,255,255,0.22)'
                            : isDark
                            ? colors.gray200
                            : colors.gray200,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabChipCountText,
                          { color: isActive ? Colors.white : colors.gray600 },
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Type filter chips — inline with tabs */}
            <View style={[styles.tabSeparator, { backgroundColor: colors.border }]} />
            {(['billetterie', 'inscription'] as FilterType[]).map((typeKey) => {
              const isActive = typeFilter === typeKey;
              const count = typeCounts[typeKey as keyof typeof typeCounts] || 0;
              if (count === 0 && !isActive) return null;
              return (
                <TouchableOpacity
                  key={typeKey}
                  style={[
                    styles.tabChip,
                    isActive
                      ? { backgroundColor: colors.primaryBg, borderColor: colors.primary, borderWidth: 1 }
                      : { backgroundColor: colors.gray100 },
                  ]}
                  onPress={() =>
                    dispatch({
                      type: 'SET_TYPE_FILTER',
                      payload: typeFilter === typeKey ? 'all' : typeKey,
                    })
                  }
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={typeKey === 'billetterie' ? 'ticket-outline' : 'document-text-outline'}
                    size={13}
                    color={isActive ? colors.primary : colors.gray500}
                  />
                  <Text
                    style={[
                      styles.tabChipText,
                      { color: isActive ? colors.primary : colors.gray500 },
                    ]}
                  >
                    {typeKey === 'billetterie' ? t('tickets.filterTicketType') : t('tickets.filterRegistrationType')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Collapsible search */}
          {searchOpen && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              style={[
                styles.searchInputWrapper,
                { backgroundColor: colors.gray100, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('tickets.searchTitleRefVenue')}
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={(text: string) =>
                  dispatch({ type: 'SET_SEARCH_QUERY', payload: text })
                }
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>

        {/* Advanced filters panel */}
        {showFilters && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[
              styles.advancedPanel,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.advancedSection}>
              <Text style={[styles.advancedLabel, { color: colors.gray500 }]}>{t('tickets.advancedStatusLabel')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.advancedChipsRow}
              >
                {(
                  [
                    { key: 'all' as StatusFilterType, label: t('tickets.filterAllStatus'), color: colors.gray600 },
                    {
                      key: 'confirmed' as StatusFilterType,
                      label: t('tickets.filterConfirmed'),
                      color: colors.success,
                    },
                    {
                      key: 'pending' as StatusFilterType,
                      label: t('tickets.filterPending'),
                      color: colors.warning,
                    },
                    {
                      key: 'checked_in' as StatusFilterType,
                      label: t('tickets.filterValidated'),
                      color: colors.success,
                    },
                  ]
                ).map(({ key, label, color }) => {
                  const isActive = statusFilter === key;
                  const count = statusCounts[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.advancedChip,
                        { borderColor: isActive ? color : colors.border },
                        isActive && { backgroundColor: color + '14' },
                      ]}
                      onPress={() => dispatch({ type: 'SET_STATUS_FILTER', payload: key })}
                    >
                      <Text
                        style={[
                          styles.advancedChipText,
                          { color: isActive ? color : colors.gray600 },
                        ]}
                      >
                        {label} {count > 0 && `· ${count}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.advancedSection}>
              <Text style={[styles.advancedLabel, { color: colors.gray500 }]}>{t('tickets.filterSortLabel')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.advancedChipsRow}
              >
                {(
                  [
                    { key: 'event_date' as SortType, label: t('tickets.sortByEventDate') },
                    { key: 'registration_date' as SortType, label: t('tickets.sortByRegistrationDate') },
                    { key: 'name' as SortType, label: 'Nom A-Z' },
                  ]
                ).map(({ key, label }) => {
                  const isActive = sortBy === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.advancedChip,
                        { borderColor: isActive ? colors.primary : colors.border },
                        isActive && { backgroundColor: colors.primaryBg },
                      ]}
                      onPress={() => dispatch({ type: 'SET_SORT_BY', payload: key })}
                    >
                      <Text
                        style={[
                          styles.advancedChipText,
                          { color: isActive ? colors.primary : colors.gray600 },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {activeFilterCount > 0 && (
              <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllFilters}>
                <Ionicons name="close-circle-outline" size={14} color={colors.error} />
                <Text style={[styles.clearAllText, { color: colors.error }]}>
                  Effacer les filtres
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Offline indicator */}
        {cachedTicketCount > 0 && (
          <View style={[styles.offlineIndicator, { backgroundColor: colors.successLight }]}>
            <Ionicons name="cloud-done-outline" size={14} color={colors.success} />
            <Text style={[styles.offlineIndicatorText, { color: colors.successDark }]}>
              {cachedTicketCount} billet{cachedTicketCount > 1 ? 's' : ''} hors-ligne
            </Text>
          </View>
        )}

        {/* Tickets list */}
        <FlatList
          data={sectionedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={false}
          initialNumToRender={8}
        />
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1 },

  // Editorial header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBtnDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterCountBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Month section header (only shown for > 10 tickets)
  monthSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  monthSectionLine: {
    flex: 1,
    height: 1,
  },
  monthSectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  filterCountBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0,
  },

  // Tab chips row
  tabChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: Spacing.sm,
    alignItems: 'center',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  tabChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  tabChipCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabChipCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  tabSeparator: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
    alignSelf: 'center',
  },

  // Search input
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: 8,
    marginTop: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },

  // Advanced panel
  advancedPanel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  advancedSection: { gap: Spacing.sm },
  advancedLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  advancedChipsRow: { flexDirection: 'row', gap: Spacing.sm },
  advancedChip: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  advancedChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    letterSpacing: -0.1,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Spacing.xs,
  },
  clearAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },

  // Offline indicator
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  offlineIndicatorText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 140,
  },

  // --- Ticket stub card ---
  ticketWrap: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  ticketCard: {
    flexDirection: 'row',
    minHeight: 180,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketMain: {
    flex: 1,
    padding: Spacing.base,
    paddingRight: Spacing.xl,
    justifyContent: 'space-between',
  },
  ticketMainHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  eyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Type rail (left edge color band)
  typeRail: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 1,
  },
  typePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  categoryEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    flex: 1,
  },
  ticketTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 25,
  },
  ticketTitleArchived: {
    textDecorationLine: 'line-through',
  },
  dateTile: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    minWidth: 54,
  },
  dateTileDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.8,
  },
  dateTileMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  ticketMainFooter: {
    marginTop: Spacing.md,
    gap: 6,
  },
  dateChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  locText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    flex: 1,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
    flex: 1,
  },
  payInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  payInlineBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Perforation
  perforation: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    right: STUB_WIDTH,
    borderLeftWidth: 1.5,
    borderLeftColor: Colors.gray200,
    borderStyle: 'dashed',
  },

  // Stub (right section)
  ticketStub: {
    width: STUB_WIDTH,
    paddingVertical: Spacing.md,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stubLabel: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 13,
    letterSpacing: 2,
  },
  qrBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  qrLocked: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 6,
  },
  passLines: {
    height: 1.5,
    width: 24,
    borderRadius: 1,
  },
  qtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: '100%',
  },
  qtyText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 11,
    letterSpacing: -0.3,
  },
  archivedPill: {
    alignSelf: 'stretch',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  archivedPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Notches (half-circles that punch into the card at the perforation)
  notchTop: {
    position: 'absolute',
    top: -NOTCH_RADIUS,
    right: STUB_WIDTH - NOTCH_RADIUS,
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
  },
  notchBottom: {
    position: 'absolute',
    bottom: -NOTCH_RADIUS,
    right: STUB_WIDTH - NOTCH_RADIUS,
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.white,
    letterSpacing: -0.1,
  },
});
