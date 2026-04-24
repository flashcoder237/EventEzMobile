import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { eventsAPI, categoriesAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useTabletLayout } from '../../hooks/useTabletLayout';
import { Event, Category, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';
import { getApiResults, extractPaginationMeta } from '../../lib/utils/apiHelpers';
import { getEventPriceRange } from '../../lib/utils/priceFormatters';
import EventCard from '../../components/events/EventCard';
import { EmptyState } from '../../components/ui';
import { EventCardSkeleton, SkeletonList } from '../../components/ui/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventSearch'>;
type RouteProps = RouteProp<RootStackParamList, 'EventSearch'>;

type SortOption = 'date' | 'popularity' | 'price_asc' | 'price_desc';

const PAGE_SIZE = 20;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface State {
  query: string;
  debouncedQuery: string;
  categoryId: number | null;
  sortBy: SortOption;
  results: Event[];
  page: number;
  hasMore: boolean;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  categories: Category[];
  showSortMenu: boolean;
}

type Action =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_DEBOUNCED'; query: string }
  | { type: 'SET_CATEGORY'; id: number | null }
  | { type: 'SET_SORT'; sort: SortOption }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_FIRST_PAGE'; results: Event[]; total: number; hasMore: boolean }
  | { type: 'SEARCH_MORE_START' }
  | { type: 'SEARCH_MORE_SUCCESS'; results: Event[]; hasMore: boolean }
  | { type: 'SEARCH_ERROR' }
  | { type: 'SET_CATEGORIES'; cats: Category[] }
  | { type: 'TOGGLE_SORT_MENU'; show?: boolean }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.query };
    case 'SET_DEBOUNCED':
      return { ...state, debouncedQuery: action.query };
    case 'SET_CATEGORY':
      return { ...state, categoryId: action.id };
    case 'SET_SORT':
      return { ...state, sortBy: action.sort, showSortMenu: false };
    case 'SEARCH_START':
      return { ...state, loading: true, page: 1 };
    case 'SEARCH_FIRST_PAGE':
      return {
        ...state,
        loading: false,
        results: action.results,
        total: action.total,
        hasMore: action.hasMore,
        page: 2,
      };
    case 'SEARCH_MORE_START':
      return { ...state, loadingMore: true };
    case 'SEARCH_MORE_SUCCESS':
      return {
        ...state,
        loadingMore: false,
        results: [...state.results, ...action.results],
        hasMore: action.hasMore,
        page: state.page + 1,
      };
    case 'SEARCH_ERROR':
      return { ...state, loading: false, loadingMore: false };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.cats };
    case 'TOGGLE_SORT_MENU':
      return { ...state, showSortMenu: action.show ?? !state.showSortMenu };
    case 'RESET':
      return {
        ...state,
        query: '',
        debouncedQuery: '',
        results: [],
        total: 0,
        page: 1,
        hasMore: false,
      };
    default:
      return state;
  }
}

const initialState: State = {
  query: '',
  debouncedQuery: '',
  categoryId: null,
  sortBy: 'date',
  results: [],
  page: 1,
  hasMore: false,
  total: 0,
  loading: false,
  loadingMore: false,
  categories: [],
  showSortMenu: false,
};

const getOrderingParam = (sort: SortOption): string => {
  switch (sort) {
    case 'popularity': return '-registration_count';
    case 'price_asc': return 'min_price';
    case 'price_desc': return '-min_price';
    case 'date':
    default: return 'start_date';
  }
};

const SORT_OPTIONS: { key: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'date', label: 'Date', icon: 'calendar-outline' },
  { key: 'popularity', label: 'Popularite', icon: 'trending-up-outline' },
  { key: 'price_asc', label: 'Prix croissant', icon: 'arrow-up-outline' },
  { key: 'price_desc', label: 'Prix decroissant', icon: 'arrow-down-outline' },
];

