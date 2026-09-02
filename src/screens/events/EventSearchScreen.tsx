import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedRef,
  scrollTo,
  runOnUI,
  runOnJS,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { ScrollTopFab } from '../../components/common/FloatingActionButton';

import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { eventsAPI, categoriesAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useTabletLayout } from '../../hooks/useTabletLayout';
import { useSavedEvents } from '../../hooks/useSavedEvents';
import { Event, Category, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { getApiResults, extractPaginationMeta } from '../../lib/utils/apiHelpers';
import { getEventPriceRange } from '../../lib/utils/priceFormatters';
import EventCard from '../../components/events/EventCard';
import { EmptyState } from '../../components/ui';
import { EventCardSkeleton, SkeletonList } from '../../components/ui/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventSearch'>;
type RouteProps = RouteProp<RootStackParamList, 'EventSearch'>;

type SortOption = 'date' | 'popularity' | 'price_asc' | 'price_desc';
type DatePreset = 'any' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';
type LocationType = 'any' | 'in_person' | 'online' | 'hybrid';
type PriceFilter = 'any' | 'free' | 'paid';

const PAGE_SIZE = 20;

// Hauteur estimée d'une ligne de résultat (EventCard liste)
const SEARCH_RESULT_HEIGHT = 220;

interface State {
  query: string;
  debouncedQuery: string;
  categoryId: number | null;
  /**
   * Ville selectionnee (filtre). Tee depuis route.params.city au mount,
   * mais peut etre dismiss par l'utilisateur via la chip. Sans cet etat,
   * le filtre venait directement de route.params ce qui empechait le
   * dismiss et masquait l'indicateur visuel.
   */
  city: string | null;
  sortBy: SortOption;
  datePreset: DatePreset;
  locationType: LocationType;
  priceFilter: PriceFilter;
  nearMe: boolean;
  hasTickets: boolean;
  results: Event[];
  page: number;
  hasMore: boolean;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  categories: Category[];
}

type Action =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_DEBOUNCED'; query: string }
  | { type: 'SET_CATEGORY'; id: number | null }
  | { type: 'SET_CITY'; city: string | null }
  | { type: 'SET_SORT'; sort: SortOption }
  | { type: 'SET_DATE_PRESET'; preset: DatePreset }
  | { type: 'SET_LOCATION_TYPE'; loc: LocationType }
  | { type: 'SET_PRICE_FILTER'; price: PriceFilter }
  | { type: 'TOGGLE_NEAR_ME' }
  | { type: 'TOGGLE_HAS_TICKETS' }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_FIRST_PAGE'; results: Event[]; total: number; hasMore: boolean }
  | { type: 'SEARCH_MORE_START' }
  | { type: 'SEARCH_MORE_SUCCESS'; results: Event[]; hasMore: boolean }
  | { type: 'SEARCH_ERROR' }
  | { type: 'SET_CATEGORIES'; cats: Category[] }
  | { type: 'RESET_FILTERS' }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_QUERY': return { ...state, query: action.query };
    case 'SET_DEBOUNCED': return { ...state, debouncedQuery: action.query };
    case 'SET_CATEGORY': return { ...state, categoryId: action.id };
    case 'SET_CITY': return { ...state, city: action.city };
    case 'SET_SORT': return { ...state, sortBy: action.sort };
    case 'SET_DATE_PRESET': return { ...state, datePreset: action.preset };
    case 'SET_LOCATION_TYPE': return { ...state, locationType: action.loc };
    case 'SET_PRICE_FILTER': return { ...state, priceFilter: action.price };
    case 'TOGGLE_NEAR_ME': return { ...state, nearMe: !state.nearMe };
    case 'TOGGLE_HAS_TICKETS': return { ...state, hasTickets: !state.hasTickets };
    case 'SEARCH_START': return { ...state, loading: true, page: 1 };
    case 'SEARCH_FIRST_PAGE':
      return {
        ...state,
        loading: false,
        results: action.results,
        total: action.total,
        hasMore: action.hasMore,
        page: 2,
      };
    case 'SEARCH_MORE_START': return { ...state, loadingMore: true };
    case 'SEARCH_MORE_SUCCESS':
      return {
        ...state,
        loadingMore: false,
        results: [...state.results, ...action.results],
        hasMore: action.hasMore,
        page: state.page + 1,
      };
    case 'SEARCH_ERROR': return { ...state, loading: false, loadingMore: false };
    case 'SET_CATEGORIES': return { ...state, categories: action.cats };
    case 'RESET_FILTERS':
      return {
        ...state,
        categoryId: null,
        city: null,
        sortBy: 'date',
        datePreset: 'any',
        locationType: 'any',
        priceFilter: 'any',
        nearMe: false,
        hasTickets: false,
      };
    case 'RESET':
      // BUG (corrigé) : cette action vidait `query`/`debouncedQuery`. Or elle est
      // dispatchée par doSearch dès qu'il n'y a AUCUN filtre actif — ce qui est
      // le cas quand l'utilisateur vient de taper 1 seule lettre (le seuil de
      // recherche est à 2 caractères). Résultat : taper une lettre puis marquer
      // une pause de 300 ms effaçait la saisie sous les doigts de l'utilisateur.
      // RESET ne doit vider que les RÉSULTATS, jamais la saisie en cours.
      // (Le bouton « croix » vide explicitement via SET_QUERY/SET_DEBOUNCED.)
      return {
        ...state,
        results: [],
        total: 0,
        page: 1,
        hasMore: false,
      };
    default: return state;
  }
}

const initialState: State = {
  query: '',
  debouncedQuery: '',
  categoryId: null,
  city: null,
  sortBy: 'date',
  datePreset: 'any',
  locationType: 'any',
  priceFilter: 'any',
  nearMe: false,
  hasTickets: false,
  results: [],
  page: 1,
  hasMore: false,
  total: 0,
  loading: false,
  loadingMore: false,
  categories: [],
};

