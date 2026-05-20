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
  Share,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
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
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { useTranslation } from 'react-i18next';
import EventCoverMedia from '../../components/events/EventCoverMedia';
import { eventsAPI, categoriesAPI, recommendationsAPI, advertisementsAPI, getMediaUrl } from '../../api';
import type { AdvertisementPublic } from '../../api';
import { Event, Category, RootStackParamList, MainTabParamList } from '../../types';
import AdvertisementCard from '../../components/common/AdvertisementCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TourTarget,
  useTour,
  getDiscoverTourSteps,
  DISCOVER_TOUR_STORAGE_KEY,
  DISCOVER_TOUR_DELAY_MS,
  MAIN_TABS_TOUR_STORAGE_KEY,
} from '../../components/tour';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnreadCounts } from '../../contexts/NotificationContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { useNetworkSpeed } from '../../hooks/useNetworkSpeed';
import CacheService from '../../services/CacheService';
import { DiscoverScreenSkeleton } from '../../components/ui/Skeleton';
import { SectionEntrance, StaggeredItem, PulsingBadge } from '../../components/ui/Animations';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DISCOVER_CACHE_TTL = 5 * 60 * 1000;
const HEADER_SCROLL_THRESHOLD = 80;

// Warm editorial canvas (light mode) — same language as MyTicketsScreen
const CANVAS_LIGHT = '#F6F6F9';

// === Date helpers ===
const MONTHS_FR = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUI', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

// Longueur estimée d'une nearbyCard (largeur 220 + gap horizontal)
const NEARBY_ITEM_LENGTH = 280;
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