export default function EventSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const initialCategory = route.params?.category ?? null;
  const initialQuery = route.params?.query ?? '';

  const { colors } = useTheme();
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
  });

  const inputRef = useRef<TextInput>(null);

  // === Autofocus au mount (si pas deja une requete preremplie) ===
  useEffect(() => {
    if (!initialQuery && !initialCategory) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [initialQuery, initialCategory]);

  // === Charge les categories (cheap, pour les chips) ===
  useEffect(() => {
    categoriesAPI.getCategories()
      .then(res => {
        const cats = getApiResults<Category>(res);
        dispatch({ type: 'SET_CATEGORIES', cats });
      })
      .catch(err => __DEV__ && console.error('categories:', err));
  }, []);

  // === Debounce query (300ms) ===
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch({ type: 'SET_DEBOUNCED', query: state.query });
    }, 300);
    return () => clearTimeout(t);
  }, [state.query]);

  // === Fire search when debounced query or filters change ===
  const doSearch = useCallback(
    async (page: number, append: boolean) => {
      const hasFilter = state.debouncedQuery.trim().length >= 2 || state.categoryId !== null;
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
        if (state.categoryId) params.category = state.categoryId;

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
          // Enregistre dans l'historique si recherche textuelle >= 2 chars
          if (state.debouncedQuery.trim().length >= 2) {
            addSearchHistory(state.debouncedQuery.trim());
          }
        }
      } catch (err) {
        if (__DEV__) console.error('Search error:', err);
        dispatch({ type: 'SEARCH_ERROR' });
      }
    },
    [state.debouncedQuery, state.categoryId, state.sortBy, addSearchHistory]
  );

  useEffect(() => {
    doSearch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.debouncedQuery, state.categoryId, state.sortBy]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading || state.loadingMore) return;
    doSearch(state.page, true);
  }, [state.hasMore, state.loading, state.loadingMore, state.page, doSearch]);

  // === Handlers ===
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
      eventId: event.id,
      imageUrl: event.banner_image || event.category?.default_event_image || event.display_image,
    });
  };

  // === Render helpers ===

  const hasActiveSearch = state.debouncedQuery.trim().length >= 2 || state.categoryId !== null;

  const renderCategoryChips = () => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={[{ id: null, name: 'Toutes' } as any, ...state.categories]}
      keyExtractor={(item) => `cat-${item.id ?? 'all'}`}
      contentContainerStyle={styles.chipsList}
      renderItem={({ item }) => {
        const isActive = state.categoryId === item.id;
        return (
          <TouchableOpacity
            style={[
              styles.chip,
              isActive
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.gray100 },
            ]}
            onPress={() => dispatch({ type: 'SET_CATEGORY', id: item.id })}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? Colors.white : colors.gray700 },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderHistoryItem = ({ item }: { item: string }) => (
    <View style={[styles.historyRow, { borderBottomColor: colors.gray100 }]}>
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => handleSelectHistory(item)}
        accessibilityRole="button"
      >
        <Ionicons name="time-outline" size={18} color={colors.gray500} />
        <Text style={[styles.historyText, { color: colors.gray900 }]} numberOfLines={1}>{item}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => removeSearchHistoryEntry(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Supprimer ${item} de l'historique`}
      >
        <Ionicons name="close" size={16} color={colors.gray400} />
      </TouchableOpacity>
    </View>
  );

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
            location={item.location_city || item.location_address || 'Lieu a confirmer'}
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
            onPress={() => handleEventPress(item)}
          />
        </View>
      );
    },
    [columns, platformCurrency, navigation]
  );

  // === Main render ===

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>Q?</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      {/* Header : back + search input + sort button */}
      <View style={[styles.topBar, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>

        <View style={[styles.searchBox, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <Ionicons name="search" size={18} color={colors.gray500} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.gray900 }]}
            placeholder="Rechercher un evenement..."
            placeholderTextColor={colors.gray400}
            value={state.query}
            onChangeText={(text) => dispatch({ type: 'SET_QUERY', query: text })}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {state.query.length > 0 && (
            <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.gray50 }]}
          onPress={() => dispatch({ type: 'TOGGLE_SORT_MENU' })}
          accessibilityRole="button"
          accessibilityLabel="Trier les resultats"
        >
          <Ionicons name="funnel-outline" size={20} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Sort menu (simple dropdown) */}
      {state.showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = state.sortBy === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortMenuItem, isActive && { backgroundColor: colors.primaryBg }]}
                onPress={() => dispatch({ type: 'SET_SORT', sort: opt.key })}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={isActive ? colors.primary : colors.gray600}
                />
                <Text
                  style={[
                    styles.sortMenuText,
                    { color: isActive ? colors.primary : colors.gray800 },
                  ]}
                >
                  {opt.label}
                </Text>
                {isActive && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Category chips (toujours visibles pour filtrage rapide) */}
      {state.categories.length > 0 && (
        <View style={styles.chipsContainer}>
          {renderCategoryChips()}
        </View>
      )}

      {/* Total count */}
      {hasActiveSearch && !state.loading && state.total > 0 && (
        <Text style={[styles.resultCount, { color: colors.gray500 }]}>
          {state.total} resultat{state.total > 1 ? 's' : ''}
        </Text>
      )}

      {/* Content */}
      {!hasActiveSearch ? (
        // Empty state : search history + suggestions
        <View style={{ flex: 1 }}>
          {history.length > 0 ? (
            <FlatList
              data={history}
              keyExtractor={(item) => item}
              renderItem={renderHistoryItem}
              ListHeaderComponent={
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyTitle, { color: colors.gray900 }]}>
                    Recherches recentes
                  </Text>
                  <TouchableOpacity onPress={clearSearchHistory} accessibilityRole="button">
                    <Text style={[styles.historyClear, { color: colors.primary }]}>
                      Tout effacer
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyHint}>
              <Ionicons name="search-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyHintTitle, { color: colors.gray900 }]}>
                Rechercher un evenement
              </Text>
              <Text style={[styles.emptyHintText, { color: colors.gray500 }]}>
                Saisissez un mot-cle ou choisissez une categorie
              </Text>
            </View>
          )}
        </View>
      ) : state.loading && state.results.length === 0 ? (
        // Loading skeleton
        <View style={{ flex: 1, paddingHorizontal: containerPadding, paddingTop: Spacing.sm }}>
          <SkeletonList count={4} Component={EventCardSkeleton} />
        </View>
      ) : state.results.length === 0 ? (
        // No results
        <EmptyState
          icon="search-outline"
          title="Aucun resultat"
          description="Essayez d'autres mots-cles ou de changer les filtres."
        />
      ) : (
        <FlatList
          data={state.results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEvent}
          numColumns={columns > 1 ? columns : 1}
          key={`list-${columns}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingHorizontal: containerPadding, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={10}
          maxToRenderPerBatch={10}
          ListFooterComponent={
            state.loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    padding: 0,
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortMenu: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  sortMenuText: {
    flex: 1,
    ...TextStyles.bodyBold,
  },
  chipsContainer: {
    paddingVertical: Spacing.sm,
  },
  chipsList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    ...TextStyles.smallBold,
  },
  resultCount: {
    ...TextStyles.caption,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  resultItem: {
    marginBottom: Spacing.md,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  // History
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  historyTitle: {
    ...TextStyles.h4,
  },
  historyClear: {
    ...TextStyles.smallBold,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  historyItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  historyText: {
    ...TextStyles.body,
    flex: 1,
  },
  // Empty hint
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyHintTitle: {
    ...TextStyles.h4,
    marginTop: Spacing.md,
  },
  emptyHintText: {
    ...TextStyles.small,
    textAlign: 'center',
  },
});
