import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { eventsAPI, usersAPI, getMediaUrl } from '../../api';
import CacheService from '../../services/CacheService';
import { SaveToBookmarks, Authentication, AnimatedIllustration } from '../../components/illustrations';
import { RootStackParamList, Event } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { FollowingEventCardSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem, ContentTransition } from '../../components/ui/Animations';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';


// Warm editorial canvas (light) / dark background
const CANVAS_LIGHT = '#FDFBF7';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabFilter = 'all' | 'upcoming' | 'weekend' | 'past';
type SectionKind = 'events' | 'organizers';

// Le backend (`UserFollowSerializer`) expose les infos enrichies de
// l'utilisateur suivi sous `following_details` (dict), tandis que `following`
// est juste l'ID FK. On lit donc `following_details` côté mobile.
interface OrganizerFollow {
  id: number;
  follower: number;
  following: number;
  following_details: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    email: string;
    profile_picture?: string | null;
    is_verified?: boolean;
    role?: string;
    organizer_profile?: {
      description?: string;
      logo?: string | null;
      event_count?: number;
      rating?: number;
    };
  };
  notification_preference: string;
  created_at: string;
}

interface FollowData {
  id: string;
  event: string;
  event_details: Event;
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_reminders: boolean;
  created_at: string;
}

// ============================================================
// Helpers
// ============================================================
const MONTH_LABEL = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function daysBetween(dateString?: string): number | null {
  if (!dateString) return null;
  const now = new Date();
  const d = new Date(dateString);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDayMonth(dateString?: string) {
  if (!dateString) return { day: '--', month: '---' };
  const d = new Date(dateString);
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: MONTH_LABEL[d.getMonth()],
  };
}

function formatWeekday(dateString?: string) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('fr-FR', { weekday: 'long' });
}

function formatTime(dateString?: string) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function proximityPill(days: number | null, t: (k: string, opts?: any) => string): string {
  if (days === null) return '';
  if (days <= 0) return t('followingEvents.today');
  if (days === 1) return t('followingEvents.tomorrow');
  if (days < 7) return t('followingEvents.jMinus', { count: days });
  if (days < 30) return t('followingEvents.inWeeks', { count: Math.ceil(days / 7) });
  if (days < 60) return t('followingEvents.inOneMonth');
  return t('followingEvents.inMonths', { count: Math.ceil(days / 30) });
}

// ============================================================
// Pulsing heart (reanimated)
// ============================================================
function PulsingHeart({ color = Colors.accent, size = 24 }: { color?: string; size?: number }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (reducedMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      ),
      -1,
      false,
    );
  }, [scale, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="heart" size={size} color={color} />
    </Animated.View>
  );
}

// ============================================================
// Module-level memoized card components
// ============================================================
type ThemeColorsType = typeof Colors;

interface HeroCardProps {
  follow: FollowData;
  event: Event;
  days: number | null;
  colors: ThemeColorsType;
  onPress: (event: Event) => void;
  onToggleNotification: (follow: FollowData) => void;
  t: (k: string, opts?: any) => string;
}