// ============================================================================
// NetworkStatusPill — overlay flottant non-intrusif (offline / slow).
// Centre horizontalement, ancre en haut sous le header. Slide-in/out via
// Reanimated. Pointer-events: none → ne bloque pas les taps en dessous.
// ============================================================================
function NetworkStatusPill({ isOffline, isSlow }: { isOffline: boolean; isSlow: boolean }) {
  const { t } = useTranslation();
  const visible = isOffline || isSlow;
  if (!visible) return null;

  // Palette : offline = rouge sombre (etat critique), slow = ambre
  const isCritical = isOffline;
  const bg = isCritical ? '#1F1F1F' : '#1F1F1F';
  const accent = isCritical ? '#F87171' : '#FBBF24';
  const label = isCritical ? t('discover.offline') : t('discover.slowConnection');
  const iconName = isCritical ? 'cloud-offline' : 'cellular-outline';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(220).springify().damping(18)}
        exiting={FadeOutUp.duration(180)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: BorderRadius.full,
          backgroundColor: bg,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: accent,
          }}
        />
        <Ionicons name={iconName} size={12} color={accent} />
        <Text
          style={{
            fontFamily: FontFamily.bold,
            fontSize: 11,
            letterSpacing: 0.3,
            color: '#FFFFFF',
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Discover'>>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { currency: platformCurrency } = useCommissionConfig();
  const { unreadNotificationCount } = useUnreadCounts();
  const { isSlowCellular, isOffline } = useNetworkSpeed();
  const tour = useTour();

  // === State ===
  const [initialLoading, setInitialLoading] = useState(true);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [freeEvents, setFreeEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // === Ads (géo-ciblées admin/modérateur) ===
  const [ads, setAds] = useState<AdvertisementPublic[]>([]);

  // === Viewport tracking pour autoplay video sur cards visibles ===
  const visibleIdsRef = React.useRef<Set<string>>(new Set());
  const [visibleVersion, setVisibleVersion] = useState(0);
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const next = new Set<string>(viewableItems.map((v) => String(v.item?.id)).filter(Boolean));
    visibleIdsRef.current = next;
    setVisibleVersion((v) => v + 1);
  }).current;

  // Discover mini-tour — fires after main-tabs-tour AND once initial data has
  // loaded (both targets are inside `{!initialLoading && ...}`; the categories
  // chip is additionally gated on `categories.length > 0`).
  useFocusEffect(useCallback(() => {
    if (initialLoading || categories.length === 0) return;
    const timer = setTimeout(async () => {
      if (tour.isActive) return;
      try {
        const mainSeen = await AsyncStorage.getItem(MAIN_TABS_TOUR_STORAGE_KEY);
        if (mainSeen !== 'true') return;
        tour.start(getDiscoverTourSteps(t), { seenKey: DISCOVER_TOUR_STORAGE_KEY });
      } catch {
        // Non-fatal — silent skip
      }
    }, DISCOVER_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading, categories.length]));

  // === "Pour vous" : section paginée infinite-scroll en bas du feed ===
  // Distincte de `recommendations` (top, limit=10) — celle-ci pagine sans
  // limite, prend le relai quand l'user scrolle pour explorer.
  const [forYouEvents, setForYouEvents] = useState<Event[]>([]);
  const [forYouPage, setForYouPage] = useState(1);
  const [forYouHasMore, setForYouHasMore] = useState(true);
  const [forYouLoading, setForYouLoading] = useState(false);
  // Refs pour éviter les double-fetch en course de scroll fast
  const forYouLoadingRef = React.useRef(false);
  const forYouHasMoreRef = React.useRef(true);
  const forYouPageRef = React.useRef(1);
  forYouLoadingRef.current = forYouLoading;
  forYouHasMoreRef.current = forYouHasMore;
  forYouPageRef.current = forYouPage;
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  // 'idle' = pas demandé, 'requesting' = en cours, 'granted'/'denied' = état final
  const [locationPermStatus, setLocationPermStatus] = useState<
    'idle' | 'requesting' | 'granted' | 'denied'
  >('idle');
  // Track fetch failures so we can surface a banner instead of failing silently
  const [fetchErrorCount, setFetchErrorCount] = useState(0);
  // Bannière dismissable manuellement par l'utilisateur. On la re-montre
  // automatiquement si fetchErrorCount remonte à 2+ après un retry échoué.
  const [slowBannerDismissed, setSlowBannerDismissed] = useState(false);

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
      t('discover.searchPh1'),
      t('discover.searchPh2'),
      t('discover.searchPh3'),
      t('discover.searchPh4'),
      t('discover.searchPh5'),
    ],
    [t],
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

      // Quand la geoloc est dispo, on transmet lat/lng au backend qui prioritise
      // la proximité dans le tri (sans filtrer par radius — on veut voir tout,
      // juste mieux trié). Le backend filtre déjà les events passés via
      // end_date < now, donc plus besoin de isEventInFuture côté client (qui
      // était même bugué : utilisait start_date, masquant les events multi-jours
      // en cours).
      const geoParams = location ? { lat: location.lat, lng: location.lng } : {};

      // Pour "upcoming" et "free", on ne passe PAS ordering=start_date quand
      // on a une geoloc, sinon le tri par date overwrite la proximité. Sans
      // geoloc, on garde le tri date asc historique.
      const upcomingParams = location
        ? { limit: 15, status: 'validated', ...geoParams }
        : { ordering: 'start_date', limit: 15, status: 'validated' };
      const freeParams = location
        ? { price: 'free', limit: 10, status: 'validated', ...geoParams }
        : { price: 'free', ordering: 'start_date', limit: 10, status: 'validated' };

      const fetches = [
        eventsAPI
          .getFeaturedEvents(geoParams)
          .then((res) => {
            const data = getApiResults<Event>(res);
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
          .getEvents(upcomingParams)
          .then((res) => {
            const data = getApiResults<Event>(res);
            setUpcomingEvents(data);
            CacheService.set('discover:upcoming', data, DISCOVER_CACHE_TTL);
          })
          .catch(trackFailure('upcoming')),

        eventsAPI
          .getEvents(freeParams)
          .then((res) => {
            const data = getApiResults<Event>(res);
            setFreeEvents(data);
            CacheService.set('discover:free', data, DISCOVER_CACHE_TTL);
          })
          .catch(trackFailure('free')),
      ];

      await Promise.all(fetches);
      // Update banner state once all fetches settle
      setFetchErrorCount(failures);
      // Si le retry a reussi : reinitialiser le dismiss pour les prochaines pannes
      if (failures < 2) {
        setSlowBannerDismissed(false);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement:', error);
      setFetchErrorCount((c) => c + 1);
      setInitialLoading(false);
    }
  }, [location]);

  const fetchRecommendations = useCallback(
    async (bypassCache: boolean = false) => {
      if (!user) return;
      try {
        if (!bypassCache) {
          const cached = await CacheService.get<Event[]>('discover:recommendations');
          if (cached) setRecommendations(cached.data);
        }
        const response = await recommendationsAPI.getRecommendations({ limit: 10 });
        // Backend filtre déjà les events passés ; pas de re-filtre côté client.
        const data = getApiResults<Event>(response);
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
      // Endpoint /events/nearby/ filtre déjà start_date >= now côté backend.
      setNearbyEvents(getApiResults<Event>(response));
    } catch (error) {
      if (__DEV__) console.error('[Discover] Erreur evenements proches:', error);
    }
  }, [location]);

  // === Ads (géo-ciblées) — fetch dès qu'on a la geo (loose : ne bloque pas
  // sans geo, le backend renverra les pubs sans contrainte). ===
  const fetchAds = useCallback(async () => {
    try {
      const params: { country?: string; city?: string; lat?: number; lng?: number } = {};
      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
      }
      // Le backend matche aussi via city/country quand fourni, mais on n'a
      // pas ces données côté mobile sans reverse-geocoding — on s'appuie sur
      // les coords pour le radius matching.
      const response = await advertisementsAPI.getNearby(params);
      setAds(response.data?.results || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur publicités:', error);
    }
  }, [location]);

  // === Pagination "Pour vous" — events infinis en bas du feed ===
  // Pour les users authentifiés : recommandations personnalisées via
  // `/recommendations/?limit=&offset=`, format `{ recommendations: [{event,score}], has_more }`.
  // Pour les guests : fallback `eventsAPI.getEvents` ordonné par date pour
  // qu'ils aient quand même du contenu à scroller (nudge inscription au tap).
  const PAGE_SIZE = 8;
  const loadMoreForYou = useCallback(
    async (reset: boolean = false) => {
      if (forYouLoadingRef.current) return;
      if (!reset && !forYouHasMoreRef.current) return;

      const nextPage = reset ? 1 : forYouPageRef.current + 1;
      const offset = (nextPage - 1) * PAGE_SIZE;
      setForYouLoading(true);
      try {
        let data: Event[];
        let hasMoreFlag: boolean | undefined;

        if (user) {
          // Authentifié : recos personnalisées
          const response = await recommendationsAPI.getRecommendations({
            limit: PAGE_SIZE,
            offset,
          } as any);
          // Forme principale : { recommendations: [{event, score}] }
          // Fallback : { results: [...] } ou array direct (compat futur)
          const raw = (response.data as any)?.recommendations
            || (response.data as any)?.results
            || (Array.isArray(response.data) ? response.data : []);
          const events: Event[] = Array.isArray(raw)
            ? raw.map((r: any) => (r?.event ?? r) as Event).filter(Boolean)
            : [];
          // Backend filtre déjà les events passés (end_date < now), pas besoin
          // de re-filtrer côté client.
          data = events;
          hasMoreFlag = (response.data as any)?.has_more;
        } else {
          // Guest : events à venir paginés (DRF page-based).
          // Si geoloc dispo : on retire ordering=start_date pour laisser le
          // backend prioriser la proximité.
          const guestParams: any = {
            page: nextPage,
            page_size: PAGE_SIZE,
            status: 'validated',
          };
          if (location) {
            guestParams.lat = location.lat;
            guestParams.lng = location.lng;
          } else {
            guestParams.ordering = 'start_date';
          }
          const response = await eventsAPI.getEvents(guestParams);
          data = getApiResults<Event>(response);
          hasMoreFlag = (response.data as any)?.next != null;
        }

        setForYouEvents((prev) => {
          if (reset) return data;
          const existing = new Set(prev.map((e) => e.id));
          return [...prev, ...data.filter((e) => !existing.has(e.id))];
        });
        setForYouPage(nextPage);
        const hasNext = typeof hasMoreFlag === 'boolean'
          ? hasMoreFlag
          : data.length === PAGE_SIZE;
        setForYouHasMore(hasNext);
      } catch (error) {
        if (__DEV__) console.error('Erreur loadmore for-you:', error);
        setForYouHasMore(false);
      } finally {
        setForYouLoading(false);
      }
    },
    [user, location],
  );

  // Détection scroll-to-end pour infinite scroll. On utilise onMomentumScrollEnd
  // (déclenché quand le scroll ralentit/s'arrête) plutôt que onScroll continu :
  // évite les double-fetch quand le user scrolle vite, et économise le worklet.
  const handleScrollEnd = useCallback(
    (e: any) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      // Trigger 600px avant le bas pour préfetcher la prochaine page
      if (distanceFromBottom < 600) {
        loadMoreForYou();
      }
    },
    [loadMoreForYou],
  );

  // Acquisition robuste d'une position. getCurrentPositionAsync({}) seul est
  // peu fiable (GPS froid → peut hang ou échouer). On tente d'abord le dernier
  // fix connu (instantané), puis un fix frais avec une précision raisonnable
  // et un timeout. Retourne null si rien n'est obtenu.
  const acquirePosition = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        return { lat: last.coords.latitude, lng: last.coords.longitude };
      }
    } catch { /* ignore — on tente le fix frais */ }
    try {
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
    } catch (error) {
      if (__DEV__) console.warn('[Discover] getCurrentPositionAsync failed:', error);
      return null;
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setLocationPermStatus('requesting');
    try {
      // Vérifier d'abord si la perm est déjà accordée (pas de prompt si oui)
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
      }
      if (status === 'granted') {
        const coords = await acquirePosition();
        if (coords) setLocation(coords);
        // Perm accordée même si le fix GPS échoue — le retry au pull-to-refresh
        // re-tentera acquirePosition().
        setLocationPermStatus('granted');
      } else {
        setLocationPermStatus('denied');
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur localisation:', error);
      setLocationPermStatus('denied');
    }
  }, [acquirePosition]);

  // Hydrate l'état de perm au mount (sans déclencher le prompt système)
  const checkLocationPermSilent = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermStatus('granted');
        const coords = await acquirePosition();
        if (coords) setLocation(coords);
      } else if (status === 'denied') {
        setLocationPermStatus('denied');
      }
      // sinon 'undetermined' → on garde 'idle' pour afficher la card
    } catch {
      // ignore
    }
  }, [acquirePosition]);

  // === Effects ===
  useEffect(() => {
    fetchDiscoveryData();
    const task = InteractionManager.runAfterInteractions(() => {
      fetchRecommendations();
      // Vérifier la perm sans la demander — la card explicative gère le prompt
      checkLocationPermSilent();
      // Premier batch "Pour vous" (page 1) + ads sans contrainte géo. Si la
      // location arrive plus tard, l'effect dédié `[location]` re-fetchera.
      fetchAds();
      loadMoreForYou(true);
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
    if (location) {
      fetchNearbyEvents();
      // Re-fetch ads avec coords précises (radius matching)
      fetchAds();
      // Re-fetch discovery (featured/upcoming/free) avec lat/lng pour que
      // le backend trie par proximité — l'initial fetch s'est fait sans geoloc.
      // bypassCache=true pour ne pas afficher les anciens résultats triés par récence.
      fetchDiscoveryData(true);
      // "Pour vous" guest aussi : page 1 paginée par proximité backend.
      if (!user) {
        loadMoreForYou(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // === Handlers ===
  const onRefresh = async () => {
    setRefreshing(true);
    // Si la permission est accordée mais qu'on n'a pas (encore) de position
    // — fix GPS qui avait échoué au mount — on retente d'en acquérir une.
    // setLocation déclenchera l'effect [location] qui chargera "près de toi".
    if (!location && locationPermStatus === 'granted') {
      const coords = await acquirePosition();
      if (coords) setLocation(coords);
    }
    await Promise.all([
      fetchDiscoveryData(true),
      fetchRecommendations(true),
      location ? fetchNearbyEvents() : Promise.resolve(),
      fetchAds(),
      loadMoreForYou(true),
    ]);
    setRefreshing(false);
  };
  const activateSearch = (categoryId?: number) => {
    navigation.navigate('EventSearch', categoryId ? { category: categoryId } : undefined);
  };
  const navigateToEvent = (eventId: string, imageUrl?: string) => {
    navigation.navigate('EventDetails', { eventId, imageUrl });
  };
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
          <Text style={[styles.seeAllText, { color: colors.gray700 }]}>{t('common.seeAll')}</Text>
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
      <AnimatedPressable
        animationType="shadow"
        onPress={() => navigateToEvent(ev.id, img)}
        style={[
          styles.heroCard,
          styles.shadowBase,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
          },
        ]}
      >
        <View style={styles.heroImageWrap}>
          <EventCoverMedia
            event={ev}
            mode="hero"
            shouldPlay
            style={styles.heroImage}
            fallbackImageUri={img}
            fallbackPlaceholder={ph}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Eyebrow pill top-left */}
          <View style={[styles.heroEyebrowPill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Ionicons name="star" size={11} color={colors.accent} />
            {/* Texte sur fond blanc fixe → couleur ink statique (Colors.gray900),
                NE PAS utiliser colors.text qui s'inverse en dark mode */}
            <Text style={[styles.heroEyebrowText, { color: Colors.gray900 }]}>{t('discover.featured')}</Text>
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
                {ev.location_city || ev.location_address || t('discover.placeIfPlaceMissing')}
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
                ? t('common.free')
                : range?.min
                ? `${range.min} ${ev.currency || platformCurrency || ''}`
                : t('discover.viewAction')}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
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
        <AnimatedPressable
          animationType="shadow"
          onPress={() => navigateToEvent(item.id, img)}
          style={[
            styles.nearbyCard,
            styles.shadowBase,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
            },
          ]}
        >
          <View style={styles.nearbyImageWrap}>
            <EventCoverMedia
              event={item}
              mode="card"
              shouldPlay={visibleIdsRef.current.has(item.id)}
              style={styles.nearbyImage}
              fallbackImageUri={img}
              fallbackPlaceholder={ph}
            />
            <View
              style={[
                styles.nearbyDateTile,
                { backgroundColor: 'rgba(255,255,255,0.95)' },
              ]}
            >
              <Text style={[styles.nearbyDateDay, { color: colors.accent }]}>{day}</Text>
              <Text style={[styles.nearbyDateMonth, { color: colors.accent }]}>{month}</Text>
            </View>
            {/* Price pill — coin haut-droit. Toujours visible : "GRATUIT" tinte
                primary pour les events gratuits, prix sur fond blanc pour payants. */}
            <View
              style={[
                styles.nearbyPricePill,
                isFree
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: 'rgba(255,255,255,0.95)' },
              ]}
            >
              <Text
                style={[
                  styles.nearbyPricePillText,
                  { color: isFree ? Colors.white : Colors.gray900 },
                ]}
                numberOfLines={1}
              >
                {isFree
                  ? 'GRATUIT'
                  : range?.min
                  ? `${range.min} ${item.currency || platformCurrency || ''}`
                  : 'PAYANT'}
              </Text>
            </View>
          </View>
          <View style={styles.nearbyBody}>
            {item.category?.name && (
              <View style={[styles.nearbyEyebrowPill, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
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
                {item.location_city || t('discover.placeShortIfMissing')}
              </Text>
            </View>
          </View>
        </AnimatedPressable>
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
              <AnimatedPressable
                animationType="shadow"
                onPress={() => navigateToEvent(ev.id, eventImage(ev))}
                style={[
                  styles.incomingCard,
                  styles.shadowBase,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                  },
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
                    <View style={[styles.incomingEyebrowPill, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
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
                      {ev.location_city || t('discover.placeShortIfMissing')}
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
              </AnimatedPressable>
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
                    placeholderContentFit="cover"
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
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t('discover.freeEyebrow')}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('discover.freeTitle')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => activateSearch()}
            activeOpacity={TOUCH_OPACITY}
            style={[styles.seeAllBtn, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('common.seeAll')}</Text>
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
              <AnimatedPressable
                animationType="shadow"
                onPress={() => navigateToEvent(item.id, img)}
                style={[
                  styles.freeCard,
                  styles.shadowBase,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                  },
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
                    <Text style={[styles.freeBadgeText, { color: colors.primary }]}>{t('discover.freeBadge')}</Text>
                  </View>
                  <Text style={[styles.freeTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.freeVenue, { color: colors.gray500 }]} numberOfLines={1}>
                    {item.location_city || t('discover.placeShortIfMissing')}
                  </Text>
                </View>
              </AnimatedPressable>
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
      <AnimatedPressable
        animationType="shadow"
        onPress={() => navigateToEvent(ev.id, img)}
        style={[
          styles.recCard,
          styles.shadowBase,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
          },
        ]}
      >
        <View style={styles.recImageWrap}>
          <EventCoverMedia
            event={ev}
            mode="hero"
            shouldPlay
            style={styles.recImage}
            fallbackImageUri={img}
            fallbackPlaceholder={ph}
          />
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
                {ev.location_city || t('discover.placeShortIfMissing')}
              </Text>
            </View>
          </View>
          <View
            style={[styles.recArrow, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  // === MAIN RENDER ===
  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>EZ</WatermarkNumeral>
      <View style={styles.safeArea}>
        {/* === FLOATING NETWORK PILL ===
            Overlay non-intrusif positionne en haut, anime via Reanimated.
            Auto-dismiss quand la connexion est restauree. */}
        <NetworkStatusPill isOffline={isOffline} isSlow={isSlowCellular} />

        {initialLoading ? (
          <DiscoverScreenSkeleton />
        ) : (
          <View style={{ flex: 1 }}>
            {/* === COMPACT HEADER (on scroll) — 2 lignes : search + chips === */}
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
              <View style={styles.compactHeaderTopRow}>
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
                  accessibilityLabel={
                    unreadNotificationCount > 0
                      ? `${t('notifications.title')}, ${unreadNotificationCount}`
                      : t('notifications.title')
                  }
                >
                  <Ionicons name="notifications-outline" size={18} color={colors.gray600} />
                  {unreadNotificationCount > 0 && (
                    <View
                      style={[
                        styles.compactBtnBadge,
                        { backgroundColor: colors.accent, borderColor: colors.gray100 },
                      ]}
                    >
                      <Text style={styles.compactBtnBadgeText}>
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Sticky category chips — same as in the editorial header above the feed */}
              {categories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.compactChipsRow}
                >
                  <TouchableOpacity
                    style={[styles.compactChip, { backgroundColor: colors.primary }]}
                    onPress={() => activateSearch()}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="flash" size={11} color={Colors.white} />
                    <Text style={[styles.compactChipText, { color: Colors.white }]}>{t('common.all')}</Text>
                  </TouchableOpacity>
                  {categories.slice(0, 8).map((cat) => (
                    <TouchableOpacity
                      key={`compact-cat-${cat.id}`}
                      style={[styles.compactChip, { backgroundColor: colors.gray100 }]}
                      onPress={() => activateSearch(Number(cat.id))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.compactChipText, { color: colors.gray600 }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </Animated.View>

            {/* === FEED === */}
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              onMomentumScrollEnd={handleScrollEnd}
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
                        return city
                          ? t('discover.headerCityWithName', { city: city.toUpperCase() })
                          : t('discover.headerCityPrefix');
                      })()}
                    </Text>
                    <View style={styles.headerTitleRow}>
                      <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {t('discover.headerTitle')}
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
                        accessibilityLabel={t('discover.createEvent')}
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
                    {/* Messages : retiré du header — déjà accessible via l'onglet
                        "Messages" de la bottom nav. Évite la duplication d'entrée. */}
                    <TouchableOpacity
                      style={[styles.headerBtn, { backgroundColor: colors.gray100 }]}
                      onPress={goToNotifications}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={
                        unreadNotificationCount > 0
                          ? `${t('notifications.title')}, ${unreadNotificationCount}`
                          : t('notifications.title')
                      }
                    >
                      <Ionicons name="notifications-outline" size={18} color={colors.gray600} />
                      {unreadNotificationCount > 0 && (
                        <PulsingBadge active style={styles.headerBadgeWrap}>
                          <View
                            style={[
                              styles.headerBtnBadge,
                              { backgroundColor: colors.accent, borderColor: colors.gray100 },
                            ]}
                          >
                            <Text style={styles.headerBtnBadgeText}>
                              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                            </Text>
                          </View>
                        </PulsingBadge>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* === SEARCH PILL (Option A) — simple, calme, captante via le
                    placeholder rotatif qui change toutes les 3s. */}
                <TourTarget id="discover-search">
                  <TouchableOpacity
                    style={[
                      styles.searchTrigger,
                      {
                        backgroundColor: isDark ? colors.gray100 : '#F2F1ED',
                        borderColor: isDark ? colors.gray200 : 'rgba(17,17,16,0.05)',
                      },
                    ]}
                    onPress={() => activateSearch()}
                    activeOpacity={0.85}
                    accessibilityRole="search"
                    accessibilityLabel={t('discover.searchAccessibility')}
                  >
                    <Ionicons
                      name="search"
                      size={18}
                      color={isDark ? colors.gray400 : colors.gray500}
                    />
                    <Text
                      style={[
                        styles.searchTriggerText,
                        { color: isDark ? colors.gray300 : colors.gray600 },
                      ]}
                      numberOfLines={1}
                    >
                      {placeholderSuggestions[placeholderIndex]}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={isDark ? colors.gray400 : colors.gray400}
                    />
                  </TouchableOpacity>
                </TourTarget>

                {/* Category chips row */}
                {categories.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    <TourTarget id="discover-categories">
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          { backgroundColor: colors.primary, ...Shadows.buttonPrimary },
                        ]}
                        onPress={() => activateSearch()}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="flash" size={13} color={Colors.white} />
                        <Text style={[styles.chipText, { color: Colors.white }]}>{t('common.all')}</Text>
                      </TouchableOpacity>
                    </TourTarget>
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

              {/* === ADS — haut du feed === */}
              {ads.filter((a) => a.placement === 'feed_top').map((ad) => (
                <View key={ad.id} style={{ paddingHorizontal: Spacing.lg }}>
                  <AdvertisementCard ad={ad} />
                </View>
              ))}

              {/* Le banner réseau (offline / slow) est rendu en overlay flottant
                  au niveau du root (NetworkStatusPill) pour éviter de pousser
                  le contenu et garder le feed propre. */}

              {/* === FETCH-FAILURE BANNER (>= 2 fetches failed; dismissable) === */}
              {fetchErrorCount >= 2 && !slowBannerDismissed && (
                <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.sm,
                      padding: Spacing.sm + 2,
                      borderRadius: BorderRadius.lg,
                      backgroundColor: `${colors.warning}15`,
                      borderWidth: 1,
                      borderColor: `${colors.warning}40`,
                    }}
                  >
                    <Ionicons name="cloud-offline" size={16} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: FontFamily.bold,
                          fontSize: 12,
                          color: colors.warning,
                        }}
                      >
                        Connexion lente
                      </Text>
                      <Text
                        style={{
                          fontFamily: FontFamily.regular,
                          fontSize: 11,
                          color: colors.gray600,
                          marginTop: 1,
                          lineHeight: 15,
                        }}
                      >
                        Certaines sections n'ont pas pu se charger.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={onRefresh}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={t('discover.retry')}
                      style={{
                        padding: 6,
                        borderRadius: BorderRadius.full,
                        backgroundColor: `${colors.warning}25`,
                      }}
                    >
                      <Ionicons name="refresh" size={14} color={colors.warning} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSlowBannerDismissed(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={t('discover.hide')}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close" size={16} color={colors.gray500} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* === HERO === */}
              {featuredEvents[0] && (
                <SectionEntrance delay={200}>
                  <View style={styles.heroWrap}>{renderHero(featuredEvents[0])}</View>
                </SectionEntrance>
              )}

              {/* === LOCATION PERMISSION CARD — pre-perm rationale === */}
              {locationPermStatus === 'idle' && nearbyEvents.length === 0 && (
                <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg }}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={requestLocation}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.sm,
                        padding: Spacing.md,
                        borderRadius: 18,
                        backgroundColor: colors.card,
                        borderColor: isDark ? colors.gray200 : 'rgba(255,255,255,0.6)',
                        borderWidth: 1,
                      },
                      Shadows.sm,
                    ]}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: `${colors.primary}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="location" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
                        {t('discover.nearbyTeaserEyebrow')}
                      </Text>
                      <Text
                        style={{
                          fontFamily: FontFamily.displayBold,
                          fontSize: 14,
                          color: colors.text,
                          letterSpacing: -0.3,
                          marginTop: 2,
                        }}
                      >
                        {t('discover.nearbyTeaserTitle')}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: BorderRadius.full,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FontFamily.bold,
                          fontSize: 12,
                          color: '#fff',
                          letterSpacing: 0.3,
                        }}
                      >
                        {t('discover.nearbyTeaserCTA')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* === NEARBY === */}
              {nearbyEvents.length > 0 && (
                <SectionEntrance delay={300}>
                  <View style={styles.section}>
                    <SectionHeader
                      eyebrow={t('eyebrow.nearby')}
                      title={t('discover.popularNearbyTitle')}
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
                      maxToRenderPerBatch={6}
                      windowSize={5}
                      viewabilityConfig={viewabilityConfig}
                      onViewableItemsChanged={onViewableItemsChanged}
                      extraData={visibleVersion}
                      getItemLayout={(_, i) => ({ length: NEARBY_ITEM_LENGTH, offset: NEARBY_ITEM_LENGTH * i, index: i })}
                    />
                  </View>
                </SectionEntrance>
              )}

              {/* === RECOMMENDED rec card (user) === */}
              {user && recommendations.length > 0 && (
                <SectionEntrance delay={380}>
                  <View style={styles.section}>
                    <SectionHeader
                      eyebrow={t('eyebrow.forYou')}
                      title={t('discover.recommendedTitle')}
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
                      eyebrow={t('eyebrow.upcoming')}
                      title={t('discover.incomingTitle')}
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
                    <SectionHeader eyebrow={t('discover.allGenresEyebrow')} title={t('discover.allGenresTitle')} />
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

              {/* === ADS — bas du feed === */}
              {ads.filter((a) => a.placement === 'feed_bottom').map((ad) => (
                <View key={ad.id} style={{ paddingHorizontal: Spacing.lg }}>
                  <AdvertisementCard ad={ad} />
                </View>
              ))}

              {/* === POUR VOUS — feed social-style infini === */}
              {forYouEvents.length > 0 && (
                <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
                  <Text style={[styles.forYouEyebrow, { color: colors.accent }]}>
                    POUR VOUS · BASÉ SUR VOS GOÛTS
                  </Text>
                  <Text style={[styles.forYouTitle, { color: colors.text }]}>
                    Tu pourrais aussi aimer
                  </Text>
                  {forYouEvents.map((ev, idx) => {
                    const { day, month } = splitDate(ev.start_date);
                    const img = eventImage(ev);
                    const placeholder = eventPlaceholder(ev);
                    const orgName = (ev.organizer_name as string)
                      || (ev.organizer && typeof ev.organizer === 'object'
                        ? `${(ev.organizer as any).first_name || ''} ${(ev.organizer as any).last_name || ''}`.trim() || (ev.organizer as any).email
                        : 'Organisateur');
                    const orgInitial = (orgName?.[0] || 'O').toUpperCase();
                    const orgAvatar = (ev.organizer && typeof ev.organizer === 'object')
                      ? getMediaUrl((ev.organizer as any).profile_picture || (ev.organizer as any).image)
                      : null;
                    const locationLabel = ev.location_type === 'online'
                      ? t('discover.online')
                      : (ev.location_city || ev.location_name || '');
                    // Label prix formaté : "Gratuit" / "5 000 FCFA" / "dès 5 000 FCFA"
                    const priceRange = getEventPriceRange(ev);
                    const priceLabel = priceRange === undefined
                      ? ''
                      : priceRange.max === 0
                        ? t('common.free')
                        : priceRange.min === priceRange.max
                          ? `${priceRange.min.toLocaleString()} ${platformCurrency}`
                          : `${t('events.startingFrom')} ${priceRange.min.toLocaleString()} ${platformCurrency}`;
                    const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
                    // Une ad inline injectée à idx=4 pour ne pas spammer
                    const inlineAd = idx === 4
                      ? ads.find((a) => a.placement === 'feed_inline')
                      : null;

                    return (
                      <React.Fragment key={ev.id}>
                        {inlineAd && <AdvertisementCard ad={inlineAd} />}
                        <View
                          style={[
                            styles.feedCard,
                            { backgroundColor: colors.card, borderColor: hairline },
                          ]}
                        >
                          {/* Header : organisateur + meta — tappable comme tout LinkedIn/FB post */}
                          <TouchableOpacity
                            onPress={() => navigateToEvent(ev.id, img)}
                            activeOpacity={0.95}
                          >
                            <View style={styles.feedCardHeader}>
                              {orgAvatar ? (
                                <Image
                                  source={{ uri: orgAvatar }}
                                  style={[styles.feedCardAvatar, { borderColor: hairline }]}
                                  contentFit="cover"
                                  cachePolicy="memory-disk"
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.feedCardAvatar,
                                    { backgroundColor: `${colors.primary}12`, borderColor: hairline },
                                  ]}
                                >
                                  <Text style={[styles.feedCardAvatarInitial, { color: colors.primary }]}>
                                    {orgInitial}
                                  </Text>
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[styles.feedCardOrgEyebrow, { color: colors.accent }]}
                                  numberOfLines={1}
                                >
                                  POUR VOUS · ORGANISATEUR
                                </Text>
                                <Text
                                  style={[styles.feedCardOrgName, { color: colors.text }]}
                                  numberOfLines={1}
                                >
                                  {orgName}
                                </Text>
                              </View>
                            </View>

                            {/* Hero image OU video full-width 16:9 (autoplay si visible dans viewport) */}
                            <EventCoverMedia
                              event={ev}
                              mode="card"
                              shouldPlay={visibleIdsRef.current.has(ev.id)}
                              style={styles.feedCardImage}
                              fallbackImageUri={img}
                              fallbackPlaceholder={placeholder}
                            />

                            {/* Body */}
                            <View style={styles.feedCardBody}>
                              <Text
                                style={[styles.feedCardTitle, { color: colors.text }]}
                                numberOfLines={2}
                              >
                                {ev.title}
                              </Text>
                              {!!ev.short_description && (
                                <Text
                                  style={[styles.feedCardDesc, { color: colors.gray600 }]}
                                  numberOfLines={3}
                                >
                                  {ev.short_description}
                                </Text>
                              )}

                              {/* Meta row : date · lieu · prix — séparateurs visuels épurés */}
                              <View style={styles.feedCardMetaRow}>
                                <Ionicons
                                  name="calendar-outline"
                                  size={13}
                                  color={colors.accent}
                                />
                                <Text
                                  style={[styles.feedCardMetaText, { color: colors.gray700 }]}
                                  numberOfLines={1}
                                >
                                  {day} {month} · {eventTime(ev)}
                                </Text>
                                {!!locationLabel && (
                                  <>
                                    <View style={[styles.feedCardMetaDot, { backgroundColor: colors.gray300 }]} />
                                    <Text
                                      style={[styles.feedCardMetaText, { color: colors.gray700, flexShrink: 1 }]}
                                      numberOfLines={1}
                                    >
                                      {locationLabel}
                                    </Text>
                                  </>
                                )}
                                {!!priceLabel && (
                                  <>
                                    <View style={[styles.feedCardMetaDot, { backgroundColor: colors.gray300 }]} />
                                    <Text
                                      style={[styles.feedCardMetaText, { color: colors.primary }]}
                                      numberOfLines={1}
                                    >
                                      {priceLabel}
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Footer : Partager (ghost) à gauche · CTA primaire à droite */}
                          <View style={[styles.feedCardFooter, { borderTopColor: hairline }]}>
                            <TouchableOpacity
                              style={styles.feedCardActionGhost}
                              onPress={() => {
                                Share.share({
                                  message: `${ev.title}\n${ev.short_description || ''}`,
                                  title: ev.title,
                                }).catch(() => { /* user cancelled */ });
                              }}
                              activeOpacity={0.7}
                              accessibilityLabel={t('discover.share')}
                              hitSlop={8}
                            >
                              <Ionicons name="share-outline" size={16} color={colors.gray600} />
                              <Text style={[styles.feedCardActionText, { color: colors.gray700 }]}>
                                Partager
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.feedCardActionPrimary, { backgroundColor: colors.primary }]}
                              onPress={() => navigateToEvent(ev.id, img)}
                              activeOpacity={0.85}
                              accessibilityLabel={t('discover.viewEvent')}
                            >
                              <Text style={styles.feedCardActionPrimaryText}>{t('discover.viewEvent')}</Text>
                              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                  {forYouLoading && (
                    <View style={styles.forYouLoadingRow}>
                      <Text style={[styles.forYouLoadingText, { color: colors.gray500 }]}>
                        Chargement...
                      </Text>
                    </View>
                  )}
                  {!forYouHasMore && forYouEvents.length > 0 && (
                    <View style={styles.forYouEndRow}>
                      <Text style={[styles.forYouEndText, { color: colors.gray400 }]}>
                        Tu as tout vu pour aujourd'hui · Reviens demain
                      </Text>
                    </View>
                  )}
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
  headerBtnBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  headerBtnBadgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  headerBadgeWrap: { position: 'absolute', top: -4, right: -4 },

  // === SEARCH TRIGGER (option A — coussin chaud) ===
  // Pill simple et calme : icone search · placeholder rotatif · chevron.
  // Le mouvement du texte (placeholderIndex) suffit a capter l'attention.
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  searchTriggerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    letterSpacing: -0.1,
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

  // === COMPACT HEADER (2 niveaux : search + chips) ===
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 6,
    paddingRight: Spacing.sm,
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  compactChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
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
  compactBtnBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  compactBtnBadgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
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
  // Base d'ombre des cards : pas d'ombre au repos (shadowOpacity:0), mais
  // shadowColor/shadowOffset sont presents pour que l'animation 'shadow' de
  // AnimatedPressable puisse les faire apparaitre via shadowOpacity/shadowRadius.
  shadowBase: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
  // Pill prix flottante en haut-droite (toujours visible : "GRATUIT" ou prix)
  nearbyPricePill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    maxWidth: 100,
  },
  nearbyPricePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
    // Math.floor évite que la somme (2 cards + gap) dépasse de 1px sur certains
    // devices Android (Pixel 6 Pro 412dp) à cause du sub-pixel rounding,
    // ce qui faisait basculer le grid en 1 colonne.
    width: Math.floor((SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2),
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

  // === FOR YOU SECTION (infinite scroll) ===
  forYouEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  forYouTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    marginBottom: Spacing.md,
  },
  // === FEED-STYLE POST CARD (Facebook/LinkedIn inspired, sans ombre) ===
  // Plein-largeur, header eyebrow + nom organisateur, hero 16:9 plein-bord,
  // titre éditorial, meta row inline avec dots, footer action ghost + CTA.
  feedCard: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  feedCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCardAvatarInitial: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  feedCardOrgEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  feedCardOrgName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  feedCardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  feedCardBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: 8,
  },
  feedCardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 19,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  feedCardDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  feedCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  feedCardMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  feedCardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  feedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  feedCardActionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  feedCardActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  feedCardActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
  },
  feedCardActionPrimaryText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  forYouLoadingRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  forYouLoadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  forYouEndRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  forYouEndText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
