import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { eventsAPI, categoriesAPI, recommendationsAPI, getMediaUrl } from '../../api';
import { Event, Category, RootStackParamList, MainTabParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnreadCounts } from '../../contexts/NotificationContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import CacheService from '../../services/CacheService';
import { DiscoverScreenSkeleton } from '../../components/ui/Skeleton';
import { SectionEntrance, StaggeredItem, PulsingBadge } from '../../components/ui/Animations';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { getApiResults } from '../../lib/utils/apiHelpers';
import { getEventPriceRange } from '../../lib/utils/priceFormatters';
import { isEventInFuture } from '../../lib/utils/dateFormatters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DISCOVER_CACHE_TTL = 5 * 60 * 1000;
const HEADER_SCROLL_THRESHOLD = 80;

// Warm editorial canvas (light mode) — same language as MyTicketsScreen
const CANVAS_LIGHT = '#F6F6F9';

// === Date helpers ===
const MONTHS_FR = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUI', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
function splitDate(iso: string) {
  const d = new Date(iso);
  return { day: String(d.getDate()).padStart(2, '0'), month: MONTHS_FR[d.getMonth()] };
}
function eventTime(ev: Event) {
  const anyEv = ev as any;
  if (anyEv.start_time) return String(anyEv.start_time).slice(0, 5);
  try {
    const d = new Date(ev.start_date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
function eventImage(ev: Event) {
  return (
    getMediaUrl(
      ev.banner_image || ev.category?.default_event_image || (ev as any).display_image,
    ) || undefined
  );
}
function eventPlaceholder(ev: Event) {
  return (
    (ev as any).banner_placeholder ||
    ev.category?.default_event_image_placeholder ||
    (ev as any).display_placeholder
  );
}
function daysUntil(iso: string): number | null {
  try {
    const now = new Date();
    const target = new Date(iso);
    const ms = target.getTime() - now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return null;
  }
}

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Discover'>>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const { unreadNotificationCount, unreadMessageCount } = useUnreadCounts();

  // === State ===
  const [initialLoading, setInitialLoading] = useState(true);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [freeEvents, setFreeEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Track fetch failures so we can surface a banner instead of failing silently
  const [fetchErrorCount, setFetchErrorCount] = useState(0);

  const canvasBg = isDark ? colors.background : CANVAS_LIGHT;

  // === Scroll-driven compact header ===
  const scrollY = useSharedValue(0);
  const compactHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_SCROLL_THRESHOLD * 0.5, HEADER_SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      pointerEvents: opacity > 0.5 ? ('auto' as const) : ('none' as const),
    };
  });
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // === Rotating placeholder suggestions ===
  const placeholderSuggestions = useMemo(
    () => [
      'Concert à Douala...',
      'Festival ce weekend...',
      'Conférence tech...',
      'Atelier cuisine...',
      'Soirée networking...',
    ],
    [],
  );
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((p) => (p + 1) % placeholderSuggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholderSuggestions]);

  // === Fetch data (progressive, cached) ===
  const fetchDiscoveryData = useCallback(async (bypassCache: boolean = false) => {
    let failures = 0;
    const trackFailure = (label: string) => (err: unknown) => {
      failures += 1;
      if (__DEV__) console.error(`${label}:`, err);
    };

    try {
      if (!bypassCache) {
        const [cachedFeatured, cachedCategories, cachedUpcoming, cachedFree] = await Promise.all([
          CacheService.get<Event[]>('discover:featured'),
          CacheService.get<Category[]>('discover:categories'),
          CacheService.get<Event[]>('discover:upcoming'),
          CacheService.get<Event[]>('discover:free'),
        ]);
        if (cachedFeatured) setFeaturedEvents(cachedFeatured.data);
        if (cachedCategories) setCategories(cachedCategories.data);
        if (cachedUpcoming) setUpcomingEvents(cachedUpcoming.data);
        if (cachedFree) setFreeEvents(cachedFree.data);
        if (cachedFeatured || cachedCategories || cachedUpcoming || cachedFree) {
          setInitialLoading(false);
        }
      }

      const fetches = [
        eventsAPI
          .getFeaturedEvents()
          .then((res) => {
            const data = getApiResults<Event>(res).filter((e) => isEventInFuture(e.start_date));
            setFeaturedEvents(data);
            CacheService.set('discover:featured', data, DISCOVER_CACHE_TTL);
            setInitialLoading(false);
          })
          .catch(trackFailure('featured')),

        categoriesAPI
          .getCategories()
          .then((res) => {
            const data = getApiResults<Category>(res);
            setCategories(data);
            CacheService.set('discover:categories', data, DISCOVER_CACHE_TTL);
          })
          .catch(trackFailure('categories')),

        eventsAPI
          .getEvents({ ordering: 'start_date', limit: 15, status: 'validated' })
          .then((res) => {
            const data = getApiResults<Event>(res).filter((e) => isEventInFuture(e.start_date));
            setUpcomingEvents(data);
            CacheService.set('discover:upcoming', data, DISCOVER_CACHE_TTL);
          })
          .catch(trackFailure('upcoming')),

        eventsAPI
          .getEvents({ price: 'free', ordering: 'start_date', limit: 10, status: 'validated' })
          .then((res) => {
            const data = getApiResults<Event>(res).filter((e) => isEventInFuture(e.start_date));
            setFreeEvents(data);
            CacheService.set('discover:free', data, DISCOVER_CACHE_TTL);
          })
          .catch(trackFailure('free')),
      ];

      await Promise.all(fetches);
      // Update banner state once all fetches settle
      setFetchErrorCount(failures);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement:', error);
      setFetchErrorCount((c) => c + 1);
      setInitialLoading(false);
    }
  }, []);

  const fetchRecommendations = useCallback(
    async (bypassCache: boolean = false) => {
      if (!user) return;
      try {
        if (!bypassCache) {
          const cached = await CacheService.get<Event[]>('discover:recommendations');
          if (cached) setRecommendations(cached.data);
        }
        const response = await recommendationsAPI.getRecommendations({ limit: 10 });
        const data = getApiResults<Event>(response).filter((e) => isEventInFuture(e.start_date));
        setRecommendations(data);
        CacheService.set('discover:recommendations', data, DISCOVER_CACHE_TTL);
      } catch {
        /* recommandations optionnelles */
      }
    },
    [user],
  );

  const fetchNearbyEvents = useCallback(async () => {
    if (!location) return;
    try {
      const response = await eventsAPI.getNearbyEvents(location.lat, location.lng, 50, 10);
      setNearbyEvents(getApiResults<Event>(response).filter((e) => isEventInFuture(e.start_date)));
    } catch (error) {
      if (__DEV__) console.error('Erreur evenements proches:', error);
    }
  }, [location]);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur localisation:', error);
    }
  }, []);

  // === Effects ===
  useEffect(() => {
    fetchDiscoveryData();
    const task = InteractionManager.runAfterInteractions(() => {
      fetchRecommendations();
      requestLocation();
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (route.params?.category) {
      navigation.navigate('EventSearch', { category: route.params.category });
    }
  }, [route.params?.category, navigation]);

  useEffect(() => {
    if (location) fetchNearbyEvents();
  }, [location, fetchNearbyEvents]);

  // === Handlers ===
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDiscoveryData(true),
      fetchRecommendations(true),
      location ? fetchNearbyEvents() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };
  const activateSearch = (categoryId?: number) => {
    navigation.navigate('EventSearch', categoryId ? { category: categoryId } : undefined);
  };
  const navigateToEvent = (eventId: string, imageUrl?: string) => {
    navigation.navigate('EventDetails', { eventId, imageUrl });
  };
  const goToMessages = () =>
    user ? navigation.navigate('Messages') : navigation.navigate('Login' as any);
  const goToNotifications = () =>
    user ? navigation.navigate('Notifications') : navigation.navigate('Login' as any);

  // === Editorial section header ===
  const SectionHeader = ({
    eyebrow,
    title,
    onSeeAll,
  }: {
    eyebrow: string;
    title: string;
    onSeeAll?: () => void;
  }) => (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{eyebrow}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          activeOpacity={TOUCH_OPACITY}
          style={[styles.seeAllBtn, { backgroundColor: colors.gray100 }]}
        >
          <Text style={[styles.seeAllText, { color: colors.gray700 }]}>Voir tout</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.gray700} />
        </TouchableOpacity>
      )}
    </View>
  );

  // === HERO — big editorial card with date tile + gradient overlay ===
  const renderHero = (ev: Event) => {
    const img = eventImage(ev);
    const ph = eventPlaceholder(ev);
    const { day, month } = splitDate(ev.start_date);
    const range = getEventPriceRange(ev);
    const isFree = ev.is_free || (range?.min === 0 && range?.max === 0);
    const dUntil = daysUntil(ev.start_date);
    const isSoon = dUntil !== null && dUntil <= 7;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigateToEvent(ev.id, img)}
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
          },
          Shadows.lg,
        ]}
      >
        <View style={styles.heroImageWrap}>
          {img ? (
            <Image
              source={{ uri: img }}
              placeholder={ph}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={300}
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: colors.primary }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Eyebrow pill top-left */}
          <View style={[styles.heroEyebrowPill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Ionicons name="star" size={11} color={colors.accent} />
            <Text style={[styles.heroEyebrowText, { color: colors.text }]}>EN VEDETTE</Text>
          </View>
          {/* (Decorative bookmark removed — see FollowEventButton on EventDetails for real follow action) */}
          {/* Title overlay */}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {ev.title}
            </Text>
            {ev.category?.name && (
              <Text style={styles.heroCategory} numberOfLines={1}>
                {ev.category.name}
              </Text>
            )}
          </View>
        </View>

        {/* Meta footer — date tile + venue + price */}
        <View style={styles.heroFooter}>
          <View
            style={[
              styles.heroDateTile,
              {
                backgroundColor: isSoon ? `${colors.accent}1A` : colors.primaryBg,
              },
            ]}
          >
            <Text style={[styles.heroDateDay, { color: isSoon ? colors.accent : colors.primary }]}>
              {day}
            </Text>
            <Text
              style={[styles.heroDateMonth, { color: isSoon ? colors.accent : colors.primary }]}
            >
              {month}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location" size={12} color={colors.gray400} />
              <Text style={[styles.heroMetaText, { color: colors.gray600 }]} numberOfLines={1}>
                {ev.location_city || ev.location_address || 'Lieu à confirmer'}
              </Text>
            </View>
            {!!eventTime(ev) && (
              <View style={styles.heroMetaRow}>
                <Ionicons name="time-outline" size={12} color={colors.gray400} />
                <Text style={[styles.heroMetaText, { color: colors.gray600 }]}>
                  {eventTime(ev)}
                </Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.heroPricePill,
              {
                backgroundColor: isFree ? `${colors.primary}15` : colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.heroPriceText,
                { color: isFree ? colors.primary : Colors.white },
              ]}
            >
              {isFree
                ? 'Gratuit'
                : range?.min
                ? `${range.min} ${ev.currency || platformCurrency || ''}`
                : 'Voir'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // === Nearby horizontal — compact portrait cards ===
  const renderNearbyCard = ({ item, index }: { item: Event; index: number }) => {
    const img = eventImage(item);
    const ph = eventPlaceholder(item);
    const { day, month } = splitDate(item.start_date);
    const range = getEventPriceRange(item);
    const isFree = item.is_free || (range?.min === 0 && range?.max === 0);
    return (
      <StaggeredItem index={index} staggerDelay={70}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigateToEvent(item.id, img)}
          style={[
            styles.nearbyCard,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
            },
            Shadows.md,
          ]}
        >
          <View style={styles.nearbyImageWrap}>
            {img ? (
              <Image
                source={{ uri: img }}
                placeholder={ph}
                style={styles.nearbyImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={250}
              />
            ) : (
              <View style={[styles.nearbyImage, { backgroundColor: colors.primary }]} />
            )}
            <View
              style={[
                styles.nearbyDateTile,
                { backgroundColor: 'rgba(255,255,255,0.95)' },
              ]}
            >
              <Text style={[styles.nearbyDateDay, { color: colors.accent }]}>{day}</Text>
              <Text style={[styles.nearbyDateMonth, { color: colors.accent }]}>{month}</Text>
            </View>
            {/* (Decorative bookmark removed — favorite from EventDetails) */}
          </View>
          <View style={styles.nearbyBody}>
            {item.category?.name && (
              <View style={[styles.nearbyEyebrowPill, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.nearbyEyebrowText, { color: colors.gray500 }]} numberOfLines={1}>
                  {item.category.name}
                </Text>
              </View>
            )}
            <Text style={[styles.nearbyTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.nearbyMetaRow}>
              <Ionicons name="location" size={11} color={colors.gray400} />
              <Text style={[styles.nearbyMetaText, { color: colors.gray500 }]} numberOfLines={1}>
                {item.location_city || 'À confirmer'}
              </Text>
            </View>
            <Text
              style={[
                styles.nearbyPrice,
                { color: isFree ? colors.primary : colors.text },
              ]}
            >
              {isFree
                ? 'Gratuit'
                : range?.min
                ? `À partir de ${range.min} ${item.currency || platformCurrency || ''}`
                : ''}
            </Text>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  // === Incoming list — stub-style row with dashed perforation ===
  const renderIncoming = () => {
    const list = upcomingEvents.slice(0, 4);
    if (list.length === 0) return null;
    return (
      <View style={styles.incomingList}>
        {list.map((ev, i) => {
          const { day, month } = splitDate(ev.start_date);
          const dUntil = daysUntil(ev.start_date);
          const isSoon = dUntil !== null && dUntil <= 7;
          const accent = isSoon ? colors.accent : colors.primary;
          const accentBg = isSoon ? `${colors.accent}1A` : colors.primaryBg;
          return (
            <StaggeredItem key={ev.id} index={i} staggerDelay={70}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigateToEvent(ev.id, eventImage(ev))}
                style={[
                  styles.incomingCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                  },
                  Shadows.sm,
                ]}
              >
                <View style={[styles.incomingDateTile, { backgroundColor: accentBg }]}>
                  <Text style={[styles.incomingDateDay, { color: accent }]}>{day}</Text>
                  <Text style={[styles.incomingDateMonth, { color: accent }]}>{month}</Text>
                  {dUntil !== null && dUntil <= 14 && dUntil >= 0 && (
                    <Text style={[styles.incomingCountdown, { color: accent }]}>
                      J-{dUntil}
                    </Text>
                  )}
                </View>

                {/* Dashed vertical separator */}
                <View style={[styles.incomingPerf, { borderLeftColor: colors.gray200 }]} />

                <View style={styles.incomingBody}>
                  {ev.category?.name && (
                    <View style={[styles.incomingEyebrowPill, { backgroundColor: colors.gray100 }]}>
                      <Text
                        style={[styles.incomingEyebrowText, { color: colors.gray500 }]}
                        numberOfLines={1}
                      >
                        {ev.category.name}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.incomingTitle, { color: colors.text }]} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <View style={styles.incomingMetaRow}>
                    <Ionicons name="location" size={11} color={colors.gray400} />
                    <Text style={[styles.incomingMetaText, { color: colors.gray500 }]} numberOfLines={1}>
                      {ev.location_city || 'À confirmer'}
                    </Text>
                    {!!eventTime(ev) && (
                      <>
                        <View style={[styles.incomingDot, { backgroundColor: colors.gray300 }]} />
                        <Text style={[styles.incomingMetaText, { color: colors.gray500 }]}>
                          {eventTime(ev)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
              </TouchableOpacity>
            </StaggeredItem>
          );
        })}
      </View>
    );
  };

  // === Categories grid — 2-col soft cards ===
  const renderCategories = () => {
    if (categories.length === 0) return null;
    return (
      <View style={styles.categoriesGrid}>
        {categories.slice(0, 6).map((cat, i) => {
          const img = cat.image ? getMediaUrl(cat.image) : undefined;
          const accentColors = [
            colors.primary,
            colors.accent,
            colors.secondary || colors.primary,
            colors.primary,
            colors.accent,
            colors.secondary || colors.primary,
          ];
          const tone = accentColors[i % accentColors.length];
          return (
            <StaggeredItem key={cat.id} index={i} staggerDelay={60}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => activateSearch(Number(cat.id))}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                  },
                  Shadows.sm,
                ]}
              >
                {img ? (
                  <Image
                    source={{ uri: img }}
                    placeholder={cat.image_placeholder}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : null}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.categoryBody}>
                  <View style={[styles.categoryDot, { backgroundColor: tone }]} />
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {cat.name}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {cat.event_count ?? (cat as any).events_count ?? 0} événements
                  </Text>
                </View>
              </TouchableOpacity>
            </StaggeredItem>
          );
        })}
      </View>
    );
  };

  // === Free events — gradient band with horizontal soft cards ===
  const renderFreeSection = () => {
    if (freeEvents.length === 0) return null;
    return (
      <View style={styles.freeSection}>
        <LinearGradient
          colors={[`${colors.primary}12`, `${colors.accent}12`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.freeSectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>ZÉRO FRANC</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Gratuit, sans condition</Text>
          </View>
          <TouchableOpacity
            onPress={() => activateSearch()}
            activeOpacity={TOUCH_OPACITY}
            style={[styles.seeAllBtn, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={freeEvents.slice(0, 6)}
          keyExtractor={(it) => `free-${it.id}`}
          contentContainerStyle={styles.freeCardsRow}
          renderItem={({ item }) => {
            const img = eventImage(item);
            const { day, month } = splitDate(item.start_date);
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigateToEvent(item.id, img)}
                style={[
                  styles.freeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                  },
                  Shadows.sm,
                ]}
              >
                <View style={styles.freeCardLeft}>
                  <View
                    style={[
                      styles.freeDateTile,
                      { backgroundColor: colors.primaryBg },
                    ]}
                  >
                    <Text style={[styles.freeDateDay, { color: colors.primary }]}>{day}</Text>
                    <Text style={[styles.freeDateMonth, { color: colors.primary }]}>{month}</Text>
                  </View>
                </View>
                <View style={[styles.freeCardPerf, { borderLeftColor: colors.gray200 }]} />
                <View style={styles.freeCardBody}>
                  <View style={[styles.freeBadge, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.freeBadgeText, { color: colors.primary }]}>GRATUIT</Text>
                  </View>
                  <Text style={[styles.freeTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.freeVenue, { color: colors.gray500 }]} numberOfLines={1}>
                    {item.location_city || 'À confirmer'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  // === Recommendations rec card (logged-in) ===
  const renderRecCard = () => {
    const ev = recommendations[0];
    if (!ev) return null;
    const img = eventImage(ev);
    const ph = eventPlaceholder(ev);
    const { day, month } = splitDate(ev.start_date);
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigateToEvent(ev.id, img)}
        style={[
          styles.recCard,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
          },
          Shadows.md,
        ]}
      >
        <View style={styles.recImageWrap}>
          {img ? (
            <Image
              source={{ uri: img }}
              placeholder={ph}
              style={styles.recImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={300}
            />
          ) : (
            <View style={[styles.recImage, { backgroundColor: colors.primary }]} />
          )}
          {ev.category?.name && (
            <View style={[styles.recReasonPill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <Ionicons name="sparkles" size={11} color={colors.accent} />
              <Text style={[styles.recReasonText, { color: colors.text }]} numberOfLines={1}>
                Pour toi • {ev.category.name}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.recBody}>
          <View style={[styles.recDateTile, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.recDateDay, { color: colors.primary }]}>{day}</Text>
            <Text style={[styles.recDateMonth, { color: colors.primary }]}>{month}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={[styles.recTitle, { color: colors.text }]} numberOfLines={2}>
              {ev.title}
            </Text>
            <View style={styles.recMetaRow}>
              <Ionicons name="location" size={11} color={colors.gray400} />
              <Text style={[styles.recMetaText, { color: colors.gray500 }]} numberOfLines={1}>
                {ev.location_city || 'À confirmer'}
              </Text>
            </View>
          </View>
          <View
            style={[styles.recArrow, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // === MAIN RENDER ===
  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>EZ</WatermarkNumeral>
      <View style={styles.safeArea}>
        {initialLoading ? (
          <DiscoverScreenSkeleton />
        ) : (
          <View style={{ flex: 1 }}>
            {/* === COMPACT HEADER (on scroll) === */}
            <Animated.View
              style={[
                styles.compactHeader,
                {
                  backgroundColor: isDark ? colors.background : 'rgba(246,246,249,0.92)',
                  borderBottomColor: colors.gray100,
                },
                compactHeaderStyle,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.compactSearchBar,
                  { backgroundColor: colors.gray100 },
                ]}
                onPress={() => activateSearch()}
                activeOpacity={0.7}
              >
                <Ionicons name="search" size={16} color={colors.gray500} />
                <Text style={[styles.compactSearchText, { color: colors.gray500 }]} numberOfLines={1}>
                  {placeholderSuggestions[placeholderIndex]}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactBtn, { backgroundColor: colors.gray100 }]}
                onPress={goToNotifications}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={18} color={colors.gray600} />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.compactBtnDot, { backgroundColor: colors.accent }]} />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* === FEED === */}
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              contentContainerStyle={styles.scrollContent}
            >
              {/* === EDITORIAL HEADER — rounded bottom, matches tickets === */}
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
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
                      {(() => {
                        // Ville dérivée des events nearby si géoloc accordée, sinon
                        // de la première ville parmi featured/upcoming, sinon générique.
                        const city =
                          (location && nearbyEvents[0]?.location_city) ||
                          featuredEvents[0]?.location_city ||
                          upcomingEvents[0]?.location_city;
                        return city ? `DÉCOUVRIR • ${city.toUpperCase()}` : 'DÉCOUVRIR';
                      })()}
                    </Text>
                    <View style={styles.headerTitleRow}>
                      <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Ce qui bouge
                      </Text>
                      
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    {user?.role === 'organizer' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('EventCreate' as any)}
                        style={[styles.headerBtnCreate, Shadows.buttonPrimary]}
                        accessibilityRole="button"
                        accessibilityLabel="Creer un evenement"
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="add" size={20} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.headerBtn, { backgroundColor: colors.gray100 }]}
                      onPress={goToMessages}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Messages"
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={colors.gray600} />
                      {unreadMessageCount > 0 && (
                        <PulsingBadge active style={styles.headerBadgeWrap}>
                          <View style={[styles.headerBtnDot, { backgroundColor: colors.accent }]} />
                        </PulsingBadge>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.headerBtn, { backgroundColor: colors.gray100 }]}
                      onPress={goToNotifications}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Notifications"
                    >
                      <Ionicons name="notifications-outline" size={18} color={colors.gray600} />
                      {unreadNotificationCount > 0 && (
                        <PulsingBadge active style={styles.headerBadgeWrap}>
                          <View style={[styles.headerBtnDot, { backgroundColor: colors.accent }]} />
                        </PulsingBadge>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* === EDITORIAL SEARCH BAR — inverted: cream bg, indigo text === */}
                <TouchableOpacity
                  style={[styles.searchTrigger, Shadows.cardViolet]}
                  onPress={() => activateSearch()}
                  activeOpacity={0.9}
                  accessibilityRole="search"
                >
                  {/* Cream/light gradient bg (full bleed) */}
                  <LinearGradient
                    colors={
                      isDark
                        ? ['#1E293B', '#0F172A']
                        : ['#F4F0E8', '#FFFFFF']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Decorative corner accent (corail) */}
                  <View
                    style={[
                      styles.searchCornerDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                  {/* Decorative diagonal slash — dark on cream */}
                  <View
                    style={[
                      styles.searchSlash,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,16,0.06)' },
                    ]}
                    pointerEvents="none"
                  />
                  {/* Search icon disc — indigo w/ white icon */}
                  <View
                    style={[
                      styles.searchIconDisc,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="search" size={17} color="#FFFFFF" />
                  </View>
                  {/* Text col */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchEyebrow, { color: colors.accent }]}>
                      QUOI · CE SOIR
                    </Text>
                    <Text
                      style={[
                        styles.searchTriggerText,
                        { color: isDark ? '#F4F0E8' : colors.primaryDark },
                      ]}
                      numberOfLines={1}
                    >
                      {placeholderSuggestions[placeholderIndex]}
                    </Text>
                  </View>
                  {/* Filter pill — solid indigo with white text */}
                  <View
                    style={[
                      styles.searchFilterPill,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="options" size={14} color="#FFFFFF" />
                    <Text style={[styles.searchFilterPillText, { color: '#FFFFFF' }]}>Filtres</Text>
                  </View>
                </TouchableOpacity>

                {/* Category chips row */}
                {categories.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        { backgroundColor: colors.primary, ...Shadows.buttonPrimary },
                      ]}
                      onPress={() => activateSearch()}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="flash" size={13} color={Colors.white} />
                      <Text style={[styles.chipText, { color: Colors.white }]}>Tout</Text>
                    </TouchableOpacity>
                    {categories.slice(0, 8).map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, { backgroundColor: colors.gray100 }]}
                        onPress={() => activateSearch(Number(cat.id))}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, { color: colors.gray600 }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* === HERO === */}
              {featuredEvents[0] && (
                <SectionEntrance delay={200}>
                  <View style={styles.heroWrap}>{renderHero(featuredEvents[0])}</View>
                </SectionEntrance>
              )}

              {/* === NEARBY === */}
              {nearbyEvents.length > 0 && (
                <SectionEntrance delay={300}>
                  <View style={styles.section}>
                    <SectionHeader
                      eyebrow="PRÈS DE TOI"
                      title="Populaire dans le coin"
                      onSeeAll={() => activateSearch()}
                    />
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={nearbyEvents}
                      keyExtractor={(it) => `nearby-${it.id}`}
                      contentContainerStyle={styles.horizontalListContent}
                      renderItem={renderNearbyCard}
                      removeClippedSubviews
                      initialNumToRender={3}
                      windowSize={5}
                    />
                  </View>
                </SectionEntrance>
              )}

              {/* === RECOMMENDED rec card (user) === */}
              {user && recommendations.length > 0 && (
                <SectionEntrance delay={380}>
                  <View style={styles.section}>
                    <SectionHeader
                      eyebrow="POUR TOI"
                      title="Recommandé"
                      onSeeAll={() => activateSearch()}
                    />
                    <View style={{ paddingHorizontal: Spacing.lg }}>{renderRecCard()}</View>
                  </View>
                </SectionEntrance>
              )}
              {!user && (
                <SectionEntrance delay={380}>
                  <View style={styles.section}>
                    <View style={{ paddingHorizontal: Spacing.lg }}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => navigation.navigate('Login' as any)}
                        style={[
                          styles.loginCta,
                          {
                            backgroundColor: colors.card,
                            borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                          },
                          Shadows.sm,
                        ]}
                      >
                        <LinearGradient
                          colors={[`${colors.primary}15`, `${colors.accent}15`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.loginCtaIcon, { backgroundColor: colors.primaryBg }]}>
                          <Ionicons name="sparkles" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                          <Text style={[styles.loginCtaEyebrow, { color: colors.accent }]}>
                            CONNEXION
                          </Text>
                          <Text style={[styles.loginCtaTitle, { color: colors.text }]}>
                            Des recommandations taillées pour toi
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </SectionEntrance>
              )}

              {/* === INCOMING vertical stub list === */}
              {upcomingEvents.length > 0 && (
                <SectionEntrance delay={460}>
                  <View style={styles.section}>
                    <SectionHeader
                      eyebrow="À VENIR"
                      title="The Incoming"
                      onSeeAll={() => activateSearch()}
                    />
                    <View style={{ paddingHorizontal: Spacing.lg }}>{renderIncoming()}</View>
                  </View>
                </SectionEntrance>
              )}

              {/* === CATEGORIES grid === */}
              {categories.length > 0 && (
                <SectionEntrance delay={540}>
                  <View style={styles.section}>
                    <SectionHeader eyebrow="TOUS LES GENRES" title="Explorer" />
                    <View style={{ paddingHorizontal: Spacing.lg }}>{renderCategories()}</View>
                  </View>
                </SectionEntrance>
              )}

              {/* === FREE section === */}
              {freeEvents.length > 0 && (
                <SectionEntrance delay={620}>
                  <View style={[styles.section, { marginTop: Spacing.xl }]}>
                    {renderFreeSection()}
                  </View>
                </SectionEntrance>
              )}

              {/* === ERROR BANNER — visible if 2+ fetches failed === */}
              {fetchErrorCount >= 2 && (
                <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onRefresh}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.sm,
                      padding: Spacing.md,
                      borderRadius: BorderRadius.xl,
                      backgroundColor: `${colors.warning}15`,
                      borderWidth: 1,
                      borderColor: `${colors.warning}40`,
                    }}
                  >
                    <Ionicons name="cloud-offline" size={20} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: FontFamily.bold,
                          fontSize: 13,
                          color: colors.warning,
                        }}
                      >
                        Connexion lente
                      </Text>
                      <Text
                        style={{
                          fontFamily: FontFamily.regular,
                          fontSize: 12,
                          color: colors.gray600,
                          marginTop: 2,
                        }}
                      >
                        Certaines sections n'ont pas pu se charger. Tape pour réessayer.
                      </Text>
                    </View>
                    <Ionicons name="refresh" size={18} color={colors.warning} />
                  </TouchableOpacity>
                </View>
              )}

              {/* === EMPTY STATE — when nothing loaded and no errors masking it === */}
              {!initialLoading &&
                featuredEvents.length === 0 &&
                upcomingEvents.length === 0 &&
                freeEvents.length === 0 &&
                fetchErrorCount === 0 && (
                  <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing['2xl'], alignItems: 'center' }}>
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: colors.gray100,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: Spacing.md,
                      }}
                    >
                      <Ionicons name="calendar-outline" size={32} color={colors.gray400} />
                    </View>
                    <Text
                      style={{
                        fontFamily: FontFamily.displayBold,
                        fontSize: 18,
                        color: colors.text,
                        textAlign: 'center',
                        letterSpacing: -0.4,
                      }}
                    >
                      Rien à l'horizon pour l'instant
                    </Text>
                    <Text
                      style={{
                        fontFamily: FontFamily.regular,
                        fontSize: 13,
                        color: colors.gray500,
                        textAlign: 'center',
                        marginTop: 6,
                        maxWidth: 280,
                      }}
                    >
                      Les organisateurs préparent encore leurs événements. Reviens bientôt !
                    </Text>
                  </View>
                )}

              <View style={{ height: 140 }} />
            </Animated.ScrollView>
          </View>
        )}
      </View>
    </EditorialCanvas>
  );
}

