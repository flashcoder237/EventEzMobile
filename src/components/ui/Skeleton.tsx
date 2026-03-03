/**
 * Composants Skeleton
 * Placeholders de chargement animes avec shimmer gradient
 * Chaque skeleton reproduit fidelement la forme et disposition du vrai composant
 */

import React, { useEffect, memo } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue, Dimensions } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedLinearGradient = ReAnimated.createAnimatedComponent(LinearGradient);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  /** Largeur du skeleton */
  width?: DimensionValue;
  /** Hauteur du skeleton */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Style personnalise */
  style?: ViewStyle;
}

/**
 * Skeleton de base avec shimmer gradient
 */
function SkeletonComponent({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(translateX.value, [-1, 1], [-200, 200]) },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.gray100,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <AnimatedLinearGradient
        colors={[colors.gray100, colors.gray200, colors.gray100]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: '150%',
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export const Skeleton = memo(SkeletonComponent);

// ============================================
// EVENT CARD SKELETON (default variant)
// Matches EventCard.tsx default: image 200px + dateAccent + title + location + price
// Width: 82% of screen (like real card)
// ============================================
export const EventCardSkeleton = memo(function EventCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
      <Skeleton height={200} borderRadius={0} />
      <View style={styles.eventCardContent}>
        <Skeleton width="45%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="85%" height={16} style={{ marginBottom: 6 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Skeleton width={13} height={13} borderRadius={BorderRadius.full} />
          <Skeleton width="50%" height={12} />
        </View>
        <Skeleton width="35%" height={16} />
      </View>
    </View>
  );
});

// ============================================
// EVENT CARD HORIZONTAL SKELETON
// Matches EventCard.tsx horizontal: image 120x130 + dateAccent + title + location + price + bookmark
// ============================================
export const EventCardHorizontalSkeleton = memo(function EventCardHorizontalSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.eventCardHorizontal, { backgroundColor: colors.card }]}>
      <Skeleton width={120} height={130} borderRadius={0} />
      <View style={styles.eventCardHorizontalContent}>
        <Skeleton width="60%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="90%" height={16} style={{ marginBottom: 4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Skeleton width={13} height={13} borderRadius={BorderRadius.full} />
          <Skeleton width="55%" height={12} />
        </View>
        <Skeleton width="40%" height={14} />
      </View>
      <View style={styles.eventCardHorizontalBookmark}>
        <Skeleton width={20} height={20} borderRadius={BorderRadius.xs} />
      </View>
    </View>
  );
});

// ============================================
// CATEGORY CARD SKELETON (large variant)
// Matches CategoryCard.tsx large: 160x200 rectangle with rounded corners, gradient overlay
// ============================================
export const CategoryCardSkeleton = memo(function CategoryCardSkeleton() {
  return (
    <View style={styles.categoryCard}>
      <Skeleton width={160} height={200} borderRadius={BorderRadius['4xl']} />
    </View>
  );
});

