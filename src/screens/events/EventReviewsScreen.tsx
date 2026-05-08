import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { feedbacksAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { Feedback, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';
import { extractPaginatedData, extractPaginationMeta } from '../../lib/utils/apiHelpers';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventReviews'>;
type RouteProps = RouteProp<RootStackParamList, 'EventReviews'>;

type SortOrder = 'recent' | 'top' | 'low';

interface State {
  feedbacks: Feedback[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  total: number;
  averageRating: number;
  sort: SortOrder;
  showForm: boolean;
  submitting: boolean;
  formRating: number;
  formComment: string;
  error: string | null;
}

const initialState: State = {
  feedbacks: [],
  page: 1,
  hasMore: true,
  loading: true,
  loadingMore: false,
  refreshing: false,
  total: 0,
  averageRating: 0,
  sort: 'recent',
  showForm: false,
  submitting: false,
  formRating: 5,
  formComment: '',
  error: null,
};

type Action =
  | { type: 'LOADING_START' }
  | { type: 'LOAD_FIRST_PAGE_SUCCESS'; items: Feedback[]; total: number; hasMore: boolean }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; items: Feedback[]; hasMore: boolean }
  | { type: 'REFRESH_START' }
  | { type: 'ERROR'; error: string }
  | { type: 'SET_SORT'; sort: SortOrder }
  | { type: 'TOGGLE_FORM'; show: boolean }
  | { type: 'SET_RATING'; rating: number }
  | { type: 'SET_COMMENT'; comment: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; feedback: Feedback }
  | { type: 'SUBMIT_END' };

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'LOADING_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_FIRST_PAGE_SUCCESS':
      return {
        ...state,
        feedbacks: a.items,
        total: a.total,
        hasMore: a.hasMore,
        page: 2,
        loading: false,
        refreshing: false,
        error: null,
      };
    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        feedbacks: [...state.feedbacks, ...a.items],
        hasMore: a.hasMore,
        page: state.page + 1,
        loadingMore: false,
      };
    case 'REFRESH_START':
      return { ...state, refreshing: true, error: null };
    case 'ERROR':
      return { ...state, loading: false, loadingMore: false, refreshing: false, error: a.error };
    case 'SET_SORT':
      return { ...state, sort: a.sort };
    case 'TOGGLE_FORM':
      return {
        ...state,
        showForm: a.show,
        formRating: a.show ? state.formRating : 5,
        formComment: a.show ? state.formComment : '',
      };
    case 'SET_RATING':
      return { ...state, formRating: a.rating };
    case 'SET_COMMENT':
      return { ...state, formComment: a.comment };
    case 'SUBMIT_START':
      return { ...state, submitting: true };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        showForm: false,
        feedbacks: [a.feedback, ...state.feedbacks],
        total: state.total + 1,
        formRating: 5,
        formComment: '',
      };
    case 'SUBMIT_END':
      return { ...state, submitting: false };
    default:
      return state;
  }
}

const PAGE_SIZE = 20;

function getOrderingParam(sort: SortOrder): string {
  switch (sort) {
    case 'top':
      return '-rating,-created_at';
    case 'low':
      return 'rating,-created_at';
    case 'recent':
    default:
      return '-created_at';
  }
}