function HeroCardComponent({
  follow,
  event,
  days,
  colors,
  onPress,
  onToggleNotification,
  t,
}: HeroCardProps) {
  const dm = formatDayMonth(event.start_date);
  const weekday = formatWeekday(event.start_date);
  const time = formatTime(event.start_date);
  const isNotified = follow.notification_preference !== 'none';
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.heroCard, { backgroundColor: colors.card }, Shadows.lg]}
      onPress={() => onPress(event)}
    >
      {/* Workaround LQIP : placeholder rendu comme `source` de fond
          (placeholderContentFit non honoré sur petits data URIs en natif). */}
      {(event.banner_placeholder || event.category?.default_event_image_placeholder) && (
        <Image
          source={{ uri: event.banner_placeholder || event.category?.default_event_image_placeholder || '' }}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <Image
        source={
          getMediaUrl(event.banner_image || event.category?.default_event_image) ||
          require('../../../assets/defaults/default-event.png')
        }
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={300}
      />
      {/* Dark gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Giant outline date numeral (top-left, blend-diff approximation) */}
      <Text style={styles.heroDayNumeral} numberOfLines={1}>
        {dm.day}
      </Text>

      {/* Countdown pill top-right */}
      {days !== null && (
        <View style={[styles.heroCountdownPill, { backgroundColor: colors.accent }]}>
          <Ionicons name="hourglass" size={13} color={Colors.white} />
          <Text style={styles.heroCountdownText}>
            {days <= 0 ? t('followingEvents.todayAcronym') : t('followingEvents.jMinus', { count: days })}
          </Text>
        </View>
      )}

      {/* Content bottom */}
      <View style={styles.heroContent}>
        <View style={{ flex: 1 }}>
          {weekday && time && (
            <Text style={styles.heroSubtitle}>
              {weekday.toUpperCase()} • {time}
            </Text>
          )}
          <Text style={styles.heroTitle} numberOfLines={2}>
            {event.title}
          </Text>
          {event.location_city && (
            <View style={styles.heroMetaRow}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={styles.heroMetaText} numberOfLines={1}>
                {event.location_city}
              </Text>
            </View>
          )}
        </View>

        {/* Pulsing heart button */}
        <TouchableOpacity
          style={styles.heroHeartBtn}
          onPress={() => onToggleNotification(follow)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isNotified ? t('followingEvents.notificationsOn') : t('followingEvents.notificationsOff')}
        >
          <PulsingHeart color={Colors.accent} size={22} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const HeroCard = memo(
  HeroCardComponent,
  (prev, next) =>
    prev.event.id === next.event.id &&
    prev.days === next.days &&
    prev.follow.id === next.follow.id &&
    prev.follow.notification_preference === next.follow.notification_preference &&
    prev.colors === next.colors &&
    prev.onPress === next.onPress &&
    prev.onToggleNotification === next.onToggleNotification &&
    prev.t === next.t,
);

interface MasonryCardProps {
  follow: FollowData;
  event: Event;
  days: number | null;
  variant: 'tall' | 'medium' | 'short';
  colors: ThemeColorsType;
  onPress: (event: Event) => void;
  onToggleNotification: (follow: FollowData) => void;
  onUnfollow: (eventId: string) => void;
}

function MasonryCardComponent({
  follow,
  event,
  variant,
  colors,
  onPress,
  onToggleNotification,
  onUnfollow,
}: MasonryCardProps) {
  const dm = formatDayMonth(event.start_date);
  const isNotified = follow.notification_preference !== 'none';
  const imageHeight = variant === 'tall' ? 130 : variant === 'medium' ? 100 : 0;
  const hasImage = variant !== 'short';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.masonryCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => onPress(event)}
    >
      {hasImage && (
        <View style={[styles.masonryImageWrap, { height: imageHeight }]}>
          {/* Workaround LQIP : placeholder en source de fond. */}
          {(event.banner_placeholder || event.category?.default_event_image_placeholder) && (
            <Image
              source={{ uri: event.banner_placeholder || event.category?.default_event_image_placeholder || '' }}
              contentFit="cover"
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <Image
            source={
              getMediaUrl(event.banner_image || event.category?.default_event_image) ||
              require('../../../assets/defaults/default-event.png')
            }
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
          />
          <TouchableOpacity
            style={[
              styles.masonryBell,
              {
                backgroundColor: isNotified
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.7)',
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleNotification(follow);
            }}
          >
            <Ionicons
              name={isNotified ? 'notifications' : 'notifications-off-outline'}
              size={14}
              color={isNotified ? colors.accent : colors.gray400}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.masonryBody}>
        {!hasImage && (
          <View style={styles.masonryShortHeader}>
            <View style={styles.masonryDateRow}>
              <Text style={[styles.masonryBigDay, { color: colors.accent }]}>{dm.day}</Text>
              <Text style={[styles.masonryBigMonth, { color: colors.gray300 }]}>{dm.month}</Text>
            </View>
            <TouchableOpacity
              style={[styles.masonryShortBell, { backgroundColor: colors.gray50 }]}
              onPress={() => onToggleNotification(follow)}
            >
              <Ionicons
                name={isNotified ? 'notifications' : 'notifications-off-outline'}
                size={14}
                color={isNotified ? colors.accent : colors.gray400}
              />
            </TouchableOpacity>
          </View>
        )}

        {hasImage && (
          <View style={styles.masonryDateRow}>
            <Text
              style={[
                styles.masonryBigDay,
                { color: colors.accent, fontSize: variant === 'tall' ? 50 : 42 },
              ]}
            >
              {dm.day}
            </Text>
            <Text style={[styles.masonryBigMonth, { color: colors.gray300 }]}>{dm.month}</Text>
          </View>
        )}

        <Text
          style={[styles.masonryTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <Text style={[styles.masonrySubtitle, { color: colors.gray500 }]} numberOfLines={1}>
          {event.location_city || formatWeekday(event.start_date)}
        </Text>

        <View style={styles.masonryFooter}>
          {event.category?.name ? (
            <View style={[styles.masonryCatPill, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.masonryCatText, { color: colors.gray500 }]}>
                {event.category.name.slice(0, 12)}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <TouchableOpacity
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onUnfollow(event.id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="heart" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const MasonryCard = memo(
  MasonryCardComponent,
  (prev, next) =>
    prev.event.id === next.event.id &&
    prev.days === next.days &&
    prev.follow.id === next.follow.id &&
    prev.follow.notification_preference === next.follow.notification_preference &&
    prev.variant === next.variant &&
    prev.colors === next.colors &&
    prev.onPress === next.onPress &&
    prev.onToggleNotification === next.onToggleNotification &&
    prev.onUnfollow === next.onUnfollow,
);

interface CarouselCardProps {
  follow: FollowData;
  event: Event;
  days: number | null;
  accent: boolean;
  colors: ThemeColorsType;
  canvasBg: string;
  onPress: (event: Event) => void;
  t: (k: string, opts?: any) => string;
}

function CarouselCardComponent({
  event,
  days,
  accent,
  colors,
  canvasBg,
  onPress,
  t,
}: CarouselCardProps) {
  const dm = formatDayMonth(event.start_date);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.carouselCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => onPress(event)}
    >
      {/* Left: date stub with dashed right border */}
      <View style={[styles.carouselStub, { backgroundColor: canvasBg }]}>
        <Text style={[styles.carouselStubMonth, { color: colors.gray400 }]}>{dm.month}</Text>
        <Text style={[styles.carouselStubDay, { color: colors.text }]}>{dm.day}</Text>
      </View>
      <View
        style={[
          styles.carouselPerforation,
          { borderLeftColor: colors.gray200 },
        ]}
      />

      {/* Right: content */}
      <View style={styles.carouselBody}>
        <View
          style={[
            styles.carouselProxPill,
            {
              backgroundColor: accent ? `${Colors.accent}1A` : colors.gray100,
            },
          ]}
        >
          <Text
            style={[
              styles.carouselProxText,
              { color: accent ? Colors.accent : colors.gray500 },
            ]}
          >
            {proximityPill(days, t)}
          </Text>
        </View>
        <Text style={[styles.carouselTitle, { color: colors.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location_city && (
          <Text style={[styles.carouselSub, { color: colors.gray500 }]} numberOfLines={1}>
            {event.location_city}
          </Text>
        )}
      </View>

      {/* Ribbon top-right */}
      <View
        style={[
          styles.ribbon,
          { backgroundColor: accent ? colors.accent : colors.gray300 },
        ]}
      />
    </TouchableOpacity>
  );
}

const CarouselCard = memo(
  CarouselCardComponent,
  (prev, next) =>
    prev.event.id === next.event.id &&
    prev.days === next.days &&
    prev.follow.id === next.follow.id &&
    prev.accent === next.accent &&
    prev.colors === next.colors &&
    prev.canvasBg === next.canvasBg &&
    prev.onPress === next.onPress &&
    prev.t === next.t,
);

interface ArchivedCardProps {
  follow: FollowData;
  event: Event;
  colors: ThemeColorsType;
  onPress: (event: Event) => void;
  onUnfollow: (eventId: string) => void;
}

function ArchivedCardComponent({
  event,
  colors,
  onPress,
  onUnfollow,
}: ArchivedCardProps) {
  const dm = formatDayMonth(event.start_date);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.archivedCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.75 },
      ]}
      onPress={() => onPress(event)}
    >
      <View style={[styles.archivedDate, { backgroundColor: colors.gray100 }]}>
        <Text style={[styles.archivedDay, { color: colors.gray500 }]}>{dm.day}</Text>
        <Text style={[styles.archivedMonth, { color: colors.gray400 }]}>{dm.month}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.archivedTitle, { color: colors.gray500 }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location_city && (
          <Text style={[styles.archivedSub, { color: colors.gray400 }]} numberOfLines={1}>
            {event.location_city}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={{ padding: 4 }}
        onPress={(e: any) => {
          e?.stopPropagation?.();
          onUnfollow(event.id);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color={colors.gray400} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const ArchivedCard = memo(
  ArchivedCardComponent,
  (prev, next) =>
    prev.event.id === next.event.id &&
    prev.follow.id === next.follow.id &&
    prev.colors === next.colors &&
    prev.onPress === next.onPress &&
    prev.onUnfollow === next.onUnfollow,
);

// ============================================================
// Component
// ============================================================
export default function FollowingEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [follows, setFollows] = useState<FollowData[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');
  // Section toggle : on commute entre les events suivis et les organisateurs suivis
  const [activeSection, setActiveSection] = useState<SectionKind>('events');

  const canvasBg = isDark ? colors.background : CANVAS_LIGHT;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadFollowedEvents();
        loadFollowedOrganizers();
      }
    }, [user]),
  );

  const loadFollowedOrganizers = async (bypassCache = false) => {
    const cacheKey = `following:organizers:${user?.id}`;
    setLoadingOrganizers(true);
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<OrganizerFollow[]>(cacheKey);
        if (cached) {
          setOrganizers(cached.data);
          if (!cached.isStale) {
            setLoadingOrganizers(false);
            return;
          }
        }
      }
      const response = await usersAPI.getFollowingUsers();
      const data = response.data?.results || response.data || [];
      setOrganizers(data);
      CacheService.set(cacheKey, data, 2 * 60 * 1000);
    } catch (error) {
      if (__DEV__) console.error('Error loading followed organizers:', error);
    } finally {
      setLoadingOrganizers(false);
    }
  };

  const handleUnfollowOrganizer = useCallback((organizerId: number, organizerName: string) => {
    showConfirm(
      t('followingEvents.unfollowConfirmTitle'),
      t('followingEvents.unfollowOrganizerConfirm', { name: organizerName }),
      async () => {
        try {
          await usersAPI.unfollowUser(organizerId);
          setOrganizers((prev) => prev.filter((o) => o.following !== organizerId));
          // Invalide le cache pour rester cohérent au prochain mount
          CacheService.invalidate(`following:organizers:${user?.id}`);
        } catch {
          showError(t('common.error'), t('followingEvents.unfollowOrganizerError'));
        }
      },
    );
  }, [user?.id, showConfirm, showError, t]);

  const loadFollowedEvents = async (bypassCache = false) => {
    const cacheKey = `following:${user?.id}`;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<FollowData[]>(cacheKey);
        if (cached) {
          setFollows(cached.data);
          setLoading(false);
          if (!cached.isStale) return;
        }
      }
      const response = await eventsAPI.getFollowingEvents();
      const data = response.data?.results || response.data || [];
      setFollows(data);
      CacheService.set(cacheKey, data, 2 * 60 * 1000);
    } catch (error) {
      if (__DEV__) console.error('Error loading followed events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowedEvents(true);
  };

  const handleUnfollow = useCallback((eventId: string) => {
    showConfirm(t('followingEvents.unfollowConfirmTitle'), t('followingEvents.unfollowEventConfirm'), async () => {
      try {
        await eventsAPI.unfollowEvent(eventId);
        setFollows((prev) =>
          prev.filter((f) => f.event !== eventId && f.event_details?.id !== eventId),
        );
        CacheService.invalidate(`following:${user?.id}`);
      } catch (error) {
        if (__DEV__) console.error('Error unfollowing:', error);
        showError(t('common.error'), t('followingEvents.unfollowError'));
      }
    });
  }, [user?.id, showConfirm, showError, t]);

  const toggleNotification = useCallback(async (follow: FollowData) => {
    const eventId = follow.event_details?.id || follow.event;
    const newPreference = follow.notification_preference === 'none' ? 'all' : 'none';

    try {
      await eventsAPI.updateFollowPreferences(eventId, { notification_preference: newPreference });
      setFollows((prev) =>
        prev.map((f) =>
          f.event === eventId || f.event_details?.id === eventId
            ? { ...f, notification_preference: newPreference }
            : f,
        ),
      );
    } catch (error) {
      if (__DEV__) console.error('Error updating preferences:', error);
      showError(t('common.error'), t('followingEvents.updatePrefsError'));
    }
  }, [showError, t]);

  // Stable navigation callback for cards (event.banner_image / category fields
  // don't change between renders for a given event, so memoization is safe).
  const handleEventPress = useCallback((event: Event) => {
    navigation.navigate('EventDetails', {
      eventId: event.slug || event.id,
      imageUrl: event.banner_image || event.category?.default_event_image || undefined,
    });
  }, [navigation]);

  // --- Partitions + tab filtering (fused: single pass over follows) ---
  const visibleSections = useMemo(() => {
    const now = Date.now();
    const lower = searchQuery.trim().toLowerCase();

    const thisWeek: { follow: FollowData; event: Event; days: number | null }[] = [];
    const thisMonth: typeof thisWeek = [];
    const later: typeof thisWeek = [];
    const past: typeof thisWeek = [];

    for (const f of follows) {
      const event = f.event_details;
      if (!event) continue;

      // Inline search matching
      if (lower) {
        const titleMatch = event.title?.toLowerCase().includes(lower);
        const cityMatch = event.location_city?.toLowerCase().includes(lower);
        if (!titleMatch && !cityMatch) continue;
      }

      const days = event.start_date
        ? Math.ceil((new Date(event.start_date).getTime() - now) / (1000 * 60 * 60 * 24))
        : null;
      const item = { follow: f, event, days };

      if (days === null) {
        later.push(item);
      } else if (days < 0) {
        past.push(item);
      } else if (days <= 7) {
        thisWeek.push(item);
      } else if (days <= 30) {
        thisMonth.push(item);
      } else {
        later.push(item);
      }
    }

    // Sort ascending by days (soonest first) for upcoming partitions
    [thisWeek, thisMonth, later].forEach((arr) =>
      arr.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999)),
    );
    past.sort((a, b) => (b.days ?? 0) - (a.days ?? 0));

    // Apply tab filtering directly here (no second useMemo pass)
    switch (activeTab) {
      case 'upcoming':
        return { thisWeek, thisMonth, later, past: [] as typeof past };
      case 'weekend':
        return {
          thisWeek: thisWeek.filter((x) => (x.days ?? 99) <= 3),
          thisMonth: [] as typeof thisMonth,
          later: [] as typeof later,
          past: [] as typeof past,
        };
      case 'past':
        return {
          thisWeek: [] as typeof thisWeek,
          thisMonth: [] as typeof thisMonth,
          later: [] as typeof later,
          past,
        };
      case 'all':
      default:
        return { thisWeek, thisMonth, later, past };
    }
  }, [follows, searchQuery, activeTab]);

  // --- Category counts ---
  const categoryGroups = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const f of follows) {
      const cat = f.event_details?.category;
      const key = cat?.name || t('followingEvents.categoryOther');
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name: key, count: 1 });
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [follows, t]);

  const totalVisible =
    visibleSections.thisWeek.length +
    visibleSections.thisMonth.length +
    visibleSections.later.length +
    visibleSections.past.length;

  // ==========================================================
  // Sub-components (inline — access closure)
  // ==========================================================
  const SectionHeader = ({ label, muted = false }: { label: string; muted?: boolean }) => (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          styles.sectionHeaderText,
          { color: muted ? colors.gray400 : colors.primary },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.sectionHeaderLine,
          { backgroundColor: isDark ? colors.gray200 : colors.gray200 },
        ]}
      />
    </View>
  );

  // --- Category chips (Suivis d'intérêt) ---
  const CategoryChips = () => (
    <View style={styles.categoryChipsWrap}>
      {categoryGroups.map((g) => (
        <View
          key={g.name}
          style={[
            styles.categoryChip,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.categoryChipText, { color: colors.text }]}>{g.name}</Text>
          <View style={[styles.categoryChipCount, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryChipCountText}>{g.count}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // ==========================================================
  // Masonry column layout (irregular 2-col)
  // ==========================================================
  // MasonryCard is now a module-level memoized component — props are stable
  // (colors, callbacks via useCallback) so individual cards skip re-render
  // when the parent re-renders for unrelated reasons.
  const renderMasonry = useCallback(
    (items: { follow: FollowData; event: Event; days: number | null }[]) => {
      if (items.length === 0) return null;
      const leftCol: typeof items = [];
      const rightCol: typeof items = [];
      items.forEach((item, idx) => (idx % 2 === 0 ? leftCol.push(item) : rightCol.push(item)));

      const getVariant = (colIdx: number, itemIdx: number): 'tall' | 'medium' | 'short' => {
        // Irregular: left col: tall, short. right col: medium, tall.
        if (colIdx === 0) return itemIdx % 2 === 0 ? 'tall' : 'short';
        return itemIdx % 2 === 0 ? 'medium' : 'tall';
      };

      return (
        <View style={styles.masonryRow}>
          <View style={styles.masonryCol}>
            {leftCol.map((x, idx) => (
              <MasonryCard
                key={x.follow.id}
                follow={x.follow}
                event={x.event}
                days={x.days}
                variant={getVariant(0, idx)}
                colors={colors}
                onPress={handleEventPress}
                onToggleNotification={toggleNotification}
                onUnfollow={handleUnfollow}
              />
            ))}
          </View>
          <View style={styles.masonryCol}>
            {rightCol.map((x, idx) => (
              <MasonryCard
                key={x.follow.id}
                follow={x.follow}
                event={x.event}
                days={x.days}
                variant={getVariant(1, idx)}
                colors={colors}
                onPress={handleEventPress}
                onToggleNotification={toggleNotification}
                onUnfollow={handleUnfollow}
              />
            ))}
          </View>
        </View>
      );
    },
    [colors, handleEventPress, toggleNotification, handleUnfollow],
  );

  // ==========================================================
  // Empty / Auth states
  // ==========================================================
  const renderAuthRequired = () => (
    <View style={styles.authContainer}>
      <AnimatedIllustration entry="scaleIn" idle="float">
        <Authentication color={colors.primary} size={160} />
      </AnimatedIllustration>
      <Text style={[styles.authTitle, { color: colors.text }]}>{t('followingEvents.authTitle')}</Text>
      <Text style={[styles.authSubtitle, { color: colors.gray500 }]}>
        {t('followingEvents.authSubtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.loginButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Login' as never)}
      >
        <Text style={styles.loginButtonText}>{t('followingEvents.authCTA')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        <SaveToBookmarks color={colors.primary} size={160} />
      </AnimatedIllustration>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {follows.length === 0 ? t('followingEvents.emptyTitleNone') : t('followingEvents.emptyTitleNoResult')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        {follows.length === 0
          ? t('followingEvents.emptyMessageNone')
          : t('followingEvents.emptyMessageNoResult')}
      </Text>
      {follows.length === 0 && (
        <TouchableOpacity
          style={[styles.discoverButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
        >
          <Ionicons name="compass-outline" size={18} color={Colors.white} />
          <Text style={styles.discoverButtonText}>{t('followingEvents.discoverCTA')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ==========================================================
  // Section "Organisateurs suivis"
  // ==========================================================
  const renderOrganizersSection = () => {
    if (loadingOrganizers && organizers.length === 0) {
      return (
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.md }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.organizerRow, { backgroundColor: colors.gray100, opacity: 0.5 }]} />
          ))}
        </View>
      );
    }

    if (organizers.length === 0) {
      return (
        <ScrollView contentContainerStyle={styles.emptyOrganizers}>
          <AnimatedIllustration entry="fadeIn" idle="sway">
            <SaveToBookmarks color={colors.primary} size={160} />
          </AnimatedIllustration>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('followingEvents.organizersEmptyTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
            {t('followingEvents.organizersEmptyMessage')}
          </Text>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.md,
          // Floating dock (~80px) + safe area bottom + breathing room.
          // Garantit que le dernier organisateur n'est pas masqué par le dock
          // ni la nav bar Android.
          paddingBottom: insets.bottom + 90,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loadingOrganizers}
            onRefresh={() => loadFollowedOrganizers(true)}
            tintColor={colors.primary}
          />
        }
      >
        {organizers.map((follow) => {
          // following_details est le dict enrichi servi par UserFollowSerializer.
          // following (sans _details) n'est que l'ID FK — incompatible avec un render.
          const target = follow.following_details || ({} as OrganizerFollow['following_details']);
          const fullName = target.company_name
            || target.name
            || `${target.first_name || ''} ${target.last_name || ''}`.trim()
            || target.email
            || t('followingEvents.organizerFallback');
          const avatar = target.profile_picture || target.organizer_profile?.logo || null;
          const isVerified = !!target.is_verified;
          const eventCount = target.organizer_profile?.event_count || 0;

          return (
            <TouchableOpacity
              key={String(target.id)}
              style={[styles.organizerRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('OrganizerProfile', { organizerId: String(target.id) })}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('followingEvents.viewProfileA11y', { name: fullName })}
            >
              {avatar ? (
                <Image
                  source={getMediaUrl(avatar)}
                  style={styles.organizerRowAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : (
                <View style={[styles.organizerRowAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFF', fontFamily: FontFamily.bold, fontSize: 18 }}>
                    {fullName[0]?.toUpperCase() || 'O'}
                  </Text>
                </View>
              )}
              <View style={styles.organizerRowBody}>
                <View style={styles.organizerRowNameRow}>
                  <Text style={[styles.organizerRowName, { color: colors.text }]} numberOfLines={1}>
                    {fullName}
                  </Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  )}
                </View>
                <Text style={[styles.organizerRowMeta, { color: colors.gray500 }]} numberOfLines={1}>
                  {eventCount > 1 ? t('followingEvents.eventsCountPlural', { count: eventCount }) : t('followingEvents.eventsCountSingular', { count: eventCount })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleUnfollowOrganizer(target.id, fullName);
                }}
                style={[styles.organizerRowUnfollow, { borderColor: colors.border, backgroundColor: colors.gray50 }]}
                accessibilityRole="button"
                accessibilityLabel={t('followingEvents.unfollowOrganizerA11y', { name: fullName })}
              >
                <Ionicons name="person-remove-outline" size={16} color={colors.gray600} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // ==========================================================
  // Render
  // ==========================================================
  if (!user) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>SAVE</WatermarkNumeral>
        {renderAuthRequired()}
      </EditorialCanvas>
    );
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: t('followingEvents.tabAll') },
    { key: 'upcoming', label: t('followingEvents.tabUpcoming') },
    { key: 'weekend', label: t('followingEvents.tabWeekend') },
    { key: 'past', label: t('followingEvents.tabPast') },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>SAVE</WatermarkNumeral>
      <View style={styles.safeArea}>
        {/* Editorial header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? colors.background : 'rgba(253,251,247,0.95)',
              borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerEyebrow, { color: colors.gray400 }]}>{t('followingEvents.eyebrow')}</Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('followingEvents.title')}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setSearchOpen((v) => !v)}
                style={[styles.headerBtn, { backgroundColor: colors.gray100 }]}
                accessibilityRole="button"
                accessibilityLabel={t('followingEvents.searchA11y')}
              >
                <Ionicons
                  name={searchOpen ? 'close' : 'search'}
                  size={18}
                  color={colors.gray600}
                />
              </TouchableOpacity>
              <View style={[styles.countPill, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.countPillText, { color: colors.primary }]}>
                  {activeSection === 'events'
                    ? t('followingEvents.savedCount', { count: follows.length })
                    : (organizers.length > 1
                      ? t('followingEvents.followedPlural', { count: organizers.length })
                      : t('followingEvents.followedSingular', { count: organizers.length }))}
                </Text>
              </View>
            </View>
          </View>

          {/* Section tabs éditoriaux underline (style presse) :
              uppercase tracking + count inline + soulignement corail sur l'actif */}
          <View style={[styles.editorialTabsRow, { borderBottomColor: colors.border }]}>
            {(['events', 'organizers'] as SectionKind[]).map((section) => {
              const isActive = activeSection === section;
              const label = section === 'events' ? t('followingEvents.sectionEvents') : t('followingEvents.sectionOrganizers');
              const count = section === 'events' ? follows.length : organizers.length;
              return (
                <TouchableOpacity
                  key={section}
                  onPress={() => setActiveSection(section)}
                  style={styles.editorialTab}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <View style={styles.editorialTabRow}>
                    <Text
                      style={[
                        styles.editorialTabLabel,
                        { color: isActive ? colors.text : colors.gray500 },
                      ]}
                    >
                      {label}
                    </Text>
                    {count > 0 && (
                      <Text
                        style={[
                          styles.editorialTabCount,
                          { color: isActive ? colors.accent : colors.gray400 },
                        ]}
                      >
                        · {count}
                      </Text>
                    )}
                  </View>
                  {/* Underline corail : visible uniquement sur l'actif */}
                  {isActive && (
                    <View style={[styles.editorialTabUnderline, { backgroundColor: colors.accent }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tabs row : visibles UNIQUEMENT pour la section Événements */}
          {activeSection === 'events' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabChip,
                    isActive
                      ? { backgroundColor: colors.text }
                      : {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      // Texte inverse du theme : sur ink (bg = colors.text),
                      // on prend colors.background → contraste garanti dans
                      // les 2 modes (light: bg sombre + text clair / dark:
                      // bg clair + text sombre).
                      { color: isActive ? colors.background : colors.gray600 },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          )}

          {/* Search */}
          {searchOpen && (
            <View
              style={[
                styles.searchInputWrapper,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('followingEvents.searchPlaceholder')}
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
          )}
        </View>

        {/* Content : Événements OU Organisateurs selon section active */}
        {activeSection === 'organizers' ? (
          renderOrganizersSection()
        ) : (
        <ContentTransition
          isLoading={loading}
          skeleton={
            <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.md }}>
              <FollowingEventCardSkeleton />
              <FollowingEventCardSkeleton />
              <FollowingEventCardSkeleton />
              <FollowingEventCardSkeleton />
            </View>
          }
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {totalVisible === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {/* Cette Semaine — HERO */}
                {visibleSections.thisWeek.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader label={t('followingEvents.sectionThisWeek')} />
                    <StaggeredItem index={0} staggerDelay={80}>
                      <HeroCard
                        follow={visibleSections.thisWeek[0].follow}
                        event={visibleSections.thisWeek[0].event}
                        days={visibleSections.thisWeek[0].days}
                        colors={colors}
                        onPress={handleEventPress}
                        onToggleNotification={toggleNotification}
                        t={t}
                      />
                    </StaggeredItem>
                    {/* Remaining this-week events go into compact list */}
                    {visibleSections.thisWeek.slice(1).length > 0 && (
                      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                        {visibleSections.thisWeek.slice(1).map((x, idx) => (
                          <StaggeredItem key={x.follow.id} index={idx + 1} staggerDelay={80}>
                            <CarouselCard
                              follow={x.follow}
                              event={x.event}
                              days={x.days}
                              accent
                              colors={colors}
                              canvasBg={canvasBg}
                              onPress={handleEventPress}
                              t={t}
                            />
                          </StaggeredItem>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Ce Mois-ci — MASONRY */}
                {visibleSections.thisMonth.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader label={t('followingEvents.sectionThisMonth')} />
                    {renderMasonry(visibleSections.thisMonth)}
                  </View>
                )}

                {/* Plus Tard — CAROUSEL */}
                {visibleSections.later.length > 0 && (
                  <View style={[styles.section, { paddingLeft: 0, paddingRight: 0 }]}>
                    <View style={{ paddingHorizontal: Spacing.lg }}>
                      <SectionHeader label={t('followingEvents.sectionLater')} />
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingHorizontal: Spacing.lg,
                        paddingVertical: Spacing.xs,
                        gap: Spacing.md,
                      }}
                    >
                      {visibleSections.later.map((x, idx) => (
                        <CarouselCard
                          key={x.follow.id}
                          follow={x.follow}
                          event={x.event}
                          days={x.days}
                          accent={idx === 0}
                          colors={colors}
                          canvasBg={canvasBg}
                          onPress={handleEventPress}
                          t={t}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Archives (Passés) */}
                {visibleSections.past.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader label={t('followingEvents.sectionArchives')} muted />
                    <View style={{ gap: Spacing.sm }}>
                      {visibleSections.past.map((x, idx) => (
                        <StaggeredItem key={x.follow.id} index={idx} staggerDelay={60}>
                          <ArchivedCard
                            follow={x.follow}
                            event={x.event}
                            colors={colors}
                            onPress={handleEventPress}
                            onUnfollow={handleUnfollow}
                          />
                        </StaggeredItem>
                      ))}
                    </View>
                  </View>
                )}

                {/* Suivis d'intérêt */}
                {categoryGroups.length > 0 && activeTab !== 'past' && (
                  <View style={styles.section}>
                    <SectionHeader label={t('followingEvents.sectionInterests')} muted />
                    <CategoryChips />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </ContentTransition>
        )}
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    letterSpacing: -1.2,
    lineHeight: 36,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: -0.1,
  },

  // Section tabs éditoriaux underline (style presse / fanzine)
  editorialTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.lg,
  },
  editorialTab: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  editorialTabRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  editorialTabLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
  },
  editorialTabCount: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
  },
  // Soulignement corail 3px qui marque le tab actif (overlap la border bottom)
  editorialTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Section "Organisateurs suivis" — liste compacte
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  organizerRowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  organizerRowBody: {
    flex: 1,
    gap: 2,
  },
  organizerRowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  organizerRowName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },
  organizerRowMeta: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  organizerRowUnfollow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOrganizers: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: Spacing.sm,
  },
  tabChip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  tabChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },

  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },

  // Scroll content
  scrollContent: {
    paddingBottom: 140,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeaderText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
  },

  // Hero card
  heroCard: {
    height: 380,
    borderRadius: 28,
    overflow: 'hidden',
  },
  heroDayNumeral: {
    position: 'absolute',
    top: -14,
    left: 8,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 160,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: -8,
    lineHeight: 140,
  },
  heroCountdownPill: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCountdownText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  heroSubtitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -0.8,
    lineHeight: 30,
    marginBottom: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.1,
  },
  heroHeartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  // Masonry
  masonryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  masonryCol: {
    flex: 1,
    gap: Spacing.md,
  },
  masonryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  masonryImageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  masonryBell: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masonryBody: {
    paddingHorizontal: 2,
    gap: 4,
  },
  masonryShortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  masonryShortBell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masonryDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  masonryBigDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 46,
    letterSpacing: -2,
    lineHeight: 42,
  },
  masonryBigMonth: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  masonryTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.3,
    lineHeight: 18,
    marginTop: 2,
  },
  masonrySubtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  masonryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  masonryCatPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  masonryCatText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Carousel card
  carouselCard: {
    width: 280,
    minHeight: 92,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    position: 'relative',
  },
  carouselStub: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  carouselStubMonth: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  carouselStubDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    letterSpacing: -1.5,
    lineHeight: 32,
  },
  carouselPerforation: {
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  carouselBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  carouselProxPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 6,
  },
  carouselProxText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  carouselTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  carouselSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  ribbon: {
    position: 'absolute',
    top: -2,
    right: 20,
    width: 14,
    height: 26,
    // polygon-like tail using clipPath is not possible in RN core
    // Approximate with rounded bottom via two nested shapes:
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },

  // Archived
  archivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  archivedDate: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  archivedMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  archivedTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 14,
    letterSpacing: -0.2,
    textDecorationLine: 'line-through',
  },
  archivedSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },

  // Category chips
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  categoryChipCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },

  // Empty / Auth
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  discoverButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.white,
    letterSpacing: -0.1,
  },

  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  authTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.6,
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  loginButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  loginButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
    color: Colors.white,
    letterSpacing: -0.1,
  },
});