// ============================================
// TICKET CARD SKELETON
// Matches MyTicketsScreen card: dateBadge(left) + header(typeBadge+statusBadge) + title + meta
// ============================================
export const TicketCardSkeleton = memo(function TicketCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.ticketCardRow}>
        {/* Date badge a gauche */}
        <View style={styles.ticketDateBadge}>
          <Skeleton width={30} height={22} borderRadius={BorderRadius.xs} />
          <Skeleton width={26} height={10} borderRadius={BorderRadius.xs} style={{ marginTop: 4 }} />
        </View>
        {/* Contenu principal */}
        <View style={styles.ticketCardContent}>
          {/* Header: type badge + status badge */}
          <View style={styles.ticketCardHeader}>
            <Skeleton width={90} height={20} borderRadius={BorderRadius.sm} />
            <Skeleton width={70} height={20} borderRadius={BorderRadius.sm} />
          </View>
          {/* Titre */}
          <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
          {/* Meta: time + location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Skeleton width={12} height={12} borderRadius={BorderRadius.full} />
              <Skeleton width={40} height={10} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Skeleton width={12} height={12} borderRadius={BorderRadius.full} />
              <Skeleton width={55} height={10} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

// ============================================
// MESSAGE SKELETON
// Matches conversation bubble: avatar + bubble with 2 text lines
// ============================================
export const MessageSkeleton = memo(function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.message, isOwn && styles.messageOwn]}>
      {!isOwn && <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: Spacing.sm }} />}
      <View style={[styles.messageBubble, { backgroundColor: colors.gray100 }]}>
        <Skeleton width={isOwn ? 150 : 180} height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width={isOwn ? 100 : 120} height={14} />
      </View>
    </View>
  );
});

// ============================================
// CONVERSATION ITEM SKELETON
// Matches MessagesScreen conversation card: avatar 40px + name + last message + time
// ============================================
export const ConversationItemSkeleton = memo(function ConversationItemSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.conversationItem, { borderBottomColor: colors.border }]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.conversationItemContent}>
        <Skeleton width="55%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="75%" height={12} />
      </View>
      <Skeleton width={35} height={10} />
    </View>
  );
});

// ============================================
// PROFILE SKELETON
// Matches profile screens: centered avatar + name + subtitle
// ============================================
export const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <Skeleton width={100} height={100} borderRadius={50} />
      <Skeleton width={150} height={20} style={{ marginTop: Spacing.md }} />
      <Skeleton width={100} height={14} style={{ marginTop: Spacing.sm }} />
    </View>
  );
});

// ============================================
// TEXT LINE SKELETON
// Generic single line placeholder
// ============================================
export const TextLineSkeleton = memo(function TextLineSkeleton({
  width = '100%',
  height = 14,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  return <Skeleton width={width} height={height} borderRadius={BorderRadius.xs} />;
});

// ============================================
// SKELETON LIST
// Renders multiple skeleton items. Component is optional (defaults to TextLineSkeleton)
// ============================================
export function SkeletonList({
  count = 3,
  Component = TextLineSkeleton,
  gap = Spacing.md,
}: {
  count?: number;
  Component?: React.ComponentType;
  gap?: number;
}) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ marginBottom: index < count - 1 ? gap : 0 }}>
          <Component />
        </View>
      ))}
    </View>
  );
}

// ============================================
// NOTIFICATION ITEM SKELETON
// Matches NotificationsScreen card: icon circle + title row(title+badge) + message + time
// Card style with borderRadius + borderWidth (not flat borderBottom)
// ============================================
export const NotificationItemSkeleton = memo(function NotificationItemSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.notificationItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.notificationItemContent}>
        <View style={styles.notificationItemHeader}>
          <Skeleton width="60%" height={14} />
          <Skeleton width={55} height={18} borderRadius={BorderRadius.sm} />
        </View>
        <Skeleton width="85%" height={12} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width={60} height={10} />
      </View>
    </View>
  );
});

// ============================================
// STAT CARD SKELETON
// Matches EventAnalyticsScreen StatCard: icon circle 44px + value + title
// Width: half screen
// ============================================
export const StatCardSkeleton = memo(function StatCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.gray50 }]}>
      <Skeleton width={44} height={44} borderRadius={22} style={{ marginBottom: Spacing.sm }} />
      <Skeleton width="50%" height={24} style={{ marginBottom: 2 }} />
      <Skeleton width="70%" height={12} />
    </View>
  );
});

// ============================================
// FORM SKELETON
// Generic form placeholder: label + input x4 + submit button
// ============================================
export const FormSkeleton = memo(function FormSkeleton() {
  return (
    <View style={styles.form}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.formField}>
          <Skeleton width="30%" height={12} style={{ marginBottom: Spacing.sm }} />
          <Skeleton height={44} borderRadius={BorderRadius.md} />
        </View>
      ))}
      <Skeleton height={48} borderRadius={BorderRadius.lg} style={{ marginTop: Spacing.md }} />
    </View>
  );
});

// ============================================
// DETAIL SCREEN SKELETON
// Matches EventDetailsScreen: banner 360px + back button + dateAccent + title + location + meta + description
// ============================================
export const DetailScreenSkeleton = memo(function DetailScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailScreen, { backgroundColor: colors.card }]}>
      {/* Banner */}
      <View>
        <Skeleton height={360} borderRadius={0} />
        {/* Floating back button placeholder */}
        <View style={styles.detailFloatingBtn}>
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        {/* Floating bookmark placeholder */}
        <View style={styles.detailFloatingBtnRight}>
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
      </View>
      <View style={styles.detailScreenContent}>
        {/* Date accent */}
        <Skeleton width="40%" height={12} style={{ marginBottom: Spacing.sm }} />
        {/* Title */}
        <Skeleton width="85%" height={24} style={{ marginBottom: Spacing.sm }} />
        {/* Location row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.lg }}>
          <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
          <Skeleton width="45%" height={14} />
        </View>
        {/* Meta row */}
        <View style={styles.detailScreenMeta}>
          <Skeleton width={100} height={12} />
          <Skeleton width={80} height={12} />
        </View>
        {/* Description lines */}
        <Skeleton width="100%" height={14} style={{ marginTop: Spacing.lg, marginBottom: Spacing.xs }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
});