export default function EventReviewsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, eventTitle } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Android uniquement : rendre la nav bar OPAQUE pendant que cet ecran est focus
  // (App.tsx la met en translucide par defaut, ce qui fait chevaucher le FAB).
  // On restaure le comportement translucide a la sortie.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      NavigationBar.setPositionAsync('relative');
      NavigationBar.setBackgroundColorAsync(colors.background);
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      return () => {
        // Restauration du style global defini dans App.tsx
        const bg = isDark ? 'rgba(15,15,26,0.78)' : 'rgba(250,250,248,0.78)';
        NavigationBar.setPositionAsync('absolute');
        NavigationBar.setBackgroundColorAsync(bg);
        NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      };
    }, [colors.background, isDark])
  );

  // === Data fetching ===

  const loadFirstPage = useCallback(
    async (sort: SortOrder = state.sort, asRefresh = false) => {
      if (asRefresh) dispatch({ type: 'REFRESH_START' });
      else dispatch({ type: 'LOADING_START' });

      try {
        const response = await feedbacksAPI.getFeedbacks({
          event: eventId,
          page: 1,
          page_size: PAGE_SIZE,
          ordering: getOrderingParam(sort),
        });
        const items = extractPaginatedData<Feedback>(response);
        const meta = extractPaginationMeta(response);
        dispatch({
          type: 'LOAD_FIRST_PAGE_SUCCESS',
          items,
          total: meta.count || items.length,
          hasMore: !!meta.next,
        });
      } catch (err: any) {
        if (__DEV__) console.error('Load reviews error:', err);
        dispatch({ type: 'ERROR', error: t('eventReviews.loadError') });
      }
    },
    [eventId, state.sort]
  );

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading || state.loadingMore) return;
    dispatch({ type: 'LOAD_MORE_START' });
    try {
      const response = await feedbacksAPI.getFeedbacks({
        event: eventId,
        page: state.page,
        page_size: PAGE_SIZE,
        ordering: getOrderingParam(state.sort),
      });
      const items = extractPaginatedData<Feedback>(response);
      const meta = extractPaginationMeta(response);
      dispatch({ type: 'LOAD_MORE_SUCCESS', items, hasMore: !!meta.next });
    } catch (err: any) {
      if (__DEV__) console.error('Load more reviews error:', err);
      dispatch({ type: 'ERROR', error: t('eventReviews.loadMoreError') });
    }
  }, [eventId, state.page, state.sort, state.hasMore, state.loading, state.loadingMore]);

  // Initial load + reload on sort change
  useEffect(() => {
    loadFirstPage(state.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sort]);

  // === Computed ===

  const averageRating = useMemo(() => {
    if (!state.feedbacks.length) return 0;
    const sum = state.feedbacks.reduce((s, f) => s + (f.rating || 0), 0);
    return sum / state.feedbacks.length;
  }, [state.feedbacks]);

  // === Submit ===

  const handleSubmitReview = useCallback(async () => {
    if (state.submitting) return;
    if (state.formRating < 1) {
      showAlert(t('eventReviews.ratingRequired'), t('eventReviews.ratingRequiredMessage'));
      return;
    }
    dispatch({ type: 'SUBMIT_START' });
    try {
      const response = await feedbacksAPI.createFeedback({
        event: eventId,
        rating: state.formRating,
        comment: state.formComment.trim(),
      });
      dispatch({ type: 'SUBMIT_SUCCESS', feedback: response.data });
      showAlert(t('eventReviews.thanks'), t('eventReviews.publishedSuccess'));
    } catch (err: any) {
      dispatch({ type: 'SUBMIT_END' });
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        t('eventReviews.publishError');
      showAlert(t('common.error'), message);
    }
  }, [eventId, state.formRating, state.formComment, state.submitting, showAlert, t]);

  // === Render helpers ===

  const renderHeader = () => (
    <View style={styles.headerStats}>
      <View style={styles.ratingSummary}>
        <Text style={[styles.avgRating, { color: colors.gray900 }]}>
          {averageRating > 0 ? averageRating.toFixed(1) : '—'}
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= Math.round(averageRating) ? 'star' : 'star-outline'}
              size={16}
              color={s <= Math.round(averageRating) ? Colors.warning : colors.gray300}
            />
          ))}
        </View>
        <Text style={[styles.totalText, { color: colors.gray500 }]}>
          {t('eventReviews.totalReviews', { count: state.total })}
        </Text>
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {(['recent', 'top', 'low'] as SortOrder[]).map((s) => {
          const active = state.sort === s;
          const label = s === 'recent' ? t('eventReviews.sortRecent') : s === 'top' ? t('eventReviews.sortTop') : t('eventReviews.sortLow');
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.sortChip,
                { backgroundColor: active ? colors.primary : colors.gray100 },
              ]}
              onPress={() => dispatch({ type: 'SET_SORT', sort: s })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.sortChipText,
                  { color: active ? Colors.white : colors.gray700 },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add review form (expanded) */}
      {user && state.showForm && (
        <View style={[styles.formCard, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <Text style={[styles.formTitle, { color: colors.gray900 }]}>{t('eventReviews.yourReview')}</Text>
          <View style={styles.ratingInputRow}>
            <Text style={[styles.ratingLabel, { color: colors.gray600 }]}>{t('eventReviews.noteLabel')}</Text>
            <View style={styles.ratingStarsInput}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => dispatch({ type: 'SET_RATING', rating: star })}
                  style={styles.ratingStarTouch}
                  accessibilityRole="button"
                  accessibilityLabel={t('eventReviews.noteStarA11y', { count: star })}
                >
                  <Ionicons
                    name={star <= state.formRating ? 'star' : 'star-outline'}
                    size={30}
                    color={star <= state.formRating ? Colors.warning : colors.gray300}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }]}
            placeholder={t('eventReviews.commentPlaceholder')}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={4}
            value={state.formComment}
            onChangeText={(text) => dispatch({ type: 'SET_COMMENT', comment: text })}
            textAlignVertical="top"
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.formCancelBtn}
              onPress={() => dispatch({ type: 'TOGGLE_FORM', show: false })}
              disabled={state.submitting}
            >
              <Text style={[styles.formCancelText, { color: colors.gray500 }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmitReview}
              disabled={state.submitting}
            >
              {state.submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.formSubmitText}>{t('eventReviews.publish')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: Feedback }) => {
      const displayName =
        item.user_name ||
        `${(item.user as any)?.first_name || ''} ${(item.user as any)?.last_name || ''}`.trim() ||
        t('eventReviews.userFallback');
      const initial = displayName[0]?.toUpperCase() || 'U';
      return (
        <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
          <View style={styles.reviewHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.gray900 }]} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= item.rating ? 'star' : 'star-outline'}
                    size={13}
                    color={s <= item.rating ? Colors.warning : colors.gray300}
                  />
                ))}
                {item.created_at && (
                  <Text style={[styles.dateText, { color: colors.gray400 }]}>
                    · {new Date(item.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
              </View>
            </View>
          </View>
          {item.comment && (
            <Text style={[styles.comment, { color: colors.gray700 }]}>{item.comment}</Text>
          )}
        </View>
      );
    },
    [colors, t]
  );

  const keyExtractor = useCallback((item: Feedback) => String(item.id), []);

  const ListFooter = () => {
    if (state.loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (!state.hasMore && state.feedbacks.length > 0) {
      return (
        <Text style={[styles.endText, { color: colors.gray400 }]}>
          {t('eventReviews.endText')}
        </Text>
      );
    }
    return null;
  };

  const ListEmpty = () => {
    if (state.loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="star-outline" size={48} color={colors.gray300} />
        <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>{t('eventReviews.emptyTitle')}</Text>
        <Text style={[styles.emptyText, { color: colors.gray500 }]}>
          {t('eventReviews.emptyMessage')}
        </Text>
      </View>
    );
  };

  // === Main render ===

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>★</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={[styles.topBarTitle, { color: colors.gray900 }]} numberOfLines={1}>
            {t('eventReviews.title')}
          </Text>
          {eventTitle && (
            <Text style={[styles.topBarSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
              {eventTitle}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {state.loading && state.feedbacks.length === 0 ? (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={state.feedbacks}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={() => loadFirstPage(state.sort, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 },
            state.feedbacks.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating CTA — Laisser un avis (utilisateurs connectes, form ferme)
          Positionnement dynamique : au-dessus de la nav bar systeme (safe area bottom) */}
      {user && !state.showForm && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primary, bottom: insets.bottom + Spacing.md },
          ]}
          onPress={() => dispatch({ type: 'TOGGLE_FORM', show: true })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('eventReviews.leaveReview')}
        >
          <Ionicons name="create-outline" size={20} color={Colors.white} />
          <Text style={styles.fabText}>{t('eventReviews.leaveReview')}</Text>
        </TouchableOpacity>
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
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  topBarTitle: {
    ...TextStyles.h4,
  },
  topBarSubtitle: {
    ...TextStyles.caption,
    marginTop: 2,
  },
  fullLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    // paddingBottom defini dynamiquement (insets.bottom + 120) pour FAB + nav bar
  },
  listContentEmpty: {
    flex: 1,
  },
  // Header (stats + sort + form)
  headerStats: {
    marginBottom: Spacing.lg,
  },
  ratingSummary: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avgRating: {
    ...TextStyles.hero,
    fontSize: 56,
    lineHeight: 56,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: Spacing.xs,
  },
  totalText: {
    ...TextStyles.small,
    marginTop: Spacing.xs,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  sortChipText: {
    ...TextStyles.smallBold,
  },
  // Form
  formCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  formTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.md,
  },
  ratingInputRow: {
    marginBottom: Spacing.md,
  },
  ratingLabel: {
    ...TextStyles.label,
    marginBottom: Spacing.xs,
  },
  ratingStarsInput: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  ratingStarTouch: {
    padding: 2,
  },
  formInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...TextStyles.body,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  formCancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  formCancelText: {
    ...TextStyles.smallBold,
  },
  formSubmitBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 110,
    alignItems: 'center',
  },
  formSubmitText: {
    ...TextStyles.button,
  },
  // Review card
  reviewCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TextStyles.bodyBold,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    ...TextStyles.bodyBold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  dateText: {
    ...TextStyles.caption,
    marginLeft: 4,
  },
  comment: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  // Footer / Empty
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  endText: {
    ...TextStyles.caption,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    ...TextStyles.h4,
    marginTop: Spacing.md,
  },
  emptyText: {
    ...TextStyles.small,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  // FAB (bottom positionne dynamiquement avec insets.bottom)
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    ...TextStyles.button,
  },
});
