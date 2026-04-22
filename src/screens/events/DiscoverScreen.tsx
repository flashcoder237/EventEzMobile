import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useNotifications } from '../../contexts/NotificationContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import CacheService from '../../services/CacheService';
import { DiscoverScreenSkeleton } from '../../components/ui/Skeleton';
import { SectionEntrance, PulsingBadge } from '../../components/ui/Animations';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { getApiResults } from '../../lib/utils/apiHelpers';
import { getEventPriceRange } from '../../lib/utils/priceFormatters';
import { isEventInFuture } from '../../lib/utils/dateFormatters';
import EventCard from '../../components/events/EventCard';
import CategoryCard from '../../components/events/CategoryCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DISCOVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const HEADER_SCROLL_THRESHOLD = 80; // px to fully collapse

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Discover'>>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const { unreadNotificationCount, unreadMessageCount } = useNotifications();

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

  // === Animation (scroll-driven compact header) ===
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
      setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholderSuggestions]);

  // === Fetch data ===

  // Progressive rendering : chaque section s'affiche des que sa donnee arrive.
  // Au lieu d'attendre Promise.all (= latence du plus lent), chaque .then() declenche son setState.
  const fetchDiscoveryData = useCallback(async (bypassCache: boolean = false) => {
    try {
      // 1. Hydrate instantanement depuis le cache si dispo
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

      // 2. Refresh reseau : chaque section s'update independamment (non-bloquant)
      eventsAPI
        .getFeaturedEvents()
        .then((res) => {
          const data = getApiResults<Event>(res).filter((e) => isEventInFuture(e.start_date));
          setFeaturedEvents(data);
          CacheService.set('discover:featured', data, DISCOVER_CACHE_TTL);
          setInitialLoading(false);
        })
        .catch((err) => __DEV__ && console.error('featured:', err));

      categoriesAPI
        .getCategories()
        .then((res) => {
          const data = getApiResults<Category>(res);
          setCategories(data);
          CacheService.set('discover:categories', data, DISCOVER_CACHE_TTL);
        })
        .catch((err) => __DEV__ && console.error('categories:', err));

      eventsAPI
        .getEvents({ ordering: 'start_date', limit: 15, status: 'validated' })
        .then((res) => {
          const data = getApiResults<Event>(res).filter((e) => isEventInFuture(e.start_date));
          setUpcomingEvents(data);
          CacheService.set('discover:upcoming', data, DISCOVER_CACHE_TTL);
        })
        .catch((err) => __DEV__ && console.error('upcoming:', err));

      eventsAPI
        .getEvents({ price: 'free', ordering: 'start_date', limit: 10, status: 'validated' })
        .then((res) => {
          const data = getApiResults<Event>(res).filter((e) => isEventInFuture(e.start_date));
          setFreeEvents(data);
          CacheService.set('discover:free', data, DISCOVER_CACHE_TTL);
        })
        .catch((err) => __DEV__ && console.error('free:', err));
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement:', error);
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
        /* optionnel : recommandations peuvent etre non dispo */
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

  // Initial load : data critique immediate, non-critique deferee apres les interactions
  useEffect(() => {
    fetchDiscoveryData();
    const task = InteractionManager.runAfterInteractions(() => {
      fetchRecommendations();
      requestLocation();
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirection automatique vers SearchScreen si on arrive avec une categorie en param de route
  useEffect(() => {
    if (route.params?.category) {
      navigation.navigate('EventSearch', { category: route.params.category });
    }
  }, [route.params?.category, navigation]);

  // Charge les events proches des que la localisation est disponible
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

  // Ouvre l'ecran de recherche dedie (animation slide_from_bottom native)
  const activateSearch = (categoryId?: number) => {
    navigation.navigate('EventSearch', categoryId ? { category: categoryId } : undefined);
  };

  const navigateToEvent = (eventId: string, imageUrl?: string) => {
    navigation.navigate('EventDetails', { eventId, imageUrl });
  };

  // === Render helpers ===

  const renderEventCard = useCallback(
    (item: Event, variant: 'default' | 'featured' | 'horizontal' | 'grid' = 'default') => {
      const range = getEventPriceRange(item);
      const eventImageUrl =
        getMediaUrl(item.banner_image || item.category?.default_event_image || item.display_image) ||
        undefined;
      return (
        <EventCard
          id={item.id}
          title={item.title}
          date={item.start_date}
          time={(item as any).start_time}
          location={item.location_city || item.location_address || 'Lieu à confirmer'}
          imageUrl={eventImageUrl}
          imagePlaceholder={
            item.banner_placeholder ||
            item.category?.default_event_image_placeholder ||
            item.display_placeholder
          }
          category={item.category?.name}
          price={range?.min}
          priceMax={range?.max}
          isFree={item.is_free || (range?.min === 0 && range?.max === 0)}
          isFeatured={item.is_featured}
          locationType={item.location_type}
          eventType={item.event_type}
          currency={item.currency || platformCurrency || undefined}
          attendees={item.registration_count || (item as any).registrations_count}
          variant={variant}
          onPress={() => navigateToEvent(item.id, eventImageUrl)}
        />
      );
    },
    [platformCurrency, navigation],
  );

  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccentLine, { backgroundColor: colors.accent }]} />
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          activeOpacity={TOUCH_OPACITY}
          accessibilityRole="link"
          accessibilityLabel={`Voir tout - ${title}`}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const goToMessages = () =>
    user ? navigation.navigate('Messages') : navigation.navigate('Login' as any);
  const goToNotifications = () =>
    user ? navigation.navigate('Notifications') : navigation.navigate('Login' as any);

  // === Main render ===

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {initialLoading ? (
        <DiscoverScreenSkeleton />
      ) : (
        <View style={{ flex: 1 }}>
          {/* === COMPACT HEADER (appears on scroll) === */}
          <Animated.View
            style={[
              styles.compactHeader,
              { backgroundColor: colors.background, borderBottomColor: colors.gray100 },
              compactHeaderStyle,
            ]}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.compactLogo}
              contentFit="contain"
              cachePolicy="memory"
            />
            <TouchableOpacity
              style={[
                styles.compactSearchBar,
                { backgroundColor: colors.surface, borderColor: colors.gray200 },
              ]}
              onPress={() => activateSearch()}
              activeOpacity={0.7}
              accessibilityRole="search"
              accessibilityLabel="Rechercher des evenements"
            >
              <Ionicons name="search" size={18} color={colors.primary} />
              <Text
                style={[styles.compactSearchText, { color: colors.gray400 }]}
                numberOfLines={1}
              >
                {placeholderSuggestions[placeholderIndex]}
              </Text>
            </TouchableOpacity>
            <View style={styles.compactActions}>
              <TouchableOpacity
                style={[styles.compactBtn, { backgroundColor: colors.gray50 }]}
                onPress={goToMessages}
                accessibilityRole="button"
                accessibilityLabel="Messages"
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.gray800} />
                {unreadMessageCount > 0 && (
                  <View style={[styles.compactBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.compactBadgeText}>
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactBtn, { backgroundColor: colors.gray50 }]}
                onPress={goToNotifications}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={18} color={colors.gray800} />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.compactBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.compactBadgeText}>
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
            {/* Inline expanded header (scrolls with content) */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.headerEyebrow, { color: colors.gray400 }]}>Localisation</Text>
                <View style={styles.headerLocationRow}>
                  <Text style={[styles.headerLocationBig, { color: colors.gray900 }]}>
                    Douala, CMR
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </View>
              </View>
              <View style={styles.headerActions}>
                {user?.role === 'organizer' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('EventCreate' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Creer un evenement"
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.headerBtnCreate}
                    >
                      <Ionicons name="add" size={22} color={Colors.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.headerBtn, { backgroundColor: colors.gray50 }]}
                  onPress={goToMessages}
                  accessibilityRole="button"
                  accessibilityLabel="Messages"
                >
                  <Ionicons name="chatbubble-outline" size={20} color={colors.gray800} />
                  {unreadMessageCount > 0 && (
                    <PulsingBadge active={unreadMessageCount > 0} style={styles.badgeWrapper}>
                      <View style={[styles.badge, { backgroundColor: colors.error }]}>
                        <Text style={styles.badgeText}>
                          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </Text>
                      </View>
                    </PulsingBadge>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerBtn, { backgroundColor: colors.gray50 }]}
                  onPress={goToNotifications}
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.gray800} />
                  {unreadNotificationCount > 0 && (
                    <PulsingBadge active={unreadNotificationCount > 0} style={styles.badgeWrapper}>
                      <View style={[styles.badge, { backgroundColor: colors.error }]}>
                        <Text style={styles.badgeText}>
                          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </Text>
                      </View>
                    </PulsingBadge>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search bar trigger (ouvre SearchScreen) */}
            <View
              style={[
                styles.searchBarTrigger,
                { backgroundColor: colors.surface, borderColor: colors.gray200 },
              ]}
            >
              <TouchableOpacity
                style={styles.searchBarBody}
                onPress={() => activateSearch()}
                activeOpacity={0.7}
                accessibilityRole="search"
                accessibilityLabel="Rechercher des evenements"
              >
                <Ionicons name="search-outline" size={20} color={colors.gray500} />
                <Text style={[styles.searchPlaceholder, { color: colors.gray400 }]}>
                  {placeholderSuggestions[placeholderIndex]}
                </Text>
              </TouchableOpacity>
              <View style={[styles.searchDivider, { backgroundColor: colors.gray200 }]} />
              <TouchableOpacity
                style={styles.searchFilterBtn}
                onPress={() => activateSearch()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Filtres avances"
              >
                <Ionicons name="options-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Category Chips (rapide) */}
            {categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.discoverChips}
              >
                <TouchableOpacity
                  style={[styles.discoverChipAll, { backgroundColor: colors.gray900 }]}
                  onPress={() => activateSearch()}
                  accessibilityRole="button"
                  accessibilityLabel="Tout explorer"
                >
                  <Text
                    style={[styles.discoverChipAllText, { color: colors.background }]}
                  >
                    Tout
                  </Text>
                </TouchableOpacity>
                {categories.slice(0, 8).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.discoverChip,
                      { backgroundColor: colors.surface, borderColor: colors.gray200 },
                    ]}
                    onPress={() => activateSearch(cat.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Categorie ${cat.name}`}
                  >
                    <Text style={[styles.discoverChipText, { color: colors.gray700 }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Featured Events — Hero Carousel */}
            {featuredEvents.length > 0 && (
              <SectionEntrance delay={300}>
                <View style={styles.section}>
                  <SectionHeader title="À la une" onSeeAll={() => activateSearch()} />
                  <FlatList
                    horizontal
                    data={featuredEvents}
                    renderItem={({ item, index }) => (
                      <View
                        style={[
                          styles.featuredCardWrap,
                          index === 0 && { marginLeft: Spacing.lg },
                        ]}
                      >
                        {renderEventCard(item, 'featured')}
                      </View>
                    )}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: Spacing.lg }}
                    snapToInterval={SCREEN_WIDTH * 0.88 + Spacing.md}
                    decelerationRate="fast"
                    removeClippedSubviews
                    initialNumToRender={2}
                    windowSize={3}
                  />
                </View>
              </SectionEntrance>
            )}

            {/* Nearby Events */}
            {nearbyEvents.length > 0 && (
              <SectionEntrance delay={400}>
                <View style={styles.section}>
                  <SectionHeader title="Populaire près de toi" onSeeAll={() => activateSearch()} />
                  <FlatList
                    horizontal
                    data={nearbyEvents}
                    renderItem={({ item, index }) => (
                      <View
                        style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}
                      >
                        {renderEventCard(item, 'default')}
                      </View>
                    )}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: Spacing.lg }}
                    removeClippedSubviews
                    initialNumToRender={3}
                    windowSize={5}
                  />
                </View>
              </SectionEntrance>
            )}

            {/* Recommendations (user connecte) / Login CTA (invite) */}
            {user && recommendations.length > 0 ? (
              <SectionEntrance delay={500}>
                <View style={styles.section}>
                  <SectionHeader title="Recommandé pour toi" onSeeAll={() => activateSearch()} />
                  <FlatList
                    horizontal
                    data={recommendations}
                    renderItem={({ item, index }) => (
                      <View
                        style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}
                      >
                        {renderEventCard(item, 'default')}
                      </View>
                    )}
                    keyExtractor={(item) => `rec-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: Spacing.lg }}
                    removeClippedSubviews
                    initialNumToRender={3}
                    windowSize={5}
                  />
                </View>
              </SectionEntrance>
            ) : null}
            {!user && (
              <SectionEntrance delay={500}>
                <View style={[styles.section, { paddingHorizontal: Spacing.lg }]}>
                  <TouchableOpacity
                    style={[
                      styles.loginCta,
                      { backgroundColor: colors.surface, borderColor: colors.primary },
                    ]}
                    onPress={() => navigation.navigate('Login' as any)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="sparkles" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={[styles.loginCtaTitle, { color: colors.gray900 }]}>
                        Recommandations personnalisées
                      </Text>
                      <Text style={[styles.loginCtaSubtitle, { color: colors.gray500 }]}>
                        Connectez-vous pour découvrir des événements adaptés à vos goûts
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </SectionEntrance>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <SectionEntrance delay={600}>
                <View style={styles.section}>
                  <SectionHeader title="À venir" onSeeAll={() => activateSearch()} />
                  <FlatList
                    horizontal
                    data={upcomingEvents.slice(0, 6)}
                    renderItem={({ item, index }) => (
                      <View
                        style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}
                      >
                        {renderEventCard(item, 'default')}
                      </View>
                    )}
                    keyExtractor={(item) => `wk-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: Spacing.lg }}
                    removeClippedSubviews
                    initialNumToRender={3}
                    windowSize={5}
                  />
                </View>
              </SectionEntrance>
            )}

            {/* Free Events */}
            {freeEvents.length > 0 && (
              <SectionEntrance delay={700}>
                <View style={styles.section}>
                  <SectionHeader title="Gratuit" onSeeAll={() => activateSearch()} />
                  <FlatList
                    horizontal
                    data={freeEvents.slice(0, 6)}
                    renderItem={({ item, index }) => (
                      <View
                        style={[styles.cardWrap, index === 0 && { marginLeft: Spacing.lg }]}
                      >
                        {renderEventCard(item, 'default')}
                      </View>
                    )}
                    keyExtractor={(item) => `free-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: Spacing.lg }}
                    removeClippedSubviews
                    initialNumToRender={3}
                    windowSize={5}
                  />
                </View>
              </SectionEntrance>
            )}

            {/* Categories grid */}
            {categories.length > 0 && (
              <SectionEntrance delay={800}>
                <View style={styles.section}>
                  <SectionHeader title="Explorer par catégorie" />
                  <FlatList
                    horizontal
                    data={categories}
                    renderItem={({ item, index }) => (
                      <View
                        style={[styles.categoryWrap, index === 0 && { marginLeft: Spacing.lg }]}
                      >
                        <CategoryCard
                          id={item.id.toString()}
                          name={item.name}
                          image={item.image}
                          eventCount={item.event_count || item.events_count}
                          variant="large"
                          onPress={() => activateSearch(item.id)}
                        />
                      </View>
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: Spacing.lg }}
                    removeClippedSubviews
                    initialNumToRender={3}
                    windowSize={5}
                  />
                </View>
              </SectionEntrance>
            )}

            <View style={{ height: 120 }} />
          </Animated.ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// === STYLES ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  // === HEADER ===
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerEyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLocationBig: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnCreate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.coloredPrimary,
  },
  badgeWrapper: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },

  // === COMPACT HEADER (on scroll) ===
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Shadows.header,
  },
  compactLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  compactSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
  },
  compactSearchText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  compactBadgeText: {
    fontSize: 8,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },

  // === SEARCH BAR TRIGGER (discovery, ouvre SearchScreen) ===
  searchBarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingLeft: Spacing.base,
    paddingRight: 6,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    height: 52,
    ...Shadows.xs,
  },
  searchBarBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  searchDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: Spacing.sm,
  },
  searchFilterBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    ...TextStyles.body,
    flex: 1,
  },

  // === DISCOVER CHIPS ===
  discoverChips: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: 8,
  },
  discoverChipAll: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 38,
    borderRadius: BorderRadius.full,
    marginRight: 8,
  },
  discoverChipAllText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    letterSpacing: 0.2,
  },
  discoverChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  discoverChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },

  // === SECTIONS ===
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionAccentLine: {
    width: 4,
    height: 22,
    borderRadius: 2,
  },
  sectionTitle: {
    ...TextStyles.h2,
    fontFamily: FontFamily.displayExtraBold,
  },
  seeAllText: {
    ...TextStyles.smallBold,
  },

  // === CARD WRAPPERS ===
  featuredCardWrap: {
    marginRight: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardWrap: {
    marginRight: Spacing.md,
    marginBottom: Spacing.lg,
  },
  categoryWrap: {
    marginRight: Spacing.md,
  },

  // === LOGIN CTA ===
  loginCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  loginCtaTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    marginBottom: 2,
  },
  loginCtaSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
  },
});