// ============================================
// REGISTRATION ITEM SKELETON
// Matches EventRegistrationsScreen card: avatar circle + name/email + status badge + info row
// ============================================
export const RegistrationItemSkeleton = memo(function RegistrationItemSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.registrationItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header: avatar + name/email + status */}
      <View style={styles.registrationHeader}>
        <View style={styles.registrationParticipant}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Skeleton width="55%" height={14} style={{ marginBottom: 4 }} />
            <Skeleton width="70%" height={12} />
          </View>
        </View>
        <Skeleton width={72} height={22} borderRadius={BorderRadius.sm} />
      </View>
      {/* Info row */}
      <View style={[styles.registrationInfo, { borderTopColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
          <Skeleton width={80} height={12} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
          <Skeleton width={60} height={12} />
        </View>
      </View>
    </View>
  );
});

// ============================================
// DISCOUNT CARD SKELETON
// Matches DiscountManagementScreen card: code badge + status + value + dates + usage bar
// ============================================
export const DiscountCardSkeleton = memo(function DiscountCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.discountCard, { backgroundColor: colors.card }]}>
      {/* Header: code + status */}
      <View style={styles.discountHeader}>
        <Skeleton width={90} height={28} borderRadius={BorderRadius.md} />
        <Skeleton width={60} height={22} borderRadius={BorderRadius.sm} />
      </View>
      {/* Value */}
      <Skeleton width="40%" height={22} style={{ marginBottom: 4 }} />
      <Skeleton width="30%" height={12} style={{ marginBottom: Spacing.md }} />
      {/* Dates row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm }}>
        <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
        <Skeleton width="60%" height={12} />
      </View>
      {/* Usage row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
        <Skeleton width="45%" height={12} />
      </View>
    </View>
  );
});

// ============================================
// STYLES
// All theme-aware (no hardcoded Colors references)
// ============================================
const styles = StyleSheet.create({
  // Event Card (default)
  eventCard: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  eventCardContent: {
    padding: Spacing.md,
  },

  // Event Card Horizontal
  eventCardHorizontal: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  eventCardHorizontalContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  eventCardHorizontalBookmark: {
    padding: Spacing.md,
    justifyContent: 'center',
  },

  // Category Card (large variant)
  categoryCard: {
    marginRight: Spacing.md,
  },

  // Ticket Card (MyTicketsScreen layout)
  ticketCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  ticketCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketDateBadge: {
    width: 56,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCardContent: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Message
  message: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  messageOwn: {
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxWidth: '70%',
  },

  // Conversation Item
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  conversationItemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  // Profile
  profile: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  // Notification Item (card style)
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  notificationItemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  notificationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },

  // Stat Card
  statCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: (SCREEN_WIDTH - Spacing.lg * 3) / 2,
  },

  // Form
  form: {
    padding: Spacing.md,
  },
  formField: {
    marginBottom: Spacing.md,
  },

  // Detail Screen
  detailScreen: {
    flex: 1,
  },
  detailScreenContent: {
    padding: Spacing.md,
  },
  detailScreenMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailFloatingBtn: {
    position: 'absolute',
    top: 50,
    left: Spacing.md,
  },
  detailFloatingBtnRight: {
    position: 'absolute',
    top: 50,
    right: Spacing.md,
  },

  // Registration Item
  registrationItem: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  registrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  registrationParticipant: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  registrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },

  // Discount Card
  discountCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
});

export default Skeleton;