// === STYLES — editorial tickets voice ===

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  // === EDITORIAL HEADER (rounded bottom 32) ===
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
  headerBtnCreate: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerBtnDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerBadgeWrap: { position: 'absolute', top: 0, right: 0 },

  // === SEARCH TRIGGER (editorial with character) ===
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 18,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 12,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  searchCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  searchIconDisc: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchSlash: {
    position: 'absolute',
    top: -10,
    right: 60,
    width: 1,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '18deg' }],
  },
  searchEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  searchTriggerText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
  },
  searchFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  searchFilterPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // === CATEGORY CHIPS ===
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  chipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // === COMPACT HEADER ===
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  compactSearchText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
  },
  compactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactBtnDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // === SECTIONS ===
  section: { marginTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.9,
    lineHeight: 28,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  seeAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  horizontalListContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: 4,
  },

  // === HERO ===
  heroWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroImageWrap: {
    height: 240,
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroEyebrowPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  heroEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  heroBookmark: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  heroTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 30,
    color: Colors.white,
    marginBottom: 4,
  },
  heroCategory: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  heroDateTile: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    minWidth: 54,
  },
  heroDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.8,
  },
  heroDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
    flex: 1,
  },
  heroPricePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  heroPriceText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  // === NEARBY CARD ===
  nearbyCard: {
    width: 220,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nearbyImageWrap: {
    height: 130,
    position: 'relative',
  },
  nearbyImage: { width: '100%', height: '100%' },
  nearbyDateTile: {
    position: 'absolute',
    top: 10,
    left: 10,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    minWidth: 44,
  },
  nearbyDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: -0.4,
  },
  nearbyDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  nearbyBookmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyBody: {
    padding: Spacing.sm,
    gap: 4,
  },
  nearbyEyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nearbyEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nearbyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
    marginTop: 2,
  },
  nearbyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    flex: 1,
  },
  nearbyPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: -0.2,
    marginTop: 2,
  },

  // === INCOMING vertical list ===
  incomingList: {
    gap: Spacing.sm,
  },
  incomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  incomingDateTile: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    minWidth: 56,
  },
  incomingDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: -0.7,
  },
  incomingDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  incomingCountdown: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  incomingPerf: {
    alignSelf: 'stretch',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  incomingBody: {
    flex: 1,
    gap: 4,
  },
  incomingEyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  incomingEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  incomingTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  incomingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  incomingMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  incomingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },

  // === CATEGORIES GRID ===
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
    height: 130,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#6366F1',
  },
  categoryBody: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 19,
    color: Colors.white,
  },
  categoryCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.1,
  },

  // === FREE section ===
  freeSection: {
    borderRadius: 24,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    overflow: 'hidden',
  },
  freeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  freeCardsRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  freeCard: {
    flexDirection: 'row',
    width: 260,
    padding: Spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  freeCardLeft: {},
  freeDateTile: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    minWidth: 54,
  },
  freeDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: -0.7,
  },
  freeDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  freeCardPerf: {
    alignSelf: 'stretch',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  freeCardBody: {
    flex: 1,
    gap: 4,
  },
  freeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  freeTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 16,
  },
  freeVenue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },

  // === REC CARD ===
  recCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recImageWrap: {
    height: 160,
    position: 'relative',
  },
  recImage: { width: '100%', height: '100%' },
  recReasonPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    maxWidth: '75%',
  },
  recReasonText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  recBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  recDateTile: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    minWidth: 54,
  },
  recDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.8,
  },
  recDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
    lineHeight: 22,
    marginBottom: 4,
  },
  recMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    flex: 1,
  },
  recArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === LOGIN CTA (guest) ===
  loginCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  loginCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCtaEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  loginCtaTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
});
