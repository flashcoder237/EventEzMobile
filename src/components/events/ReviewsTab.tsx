import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feedback, User } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
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
}: ReviewsTabProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.reviewsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Avis des participants</Text>
        {user && !showReviewForm && (
          <TouchableOpacity
            style={[styles.addReviewButton, { backgroundColor: colors.primaryBg }]}
            onPress={() => setShowReviewForm(true)}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.addReviewText, { color: colors.primary }]}>Laisser un avis</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Review Form */}
      {showReviewForm && (
        <View style={[styles.reviewFormCard, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <Text style={[styles.reviewFormTitle, { color: colors.gray900 }]}>Votre avis</Text>

          {/* Rating Stars */}
          <View style={styles.ratingInputRow}>
            <Text style={[styles.ratingLabel, { color: colors.gray600 }]}>Note :</Text>
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
            style={[styles.reviewInput, { backgroundColor: colors.white, borderColor: colors.gray200, color: colors.gray900 }]}
            placeholder="Partagez votre experience (optionnel)"
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
              <Text style={[styles.cancelReviewText, { color: colors.gray500 }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={onSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitReviewText}>Soumettre</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loadingFeedbacks ? (
        <View style={styles.emptyTab}>
          <LoadingSpinner />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Chargement des avis...</Text>
        </View>
      ) : feedbacks && feedbacks.length > 0 ? (
        feedbacks.map((feedback, index) => (
          <View key={index} style={[styles.reviewCard, { backgroundColor: colors.gray50 }]}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewAvatarText}>
                  {feedback.user_name?.[0] || (feedback.user as any)?.first_name?.[0] || 'U'}
                </Text>
              </View>
              <View style={styles.reviewUserInfo}>
                <Text style={[styles.reviewUserName, { color: colors.gray900 }]}>
                  {feedback.user_name || `${(feedback.user as any)?.first_name || ''} ${(feedback.user as any)?.last_name || ''}`.trim() || 'Utilisateur'}
                </Text>
                <View style={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= feedback.rating ? 'star' : 'star-outline'}
                      size={14}
                      color={star <= feedback.rating ? '#FBBF24' : colors.gray300}
                    />
                  ))}
                </View>
              </View>
            </View>
            {feedback.comment && (
              <Text style={[styles.reviewComment, { color: colors.gray600 }]}>{feedback.comment}</Text>
            )}
          </View>
        ))
      ) : !showReviewForm ? (
        <View style={styles.emptyTab}>
          <Ionicons name="star-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Aucun avis pour le moment</Text>
          {user && (
            <TouchableOpacity
              style={[styles.firstReviewButton, { backgroundColor: colors.primaryBg }]}
              onPress={() => setShowReviewForm(true)}
            >
              <Text style={[styles.firstReviewText, { color: colors.primary }]}>Soyez le premier a donner votre avis</Text>
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
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
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
  // Reviews Header
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  addReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
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
  // Review Card
  reviewCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  reviewUserInfo: {
    marginLeft: Spacing.sm,
  },
  reviewUserName: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
});
