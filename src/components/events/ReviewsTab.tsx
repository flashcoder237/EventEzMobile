import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Feedback, User, RootStackParamList } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../ui/LoadingOverlay';

export interface ReviewsTabProps {
  feedbacks: Feedback[];
  loadingFeedbacks: boolean;
  user: User | null;
  showReviewForm: boolean;
  setShowReviewForm: (show: boolean) => void;
  reviewRating: number;
  setReviewRating: (rating: number) => void;
  reviewComment: string;
  setReviewComment: (comment: string) => void;
  submittingReview: boolean;
  onSubmitReview: () => void;
  eventId?: string;
  eventTitle?: string;
}

export default function ReviewsTab({
  feedbacks,
  loadingFeedbacks,
  user,
  showReviewForm,
  setShowReviewForm,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  submittingReview,
  onSubmitReview,
  eventId,
  eventTitle,
}: ReviewsTabProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Pagination locale : on affiche INITIAL_COUNT avis, puis tous au clic sur "Voir plus".
  // Au-dela de BACKEND_CAP avis, on redirige vers l'ecran dedie (scroll infini serveur).
  const INITIAL_COUNT = 3;
  const BACKEND_CAP = 20; // correspond au [:20] dans EventDetailSerializer
  const [showAll, setShowAll] = useState(false);

  const visibleFeedbacks = useMemo(() => {
    if (!feedbacks) return [];
    return showAll ? feedbacks : feedbacks.slice(0, INITIAL_COUNT);
  }, [feedbacks, showAll]);

  const hiddenCount = feedbacks ? Math.max(0, feedbacks.length - INITIAL_COUNT) : 0;
  const mightHaveMore = feedbacks && feedbacks.length >= BACKEND_CAP && !!eventId;

  const goToFullList = () => {
    if (!eventId) return;
    navigation.navigate('EventReviews', { eventId, eventTitle });
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('componentsEvents.reviewsEyebrow')}</Text>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('componentsEvents.reviewsSectionTitle')}</Text>

      {/* Review Form */}
      {showReviewForm && (
        <View style={[styles.reviewFormCard, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <Text style={[styles.reviewFormTitle, { color: colors.gray900 }]}>{t('componentsEvents.reviewsFormTitle')}</Text>

          {/* Rating Stars */}
          <View style={styles.ratingInputRow}>
            <Text style={[styles.ratingLabel, { color: colors.gray600 }]}>{t('componentsEvents.reviewsRatingLabel')}</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.ratingStar}
                >
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={28}
                    color={star <= reviewRating ? '#FBBF24' : colors.gray300}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Comment Input */}
          <TextInput
            style={[styles.reviewInput, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }]}
            placeholder={t('componentsEvents.reviewsCommentPlaceholder')}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={4}
            value={reviewComment}
            onChangeText={setReviewComment}
            textAlignVertical="top"
          />

          {/* Actions */}
          <View style={styles.reviewFormActions}>
            <TouchableOpacity
              style={styles.cancelReviewButton}
              onPress={() => {
                setShowReviewForm(false);
                setReviewComment('');
                setReviewRating(5);
              }}
            >
              <Text style={[styles.cancelReviewText, { color: colors.gray500 }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={onSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitReviewText}>{t('componentsEvents.reviewsSubmit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loadingFeedbacks ? (
        <View style={styles.emptyTab}>
          <LoadingSpinner />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>{t('componentsEvents.reviewsLoading')}</Text>
        </View>
      ) : feedbacks && feedbacks.length > 0 ? (
        <>
          {visibleFeedbacks.map((feedback, index) => (
            <View key={index} style={[styles.reviewCard, { backgroundColor: colors.gray50 }]}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.reviewAvatarText}>
                    {feedback.user_name?.[0] || (feedback.user as any)?.first_name?.[0] || 'U'}
                  </Text>
                </View>
                <View style={styles.reviewUserInfo}>
                  <Text style={[styles.reviewUserName, { color: colors.gray900 }]}>
                    {feedback.user_name || `${(feedback.user as any)?.first_name || ''} ${(feedback.user as any)?.last_name || ''}`.trim() || t('componentsEvents.reviewsFallbackUser')}
                  </Text>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= feedback.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={star <= feedback.rating ? Colors.warning : colors.gray300}
                      />
                    ))}
                  </View>
                </View>
              </View>
              {feedback.comment && (
                <Text style={[styles.reviewComment, { color: colors.gray700 }]}>{feedback.comment}</Text>
              )}
            </View>
          ))}

          {/* Toggle "Voir plus" / "Voir moins" si > INITIAL_COUNT */}
          {hiddenCount > 0 && (
            <TouchableOpacity
              style={[styles.showMoreBtn, { borderColor: colors.gray200 }]}
              onPress={() => setShowAll((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showAll ? t('componentsEvents.reviewsCollapseA11y') : t('componentsEvents.reviewsExpandA11y', { count: hiddenCount })}
            >
              <Text style={[styles.showMoreText, { color: colors.primary }]}>
                {showAll ? t('componentsEvents.reviewsViewLess') : t('componentsEvents.reviewsViewMore', { count: hiddenCount })}
              </Text>
              <Ionicons
                name={showAll ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}

          {/* Lien vers l'ecran dedie si on a atteint le cap backend (20) — il y en a peut-etre plus */}
          {showAll && mightHaveMore && (
            <TouchableOpacity
              style={[styles.showAllBtn, { backgroundColor: colors.primaryBg }]}
              onPress={goToFullList}
              accessibilityRole="button"
              accessibilityLabel={t('componentsEvents.reviewsViewAllA11y')}
            >
              <Ionicons name="list-outline" size={18} color={colors.primary} />
              <Text style={[styles.showAllText, { color: colors.primary }]}>
                {t('componentsEvents.reviewsViewAll')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* CTA "Laisser un avis" en BAS, apres les avis */}
          {user && !showReviewForm && (
            <TouchableOpacity
              style={[styles.bottomReviewCta, { backgroundColor: colors.primaryBg }]}
              onPress={() => setShowReviewForm(true)}
              accessibilityRole="button"
              accessibilityLabel={t('componentsEvents.reviewsLeaveA11y')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.bottomReviewCtaText, { color: colors.primary }]}>
                {t('componentsEvents.reviewsLeave')}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : !showReviewForm ? (
        <View style={styles.emptyTab}>
          <Ionicons name="star-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>{t('componentsEvents.reviewsEmpty')}</Text>
          {user && (
            <TouchableOpacity
              style={[styles.firstReviewButton, { backgroundColor: colors.primaryBg }]}
              onPress={() => setShowReviewForm(true)}
            >
              <Text style={[styles.firstReviewText, { color: colors.primary }]}>{t('componentsEvents.reviewsBeFirst')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    ...TextStyles.eyebrow,
    marginBottom: 6,
  },
  sectionTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  // CTA "Laisser un avis" en bas de liste
  bottomReviewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  bottomReviewCtaText: {
    ...TextStyles.bodyBold,
  },
  // Toggle "Voir plus"
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  showMoreText: {
    ...TextStyles.smallBold,
  },
  // Lien "Voir tous les avis" -> ecran dedie
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  showAllText: {
    ...TextStyles.bodyBold,
    flex: 1,
    textAlign: 'center',
  },
  // Review Form
  reviewFormCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  reviewFormTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  ratingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ratingLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
    marginRight: Spacing.md,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingStar: {
    padding: 2,
  },
  reviewInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  reviewFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  cancelReviewButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cancelReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  submitReviewButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  submitReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  firstReviewButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  firstReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  // Review Card — hiérarchie typo claire :
  // userName (bodyBold 16px) > comment (body 15px) > avatar initial/rating (small bold 14px)
  reviewCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  reviewUserInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  reviewUserName: {
    ...TextStyles.bodyBold,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  reviewComment: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
});