const getOrderingParam = (sort: SortOption): string => {
  switch (sort) {
    case 'popularity': return '-registration_count';
    // Backend annote `price_min` (Min des prix de billets) et l'expose dans
    // ordering_fields. 'min_price' était ignoré (param inexistant côté API).
    case 'price_asc': return 'price_min';
    case 'price_desc': return '-price_min';
    case 'date':
    default: return 'start_date';
  }
};

const SORT_OPTIONS: { key: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap; eyebrow: string }[] = [
  { key: 'date', label: 'Date', icon: 'calendar', eyebrow: 'CHRONO' },
  { key: 'popularity', label: 'Popularité', icon: 'flame', eyebrow: 'HOT' },
  { key: 'price_asc', label: 'Prix ↑', icon: 'arrow-up', eyebrow: '$ → $$$' },
  { key: 'price_desc', label: 'Prix ↓', icon: 'arrow-down', eyebrow: '$$$ → $' },
];

const DATE_PRESETS: { key: DatePreset; label: string; eyebrow: string }[] = [
  { key: 'any', label: 'Toutes dates', eyebrow: 'ANY' },
  { key: 'today', label: 'Aujourd\'hui', eyebrow: 'J0' },
  { key: 'tomorrow', label: 'Demain', eyebrow: 'J1' },
  { key: 'weekend', label: 'Ce week-end', eyebrow: 'WK' },
  { key: 'week', label: 'Cette semaine', eyebrow: '7J' },
  { key: 'month', label: 'Ce mois-ci', eyebrow: '30J' },
];

const LOCATION_TYPES: { key: LocationType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'any', label: 'Tous', icon: 'globe-outline' },
  { key: 'in_person', label: 'En personne', icon: 'people-outline' },
  { key: 'online', label: 'En ligne', icon: 'videocam-outline' },
  { key: 'hybrid', label: 'Hybride', icon: 'sync-outline' },
];

const PRICE_FILTERS: { key: PriceFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'any', label: 'Tous', icon: 'pricetags-outline' },
  { key: 'free', label: 'Gratuit', icon: 'gift-outline' },
  { key: 'paid', label: 'Payant', icon: 'card-outline' },
];

// Compute date range from preset
function computeDateRange(preset: DatePreset): { start?: string; end?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': {
      const end = new Date(startOfDay);
      end.setDate(end.getDate() + 1);
      return { start: startOfDay.toISOString(), end: end.toISOString() };
    }
    case 'tomorrow': {
      const start = new Date(startOfDay);
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'weekend': {
      const day = startOfDay.getDay();
      const daysToSat = day === 0 ? 6 : 6 - day;
      const start = new Date(startOfDay);
      start.setDate(start.getDate() + daysToSat);
      const end = new Date(start);
      end.setDate(end.getDate() + 2);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'week': {
      // "Cette semaine" = d'aujourd'hui jusqu'à la fin de la semaine en cours
      // (dimanche, semaine commençant lundi), pas 7 jours glissants.
      const day = startOfDay.getDay(); // 0=dimanche … 6=samedi
      const daysToSunday = day === 0 ? 0 : 7 - day;
      const end = new Date(startOfDay);
      end.setDate(end.getDate() + daysToSunday + 1); // lundi 00:00 → inclut tout dimanche
      return { start: startOfDay.toISOString(), end: end.toISOString() };
    }
    case 'month': {
      // "Ce mois-ci" = jusqu'à la fin du mois calendaire (1er du mois suivant),
      // pas ~30 jours glissants.
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start: startOfDay.toISOString(), end: end.toISOString() };
    }
    default: return {};
  }
}

export default function EventSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  // Marque-page des cartes : sans ce hook, l'icone etait un bouton mort
  // (onLikePress/isLiked jamais fournis) — cf. useSavedEvents.
  const { isSaved, toggleSaved, isAuthenticated: savedAuth } = useSavedEvents();
  const route = useRoute<RouteProps>();

  // Largeurs RÉACTIVES (grille de suggestions 2 col + hauteur max de la modal
  // filtres), basées sur la fenêtre réelle et non un SCREEN_WIDTH figé au
  // chargement du module → correct sur iPad (mode compat) / rotation.
  const { width: winW, height: winH } = useWindowDimensions();
  const suggestionCardWidth = (Math.min(winW, 520) - Spacing.lg * 2 - 8) / 2;
  const filterModalMaxHeight = winH * 0.92;

  const initialCategory = route.params?.category ?? null;
  const initialQuery = route.params?.query ?? '';
  const initialCity = route.params?.city ?? null;
  // Filtre prix passé en param (ex. « Voir tout » de la section gratuite de
  // l'accueil). Sans ça, le lien ouvrait la recherche sans le filtre gratuit.
  const initialPrice = route.params?.price ?? 'any';

  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const { columns, padding: containerPadding } = useTabletLayout();
  const {
    history,
    addQuery: addSearchHistory,
    removeQuery: removeSearchHistoryEntry,
    clearAll: clearSearchHistory,
  } = useSearchHistory();

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    query: initialQuery,
    debouncedQuery: initialQuery,
    categoryId: initialCategory,
    city: initialCity,
    priceFilter: initialPrice,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Viewport tracking pour autoplay video sur cards visibles
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const [visibleVersion, setVisibleVersion] = useState(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const next = new Set<string>(viewableItems.map((v) => String(v.item?.id)).filter(Boolean));
    visibleIdsRef.current = next;
    setVisibleVersion((v) => v + 1);
  }).current;

  // === Compact mode on scroll direction (only search bar stays) ===
  const [headerH, setHeaderH] = useState(220);
  const lastY = useSharedValue(0);
  // Scroll-to-top : ref animée du feed + visibilité du FAB « remonter ».
  const listAnimRef = useAnimatedRef<any>();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollListToTop = useCallback(() => {
    runOnUI(() => {
      'worklet';
      scrollTo(listAnimRef, 0, 0, true);
    })();
  }, [listAnimRef]);
  const progress = useSharedValue(0); // 0 = expanded, 1 = collapsed
  const SHOW_AT_TOP = 20;
  const HIDE_TRIGGER = 6;
  const SHOW_TRIGGER = 6;
  const ANIM_CONFIG = { duration: 280, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const current = e.contentOffset.y;
      const diff = current - lastY.value;
      if (current <= SHOW_AT_TOP) {
        progress.value = withTiming(0, ANIM_CONFIG);
      } else if (diff > HIDE_TRIGGER) {
        progress.value = withTiming(1, ANIM_CONFIG);
      } else if (diff < -SHOW_TRIGGER) {
        progress.value = withTiming(0, ANIM_CONFIG);
      }
      lastY.value = current;
      // FAB « remonter » au-delà d'un long scroll (~1.5 écran).
      runOnJS(setShowScrollTop)(current > 600);
    },
  });

  // Title row (eyebrow + h1) — fade + collapse height
  const titleColStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
    maxHeight: interpolate(progress.value, [0, 1], [62, 0], Extrapolation.CLAMP),
    marginBottom: interpolate(progress.value, [0, 1], [Spacing.md, 0], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  // Quick filters row — fade + collapse height
  const quickFiltersStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
    maxHeight: interpolate(progress.value, [0, 1], [44, 0], Extrapolation.CLAMP),
    marginTop: interpolate(progress.value, [0, 1], [Spacing.md, 0], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  // Active filters bar — fade + collapse
  const activeFiltersAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
    maxHeight: interpolate(progress.value, [0, 1], [60, 0], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  // Result count + sort — fade + collapse
  const resultBarAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
    maxHeight: interpolate(progress.value, [0, 1], [44, 0], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  // === Localized labels ===
  const sortLabel = (key: SortOption): string => {
    switch (key) {
      case 'popularity': return t('eventSearch.sortPopularity');
      case 'price_asc': return t('eventSearch.sortPriceAsc');
      case 'price_desc': return t('eventSearch.sortPriceDesc');
      default: return t('eventSearch.sortDate');
    }
  };
  const sortEyebrow = (key: SortOption): string => {
    switch (key) {
      case 'popularity': return t('eventSearch.sortPopularityEyebrow');
      case 'price_asc': return t('eventSearch.sortPriceAscEyebrow');
      case 'price_desc': return t('eventSearch.sortPriceDescEyebrow');
      default: return t('eventSearch.sortDateEyebrow');
    }
  };
  const dateLabel = (key: DatePreset): string => {
    switch (key) {
      case 'today': return t('eventSearch.dateToday');
      case 'tomorrow': return t('eventSearch.dateTomorrow');
      case 'weekend': return t('eventSearch.dateWeekend');
      case 'week': return t('eventSearch.dateWeek');
      case 'month': return t('eventSearch.dateMonth');
      default: return t('eventSearch.dateAny');
    }
  };
  const dateEyebrow = (key: DatePreset): string => {
    switch (key) {
      case 'today': return t('eventSearch.dateTodayEyebrow');
      case 'tomorrow': return t('eventSearch.dateTomorrowEyebrow');
      case 'weekend': return t('eventSearch.dateWeekendEyebrow');
      case 'week': return t('eventSearch.dateWeekEyebrow');
      case 'month': return t('eventSearch.dateMonthEyebrow');
      default: return t('eventSearch.dateAnyEyebrow');
    }
  };
  const locLabel = (key: LocationType): string => {
    switch (key) {
      case 'in_person': return t('eventSearch.locInPerson');
      case 'online': return t('eventSearch.locOnline');
      case 'hybrid': return t('eventSearch.locHybrid');
      default: return t('eventSearch.locAny');
    }
  };
  const priceLabel = (key: PriceFilter): string => {
    switch (key) {
      case 'free': return t('eventSearch.priceFree');
      case 'paid': return t('eventSearch.pricePaid');
      default: return t('eventSearch.priceAny');
    }
  };

  // Active filters count (excluding query/sort)
  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (state.categoryId !== null) n++;
    if (state.city !== null) n++;
    if (state.datePreset !== 'any') n++;
    if (state.locationType !== 'any') n++;
    if (state.priceFilter !== 'any') n++;
    if (state.nearMe) n++;
    if (state.hasTickets) n++;
    return n;
  }, [state.categoryId, state.city, state.datePreset, state.locationType, state.priceFilter, state.nearMe, state.hasTickets]);

  useEffect(() => {
    if (!initialQuery && !initialCategory) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [initialQuery, initialCategory]);

  useEffect(() => {
    categoriesAPI.getCategories()
      .then(res => {
        const cats = getApiResults<Category>(res);
        dispatch({ type: 'SET_CATEGORIES', cats });
      })
      .catch(err => __DEV__ && console.error('categories:', err));
  }, []);

  // Fetch user location when nearMe is enabled
  useEffect(() => {
    if (state.nearMe && !userLocation) {
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') {
          Location.getCurrentPositionAsync({}).then(loc => {
            setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          }).catch(() => {});
        }
      });
    }
  }, [state.nearMe]);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch({ type: 'SET_DEBOUNCED', query: state.query });
    }, 300);
    return () => clearTimeout(t);
  }, [state.query]);

  const doSearch = useCallback(
    async (page: number, append: boolean) => {
      const hasFilter =
        state.debouncedQuery.trim().length >= 2 ||
        state.categoryId !== null ||
        state.city !== null ||
        state.datePreset !== 'any' ||
        state.locationType !== 'any' ||
        state.priceFilter !== 'any' ||
        state.nearMe ||
        state.hasTickets;

      if (!hasFilter) {
        if (!append) dispatch({ type: 'RESET' });
        return;
      }

      if (append) dispatch({ type: 'SEARCH_MORE_START' });
      else dispatch({ type: 'SEARCH_START' });

      try {
        const params: any = {
          page,
          page_size: PAGE_SIZE,
          status: 'validated',
          ordering: getOrderingParam(state.sortBy),
        };
        if (state.debouncedQuery.trim()) params.search = state.debouncedQuery.trim();
        if (state.categoryId !== null) params.category = state.categoryId;
        // Filtre ville depuis l'etat (initialise via route.params.city au
        // mount, mais dismissable par le user via la chip).
        // ATTENTION : le backend EventViewSet lit `city` (cf. views.py:239
        // `request.query_params.get('city')`), PAS `location_city`. Avant ce
        // fix, le filtre etait ignore en silence → liste vide.
        if (state.city) params.city = state.city;

        // Date range
        const range = computeDateRange(state.datePreset);
        if (range.start) params.start_date_after = range.start;
        if (range.end) params.start_date_before = range.end;

        // Location type
        if (state.locationType !== 'any') params.location_type = state.locationType;

        // Price (backend expects 'free' / 'paid')
        if (state.priceFilter === 'free') params.price = 'free';
        if (state.priceFilter === 'paid') params.price = 'paid';

        // Near me
        if (state.nearMe && userLocation) {
          params.lat = userLocation.lat;
          params.lng = userLocation.lng;
          params.radius = 50;
        }

        // Has tickets available
        if (state.hasTickets) params.has_available_tickets = true;

        const res = await eventsAPI.getEvents(params);
        const results = getApiResults<Event>(res);
        const meta = extractPaginationMeta(res);

        if (append) {
          dispatch({ type: 'SEARCH_MORE_SUCCESS', results, hasMore: !!meta.next });
        } else {
          dispatch({
            type: 'SEARCH_FIRST_PAGE',
            results,
            total: meta.count || results.length,
            hasMore: !!meta.next,
          });
          if (state.debouncedQuery.trim().length >= 2) {
            addSearchHistory(state.debouncedQuery.trim());
          }
        }
      } catch (err) {
        if (__DEV__) console.error('Search error:', err);
        dispatch({ type: 'SEARCH_ERROR' });
      }
    },
    [
      state.debouncedQuery, state.categoryId, state.city, state.sortBy, state.datePreset,
      state.locationType, state.priceFilter, state.nearMe, state.hasTickets,
      userLocation, addSearchHistory,
    ]
  );

  useEffect(() => {
    doSearch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.debouncedQuery, state.categoryId, state.city, state.sortBy, state.datePreset,
    state.locationType, state.priceFilter, state.nearMe, state.hasTickets,
  ]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading || state.loadingMore) return;
    doSearch(state.page, true);
  }, [state.hasMore, state.loading, state.loadingMore, state.page, doSearch]);

  const handleClearQuery = () => {
    dispatch({ type: 'SET_QUERY', query: '' });
    dispatch({ type: 'SET_DEBOUNCED', query: '' });
    inputRef.current?.focus();
  };

  const handleSelectHistory = (q: string) => {
    dispatch({ type: 'SET_QUERY', query: q });
    dispatch({ type: 'SET_DEBOUNCED', query: q });
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails', {
      eventId: event.slug || event.id,
      imageUrl: event.banner_image || event.category?.default_event_image || event.display_image,
    });
  };

  // ATTENTION : ce flag pilote le branchement render entre "vue d'accueil
  // recherche" (historique + suggestions) et "vue resultats" (FlatList des
  // events). hasFilter dans doSearch et hasActiveSearch DOIVENT inclure les
  // memes filtres, sinon le fetch part mais on affiche pas les resultats
  // (cas typique : tap d'une ville → state.city set, fetch OK, mais
  // hasActiveSearch=false → l'user voit l'historique au lieu des events).
  const hasActiveSearch =
    state.debouncedQuery.trim().length >= 2 ||
    state.categoryId !== null ||
    state.city !== null ||
    state.datePreset !== 'any' ||
    state.locationType !== 'any' ||
    state.priceFilter !== 'any' ||
    state.nearMe ||
    state.hasTickets;

  const renderEvent = useCallback(
    ({ item }: { item: Event }) => {
      const range = getEventPriceRange(item);
      return (
        <View style={[styles.resultItem, columns > 1 && { flex: 1 / columns }]}>
          <EventCard
            id={item.id}
            title={item.title}
            date={item.start_date}
            time={(item as any).start_time}
            location={item.location_city || item.location_address || t('discover.placeIfPlaceMissing')}
            imageUrl={item.banner_image || item.category?.default_event_image || item.display_image}
            imagePlaceholder={item.banner_placeholder || item.category?.default_event_image_placeholder || item.display_placeholder}
            category={item.category?.name}
            price={range?.min}
            priceMax={range?.max}
            isFree={item.is_free || (range?.min === 0 && range?.max === 0)}
            isFeatured={item.is_featured}
            locationType={item.location_type}
            eventType={item.event_type}
            currency={item.currency || platformCurrency || 'FCFA'}
            attendees={item.registration_count || (item as any).registrations_count}
            variant={columns > 1 ? 'grid' : 'default'}
            fullWidth={columns === 1}
            onPress={() => handleEventPress(item)}
            isLiked={isSaved(item.id)}
            onLikePress={() => {
              // Non connecte : la sauvegarde est liee au compte -> on envoie
              // vers Login plutot que de laisser un tap sans effet.
              if (!savedAuth) {
                navigation.navigate('Login');
                return;
              }
              toggleSaved(item.id);
            }}
            coverVideo={item.cover_video}
            coverVideoEmbed={item.cover_video_embed}
            isVisible={visibleIdsRef.current.has(item.id)}
          />
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, platformCurrency, navigation, visibleVersion, isSaved, toggleSaved, savedAuth]
  );

  // === ACTIVE FILTER CHIPS (removable, shown when filters active) ===
  const renderActiveFilters = () => {
    if (activeFiltersCount === 0) return null;
    const chips: { label: string; onRemove: () => void }[] = [];

    if (state.categoryId !== null) {
      const cat = state.categories.find(c => c.id === state.categoryId);
      if (cat) chips.push({ label: cat.name, onRemove: () => dispatch({ type: 'SET_CATEGORY', id: null }) });
    }
    // Chip ville : prefixe d'un pin pour distinguer visuellement du filtre
    // categorie. onRemove enleve le filtre et declenche un re-search elargi.
    if (state.city !== null) {
      chips.push({
        label: `📍 ${state.city}`,
        onRemove: () => dispatch({ type: 'SET_CITY', city: null }),
      });
    }
    if (state.datePreset !== 'any') {
      chips.push({ label: dateLabel(state.datePreset), onRemove: () => dispatch({ type: 'SET_DATE_PRESET', preset: 'any' }) });
    }
    if (state.locationType !== 'any') {
      chips.push({ label: locLabel(state.locationType), onRemove: () => dispatch({ type: 'SET_LOCATION_TYPE', loc: 'any' }) });
    }
    if (state.priceFilter !== 'any') {
      chips.push({ label: priceLabel(state.priceFilter), onRemove: () => dispatch({ type: 'SET_PRICE_FILTER', price: 'any' }) });
    }
    if (state.nearMe) chips.push({ label: t('eventSearch.near_me_chip'), onRemove: () => dispatch({ type: 'TOGGLE_NEAR_ME' }) });
    if (state.hasTickets) chips.push({ label: t('eventSearch.tickets_chip'), onRemove: () => dispatch({ type: 'TOGGLE_HAS_TICKETS' }) });

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.activeChipsScroll}
        contentContainerStyle={styles.activeChipsRow}
      >
        <TouchableOpacity
          style={[styles.clearAllChip, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
          onPress={() => dispatch({ type: 'RESET_FILTERS' })}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={11} color="#DC2626" />
          <Text style={styles.clearAllChipText}>{t('eventSearch.clearAll')}</Text>
        </TouchableOpacity>
        {chips.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.activeChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
            onPress={chip.onRemove}
            activeOpacity={0.7}
          >
            <Text style={[styles.activeChipText, { color: colors.primary }]} numberOfLines={1}>
              {chip.label}
            </Text>
            <Ionicons name="close" size={11} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // === QUICK FILTER CHIPS (shortcuts row) ===
  const QUICK_FILTERS = [
    { label: t('eventSearch.quickToday'), icon: 'today-outline' as const, active: state.datePreset === 'today', onPress: () => dispatch({ type: 'SET_DATE_PRESET', preset: state.datePreset === 'today' ? 'any' : 'today' }) },
    { label: t('eventSearch.quickWeekend'), icon: 'sparkles-outline' as const, active: state.datePreset === 'weekend', onPress: () => dispatch({ type: 'SET_DATE_PRESET', preset: state.datePreset === 'weekend' ? 'any' : 'weekend' }) },
    { label: t('eventSearch.quickFree'), icon: 'gift-outline' as const, active: state.priceFilter === 'free', onPress: () => dispatch({ type: 'SET_PRICE_FILTER', price: state.priceFilter === 'free' ? 'any' : 'free' }) },
    { label: t('eventSearch.quickOnline'), icon: 'videocam-outline' as const, active: state.locationType === 'online', onPress: () => dispatch({ type: 'SET_LOCATION_TYPE', loc: state.locationType === 'online' ? 'any' : 'online' }) },
    { label: t('eventSearch.quickNearMe'), icon: 'location-outline' as const, active: state.nearMe, onPress: () => dispatch({ type: 'TOGGLE_NEAR_ME' }) },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>FIND</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        {/* === STICKY GROUP — only search bar stays on scroll === */}
        <Animated.View
          style={[
            styles.stickyGroup,
            { backgroundColor: isDark ? colors.background : '#F4F3F0' },
          ]}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && h !== headerH) setHeaderH(h);
          }}
        >
          {/* Editorial header tile */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
                borderBottomColor: hairline,
              },
            ]}
          >
            {/* Title row (eyebrow + h1) — fully collapsible */}
            <Animated.View style={[styles.titleColWrap, titleColStyle]}>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('eventSearch.eyebrow')}</Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('eventSearch.title')}</Text>
            </Animated.View>

            {/* Search row — ALWAYS visible (back + input + filter) */}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: hairline }]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.searchBackBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
              >
                <Ionicons name="chevron-back" size={18} color={colors.gray600} />
              </TouchableOpacity>
              <View style={[styles.searchDivider, { backgroundColor: hairline }]} />
              <Ionicons name="search" size={16} color={colors.gray500} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('eventSearch.placeholder')}
                placeholderTextColor={colors.gray400}
                value={state.query}
                onChangeText={(text) => dispatch({ type: 'SET_QUERY', query: text })}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {state.query.length > 0 && (
                <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.clear')}>
                  <Ionicons name="close-circle" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.filterTrigger, { backgroundColor: activeFiltersCount > 0 ? colors.primary : colors.gray100 }]}
                onPress={() => setShowFilters(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Filtres"
              >
                <Ionicons
                  name="options"
                  size={14}
                  color={activeFiltersCount > 0 ? Colors.white : colors.gray700}
                />
                {activeFiltersCount > 0 && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick filter chips — collapsible */}
            <Animated.View style={quickFiltersStyle}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickFiltersScroll}
                contentContainerStyle={styles.quickFiltersRow}
              >
                {QUICK_FILTERS.map((qf, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.quickFilterChip,
                      qf.active
                        ? { backgroundColor: colors.text, ...Shadows.sm }
                        : {
                            backgroundColor: colors.card,
                            borderColor: hairline,
                            borderWidth: 1,
                          },
                    ]}
                    onPress={qf.onPress}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={qf.icon}
                      size={13}
                      color={qf.active ? colors.background : colors.gray700}
                    />
                    <Text
                      style={[
                        styles.quickFilterText,
                        // Inverse du theme pour rester contrasté en dark mode :
                        // bg=colors.text (qui s'inverse) + text=colors.background
                        { color: qf.active ? colors.background : colors.gray700 },
                      ]}
                    >
                      {qf.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </View>

          {/* Active filters bar — collapsible */}
          <Animated.View style={activeFiltersAnimStyle}>
            {renderActiveFilters()}
          </Animated.View>

          {/* Result count + sort — collapsible */}
          {hasActiveSearch && !state.loading && (
            <Animated.View style={[styles.resultBar, resultBarAnimStyle]}>
              <Text style={[styles.resultCount, { color: colors.text }]}>
                {t('eventSearch.results', { count: state.total })}
              </Text>
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((opt) => {
                  const active = state.sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sortPill,
                        active && { backgroundColor: colors.text },
                      ]}
                      onPress={() => dispatch({ type: 'SET_SORT', sort: opt.key })}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={11}
                        color={active ? colors.background : colors.gray500}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Content */}
        {!hasActiveSearch ? (
          <View style={{ flex: 1 }}>
            {history.length > 0 ? (
              <Animated.FlatList
                data={history}
                keyExtractor={(item) => item}
                onScroll={onScroll}
                scrollEventThrottle={16}
                // Sans ça, tout contact avec la liste ferme le clavier pendant
                // la frappe (défaut 'never') → saisie interrompue.
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: headerH }}
                renderItem={({ item }) => (
                  <View style={[styles.historyRow, { borderBottomColor: hairline }]}>
                    <TouchableOpacity
                      style={styles.historyItem}
                      onPress={() => handleSelectHistory(item)}
                    >
                      <View style={[styles.historyIcon, { backgroundColor: colors.gray100 }]}>
                        <Ionicons name="time-outline" size={14} color={colors.gray600} />
                      </View>
                      <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={1}>{item}</Text>
                      <Ionicons name="arrow-up-outline" size={14} color={colors.gray400} style={{ transform: [{ rotate: '-45deg' }] }} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeSearchHistoryEntry(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={[styles.historyRemove, { backgroundColor: colors.gray100 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.remove')}
                    >
                      <Ionicons name="close" size={12} color={colors.gray500} />
                    </TouchableOpacity>
                  </View>
                )}
                ListHeaderComponent={
                  <View style={styles.historyHeader}>
                    <View>
                      <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('eventSearch.historyEyebrow')}</Text>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('eventSearch.historyTitle')}</Text>
                    </View>
                    <TouchableOpacity onPress={clearSearchHistory}>
                      <Text style={[styles.historyClear, { color: colors.primary }]}>
                        {t('eventSearch.clearAll')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
                ListFooterComponent={
                  <View style={styles.suggestionsBlock}>
                    <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('eventSearch.suggestionsEyebrow')}</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('eventSearch.suggestionsTitle')}</Text>
                    <View style={styles.suggestionGrid}>
                      {state.categories.slice(0, 6).map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.suggestionCard, { width: suggestionCardWidth, backgroundColor: colors.card, borderColor: hairline }]}
                          onPress={() => dispatch({ type: 'SET_CATEGORY', id: cat.id as any })}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.suggestionIcon, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="layers-outline" size={16} color={colors.primary} />
                          </View>
                          <Text style={[styles.suggestionLabel, { color: colors.text }]} numberOfLines={1}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                }
              />
            ) : (
              <Animated.ScrollView
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: headerH + Spacing.xl }}
              >
                <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('eventSearch.suggestionsEyebrow')}</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('eventSearch.suggestionsTitle')}</Text>
                <View style={styles.suggestionGrid}>
                  {state.categories.slice(0, 8).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.suggestionCard, { width: suggestionCardWidth, backgroundColor: colors.card, borderColor: hairline }]}
                      onPress={() => dispatch({ type: 'SET_CATEGORY', id: cat.id as any })}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.suggestionIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="layers-outline" size={16} color={colors.primary} />
                      </View>
                      <Text style={[styles.suggestionLabel, { color: colors.text }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.ScrollView>
            )}
          </View>
        ) : state.loading && state.results.length === 0 ? (
          <View style={{ flex: 1, paddingHorizontal: containerPadding, paddingTop: headerH + Spacing.sm }}>
            <SkeletonList count={4} Component={EventCardSkeleton} />
          </View>
        ) : state.results.length === 0 ? (
          <View style={{ flex: 1, paddingTop: headerH }}>
            <EmptyState
              icon="search-outline"
              title={t('eventSearch.emptyTitle')}
              description={t('eventSearch.emptyDescription')}
            />
          </View>
        ) : (
          <Animated.FlatList
            ref={listAnimRef}
            data={state.results}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderEvent}
            keyboardShouldPersistTaps="handled"
            numColumns={columns > 1 ? columns : 1}
            key={`list-${columns}`}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            onScroll={onScroll}
            scrollEventThrottle={16}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            contentContainerStyle={{
              paddingHorizontal: containerPadding,
              paddingTop: headerH + Spacing.sm,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={8}
            windowSize={5}
            maxToRenderPerBatch={10}
            getItemLayout={(_, i) => {
              const cols = columns > 1 ? columns : 1;
              const row = Math.floor(i / cols);
              return { length: SEARCH_RESULT_HEIGHT, offset: SEARCH_RESULT_HEIGHT * row, index: i };
            }}
            ListFooterComponent={
              state.loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}

        {/* === FILTERS BOTTOM SHEET === */}
        <Modal
          visible={showFilters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowFilters(false)}
            />
            <View
              style={[
                styles.filterSheet,
                { maxHeight: filterModalMaxHeight, backgroundColor: colors.background },
                { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
              ]}
            >
              {/* Handle */}
              <View style={[styles.sheetHandle, { backgroundColor: colors.gray300 }]} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetEyebrow, { color: colors.accent }]}>{t('eventSearch.sheetEyebrow')}</Text>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('eventSearch.sheetTitle')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
                  onPress={() => setShowFilters(false)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                {/* DATE */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterEyebrow, { color: colors.accent }]}>{t('eventSearch.filterDateEyebrow')}</Text>
                  <Text style={[styles.filterTitle, { color: colors.text }]}>{t('eventSearch.filterDateTitle')}</Text>
                  <View style={styles.filterChipGrid}>
                    {DATE_PRESETS.map((p) => {
                      const active = state.datePreset === p.key;
                      return (
                        <TouchableOpacity
                          key={p.key}
                          style={[
                            styles.filterCardChip,
                            {
                              backgroundColor: colors.card,
                              borderColor: active ? colors.primary : hairline,
                            },
                            active && Shadows.buttonPrimary,
                          ]}
                          onPress={() => dispatch({ type: 'SET_DATE_PRESET', preset: p.key })}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.filterChipEyebrow, { color: colors.accent }]}>{dateEyebrow(p.key)}</Text>
                          <Text style={[styles.filterChipLabel, { color: colors.text }]}>{dateLabel(p.key)}</Text>
                          {active && (
                            <View style={[styles.filterChipCheck, { backgroundColor: colors.primary }]}>
                              <Ionicons name="checkmark" size={10} color={Colors.white} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* TYPE D'ÉVÉNEMENT */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterEyebrow, { color: colors.accent }]}>{t('eventSearch.filterLocationEyebrow')}</Text>
                  <Text style={[styles.filterTitle, { color: colors.text }]}>{t('eventSearch.filterLocationTitle')}</Text>
                  <View style={styles.filterRow}>
                    {LOCATION_TYPES.map((l) => {
                      const active = state.locationType === l.key;
                      return (
                        <TouchableOpacity
                          key={l.key}
                          style={[
                            styles.filterIconCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: active ? colors.primary : hairline,
                            },
                            active && Shadows.buttonPrimary,
                          ]}
                          onPress={() => dispatch({ type: 'SET_LOCATION_TYPE', loc: l.key })}
                          activeOpacity={0.85}
                        >
                          <Ionicons name={l.icon} size={20} color={active ? colors.primary : colors.gray600} />
                          <Text style={[styles.filterIconCardLabel, { color: colors.text }]} numberOfLines={1}>
                            {locLabel(l.key)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* PRIX */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterEyebrow, { color: colors.accent }]}>{t('eventSearch.filterPriceEyebrow')}</Text>
                  <Text style={[styles.filterTitle, { color: colors.text }]}>{t('eventSearch.filterPriceTitle')}</Text>
                  <View style={styles.filterRow}>
                    {PRICE_FILTERS.map((p) => {
                      const active = state.priceFilter === p.key;
                      return (
                        <TouchableOpacity
                          key={p.key}
                          style={[
                            styles.filterIconCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: active ? colors.primary : hairline,
                            },
                            active && Shadows.buttonPrimary,
                          ]}
                          onPress={() => dispatch({ type: 'SET_PRICE_FILTER', price: p.key })}
                          activeOpacity={0.85}
                        >
                          <Ionicons name={p.icon} size={20} color={active ? colors.primary : colors.gray600} />
                          <Text style={[styles.filterIconCardLabel, { color: colors.text }]}>
                            {priceLabel(p.key)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* CATÉGORIE */}
                {state.categories.length > 0 && (
                  <View style={styles.filterSection}>
                    <Text style={[styles.filterEyebrow, { color: colors.accent }]}>{t('eventSearch.filterCategoryEyebrow')}</Text>
                    <Text style={[styles.filterTitle, { color: colors.text }]}>{t('eventSearch.filterCategoryTitle')}</Text>
                    <View style={styles.filterChipGrid}>
                      <TouchableOpacity
                        style={[
                          styles.filterTextChip,
                          {
                            backgroundColor: state.categoryId === null ? colors.text : colors.card,
                            borderColor: state.categoryId === null ? colors.text : hairline,
                          },
                        ]}
                        onPress={() => dispatch({ type: 'SET_CATEGORY', id: null })}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterTextChipText,
                            { color: state.categoryId === null ? Colors.white : colors.gray700 },
                          ]}
                        >
                          {t('eventSearch.filterAllCategories')}
                        </Text>
                      </TouchableOpacity>
                      {state.categories.map((cat) => {
                        const active = state.categoryId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.filterTextChip,
                              {
                                backgroundColor: active ? colors.primary : colors.card,
                                borderColor: active ? colors.primary : hairline,
                              },
                            ]}
                            onPress={() => dispatch({ type: 'SET_CATEGORY', id: cat.id as any })}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.filterTextChipText,
                                { color: active ? Colors.white : colors.gray700 },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* AUTRES OPTIONS */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterEyebrow, { color: colors.accent }]}>{t('eventSearch.filterOptionsEyebrow')}</Text>
                  <Text style={[styles.filterTitle, { color: colors.text }]}>{t('eventSearch.filterOptionsTitle')}</Text>
                  <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: hairline }]}>
                    <TouchableOpacity
                      style={styles.toggleRow}
                      onPress={() => dispatch({ type: 'TOGGLE_NEAR_ME' })}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.toggleIcon, { backgroundColor: '#3B82F615' }]}>
                        <Ionicons name="location" size={14} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.toggleTitle, { color: colors.text }]}>{t('eventSearch.nearMeTitle')}</Text>
                        <Text style={[styles.toggleSub, { color: colors.gray500 }]}>{t('eventSearch.nearMeSub')}</Text>
                      </View>
                      <View
                        style={[
                          styles.toggleSwitch,
                          { backgroundColor: state.nearMe ? colors.primary : colors.gray200 },
                        ]}
                      >
                        <View
                          style={[
                            styles.toggleSwitchKnob,
                            { transform: [{ translateX: state.nearMe ? 18 : 2 }] },
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                    <View style={[styles.toggleDivider, { backgroundColor: hairline }]} />
                    <TouchableOpacity
                      style={styles.toggleRow}
                      onPress={() => dispatch({ type: 'TOGGLE_HAS_TICKETS' })}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.toggleIcon, { backgroundColor: '#10B98115' }]}>
                        <Ionicons name="ticket" size={14} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.toggleTitle, { color: colors.text }]}>{t('eventSearch.hasTicketsTitle')}</Text>
                        <Text style={[styles.toggleSub, { color: colors.gray500 }]}>{t('eventSearch.hasTicketsSub')}</Text>
                      </View>
                      <View
                        style={[
                          styles.toggleSwitch,
                          { backgroundColor: state.hasTickets ? colors.primary : colors.gray200 },
                        ]}
                      >
                        <View
                          style={[
                            styles.toggleSwitchKnob,
                            { transform: [{ translateX: state.hasTickets ? 18 : 2 }] },
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* TRI */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterEyebrow, { color: colors.accent }]}>{t('eventSearch.filterSortEyebrow')}</Text>
                  <Text style={[styles.filterTitle, { color: colors.text }]}>{t('eventSearch.filterSortTitle')}</Text>
                  <View style={styles.filterChipGrid}>
                    {SORT_OPTIONS.map((opt) => {
                      const active = state.sortBy === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.filterCardChip,
                            {
                              backgroundColor: colors.card,
                              borderColor: active ? colors.primary : hairline,
                              minWidth: '47%',
                            },
                            active && Shadows.buttonPrimary,
                          ]}
                          onPress={() => dispatch({ type: 'SET_SORT', sort: opt.key })}
                          activeOpacity={0.85}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={opt.icon} size={13} color={active ? colors.primary : colors.gray500} />
                            <Text style={[styles.filterChipEyebrow, { color: colors.accent }]}>{sortEyebrow(opt.key)}</Text>
                          </View>
                          <Text style={[styles.filterChipLabel, { color: colors.text }]}>{sortLabel(opt.key)}</Text>
                          {active && (
                            <View style={[styles.filterChipCheck, { backgroundColor: colors.primary }]}>
                              <Ionicons name="checkmark" size={10} color={Colors.white} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Footer CTAs */}
              <View style={[styles.sheetFooter, { borderTopColor: hairline }]}>
                <TouchableOpacity
                  style={[styles.sheetResetBtn, { backgroundColor: colors.gray100 }]}
                  onPress={() => dispatch({ type: 'RESET_FILTERS' })}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.sheetResetText, { color: colors.text }]}>{t('eventSearch.reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetApplyBtn, Shadows.buttonPrimary]}
                  onPress={() => setShowFilters(false)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.sheetApplyText}>
                    {state.total > 0 && hasActiveSearch
                      ? t('eventSearch.viewResultsCount', { count: state.total })
                      : t('eventSearch.viewResults')}
                  </Text>
                  <View style={styles.sheetApplyArrow}>
                    <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* FAB « remonter en haut » — écran poussé (pas de tab bar). */}
        <ScrollTopFab
          visible={showScrollTop}
          onPress={scrollListToTop}
          accessibilityLabel={t('discover.scrollToTop')}
          hasTabBar={false}
        />
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === STICKY GROUP (auto-hide on scroll direction) ===
  stickyGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
  titleColWrap: {
    justifyContent: 'center',
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    letterSpacing: -1.2,
    lineHeight: 34,
  },

  // === SEARCH BOX ===
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingLeft: 8,
    paddingRight: 6,
  },
  searchBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchDivider: {
    width: 1,
    height: 22,
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    padding: 0,
  },
  filterTrigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },

  // === QUICK FILTERS ===
  quickFiltersScroll: {
    flexGrow: 0,
    maxHeight: 40,
  },
  quickFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: Spacing.md,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  quickFilterText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // === ACTIVE FILTERS BAR ===
  activeChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  clearAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  clearAllChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  activeChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
    maxWidth: 140,
  },

  // === RESULT BAR ===
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resultCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  resultCountBold: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sortPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === RESULTS ===
  resultItem: {
    marginBottom: Spacing.md,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },

  // === HISTORY ===
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
  },
  historyClear: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  historyRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // === SUGGESTIONS ===
  suggestionsBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  suggestionCard: {
    // width appliquée inline (réactive) dans le rendu.
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionLabel: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
  },

  // === FILTER BOTTOM SHEET ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    // maxHeight appliquée inline (réactive) dans le rendu.
    ...centeredContent(CARD_MAX),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sheetEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sheetTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.9,
    lineHeight: 30,
  },

  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  filterTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 19,
    letterSpacing: -0.5,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterCardChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: '30%',
    flex: 1,
    position: 'relative',
  },
  filterChipEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  filterChipLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
  },
  filterChipCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterIconCard: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  filterIconCardLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  filterTextChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterTextChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // === TOGGLE CARD ===
  toggleCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
  },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
  },
  toggleSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  toggleSwitch: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleSwitchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 2 },
    }),
  },
  toggleDivider: {
    height: 1,
  },

  // === SHEET FOOTER ===
  sheetFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  sheetResetBtn: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetResetText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  sheetApplyBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    height: 50,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  sheetApplyText: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  sheetApplyArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
