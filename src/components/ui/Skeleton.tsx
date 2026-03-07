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
// SKELETON SUR FOND PRIMAIRE (blanc semi-transparent)
// Pour les headers avec backgroundColor: colors.primary
// ============================================

function PrimarySkeletonComponent({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
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
          backgroundColor: 'rgba(255,255,255,0.18)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <AnimatedLinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0.06)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '150%' },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export const PrimarySkeleton = memo(PrimarySkeletonComponent);

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
// Matches MyTicketsScreen card: dateBadge(left) + header(typeBadge+statusBadge) + title + meta + qrButton(right)
// ============================================
export const TicketCardSkeleton = memo(function TicketCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.ticketCardRow}>
        {/* Date badge a gauche */}
        <View style={[styles.ticketDateBadge, { backgroundColor: colors.gray200 }]}>
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
          <Skeleton width="80%" height={16} style={{ marginBottom: 6 }} />
          {/* Meta: time + location + ref */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Skeleton width={12} height={12} borderRadius={BorderRadius.full} />
              <Skeleton width={40} height={10} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Skeleton width={12} height={12} borderRadius={BorderRadius.full} />
              <Skeleton width={55} height={10} />
            </View>
            <Skeleton width={50} height={16} borderRadius={BorderRadius.sm} />
          </View>
          {/* Registration date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Skeleton width={10} height={10} borderRadius={BorderRadius.full} />
            <Skeleton width={80} height={10} />
          </View>
        </View>
        {/* QR button a droite */}
        <View style={[styles.ticketQrButton, { backgroundColor: colors.gray200 }]}>
          <Skeleton width={20} height={20} borderRadius={BorderRadius.xs} />
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
// DISCOVER SCREEN SKELETON (full page)
// Matches DiscoverScreen: header + featured horizontal scroll + section titles + event cards
// ============================================
export const DiscoverScreenSkeleton = memo(function DiscoverScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar placeholder */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
        <Skeleton height={44} borderRadius={BorderRadius.full} />
      </View>
      {/* Featured section title */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
        <Skeleton width="40%" height={18} />
      </View>
      {/* Featured horizontal cards */}
      <View style={{ flexDirection: 'row', paddingLeft: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.xl }}>
        <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
          <Skeleton height={200} borderRadius={0} />
          <View style={styles.eventCardContent}>
            <Skeleton width="45%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={16} style={{ marginBottom: 6 }} />
            <Skeleton width="35%" height={16} />
          </View>
        </View>
        <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
          <Skeleton height={200} borderRadius={0} />
          <View style={styles.eventCardContent}>
            <Skeleton width="45%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={16} style={{ marginBottom: 6 }} />
            <Skeleton width="35%" height={16} />
          </View>
        </View>
      </View>
      {/* Upcoming section */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
        <Skeleton width="55%" height={18} />
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        <EventCardHorizontalSkeleton />
        <EventCardHorizontalSkeleton />
        <EventCardHorizontalSkeleton />
      </View>
    </View>
  );
});

// ============================================
// MY TICKETS SCREEN SKELETON (full page)
// Matches MyTicketsScreen: header + search + tabs + type filters + ticket cards
// ============================================
export const MyTicketsScreenSkeleton = memo(function MyTicketsScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header: title + action buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
        <Skeleton width="55%" height={24} />
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
      </View>
      {/* Search bar */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <Skeleton height={40} borderRadius={BorderRadius.lg} />
      </View>
      {/* Tabs row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm }}>
        <Skeleton width={90} height={36} borderRadius={BorderRadius.full} />
        <Skeleton width={80} height={36} borderRadius={BorderRadius.full} />
        <Skeleton width={85} height={36} borderRadius={BorderRadius.full} />
      </View>
      {/* Type filter chips */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm }}>
        <Skeleton width={75} height={30} borderRadius={BorderRadius.full} />
        <Skeleton width={85} height={30} borderRadius={BorderRadius.full} />
        <Skeleton width={100} height={30} borderRadius={BorderRadius.full} />
      </View>
      {/* Ticket cards */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm }}>
        <TicketCardSkeleton />
        <TicketCardSkeleton />
        <TicketCardSkeleton />
        <TicketCardSkeleton />
      </View>
    </View>
  );
});

// ============================================
// FOLLOWING EVENT CARD SKELETON
// Matches FollowingEventsScreen card: dateBadge(56) + image(80) + content(title+meta+actions) + arrow
// ============================================
export const FollowingEventCardSkeleton = memo(function FollowingEventCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.followingCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      {/* Date badge */}
      <View style={[styles.followingDateBadge, { backgroundColor: colors.gray200 }]}>
        <Skeleton width={28} height={22} borderRadius={BorderRadius.xs} />
        <Skeleton width={26} height={10} borderRadius={BorderRadius.xs} style={{ marginTop: 4 }} />
      </View>
      {/* Image */}
      <Skeleton width={80} height={120} borderRadius={0} />
      {/* Content */}
      <View style={styles.followingContent}>
        <Skeleton width="85%" height={14} style={{ marginBottom: Spacing.xs }} />
        {/* Meta row */}
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
            <Skeleton width={55} height={12} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
            <Skeleton width={50} height={12} />
          </View>
        </View>
        {/* Actions row */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Skeleton width={90} height={28} borderRadius={BorderRadius.md} />
          <Skeleton width={32} height={32} borderRadius={16} />
        </View>
      </View>
      {/* Arrow */}
      <View style={{ justifyContent: 'center', paddingRight: Spacing.sm }}>
        <Skeleton width={12} height={20} borderRadius={BorderRadius.xs} />
      </View>
    </View>
  );
});

// ============================================
// FOLLOWING SCREEN SKELETON (full page)
// Matches FollowingEventsScreen: header + summary card + search + tabs + event cards
// ============================================
export const FollowingScreenSkeleton = memo(function FollowingScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header: back + title + compass */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={100} height={20} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
      {/* Summary card */}
      <View style={[styles.followingSummaryCard, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View>
            <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
            <Skeleton width={110} height={14} />
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.gray100, marginVertical: Spacing.md }} />
        <View style={{ flexDirection: 'row', gap: Spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Skeleton width={16} height={16} borderRadius={BorderRadius.full} />
            <Skeleton width={65} height={14} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Skeleton width={16} height={16} borderRadius={BorderRadius.full} />
            <Skeleton width={65} height={14} />
          </View>
        </View>
      </View>
      {/* Search */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Skeleton height={40} borderRadius={BorderRadius.lg} />
      </View>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm }}>
        <Skeleton width={90} height={36} borderRadius={BorderRadius.lg} style={{ flex: 1 }} />
        <Skeleton width={90} height={36} borderRadius={BorderRadius.lg} style={{ flex: 1 }} />
        <Skeleton width={90} height={36} borderRadius={BorderRadius.lg} style={{ flex: 1 }} />
      </View>
      {/* Event cards */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md }}>
        <FollowingEventCardSkeleton />
        <FollowingEventCardSkeleton />
        <FollowingEventCardSkeleton />
        <FollowingEventCardSkeleton />
      </View>
    </View>
  );
});

// ============================================
// PAYMENT CARD SKELETON
// Matches MyPaymentsScreen card: icon + amount + method + date + status badge
// ============================================
export const PaymentCardSkeleton = memo(function PaymentCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1 }}>
          <Skeleton width="50%" height={16} style={{ marginBottom: 4 }} />
          <Skeleton width="35%" height={12} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Skeleton width={80} height={16} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={20} borderRadius={BorderRadius.sm} />
        </View>
      </View>
    </View>
  );
});

// ============================================
// MESSAGES SCREEN SKELETON (full page)
// Matches MessagesScreen: primary header (back + icon + title + newBtn) + search + tabs + conversations
// ============================================
export const MessagesScreenSkeleton = memo(function MessagesScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      {/* Header primary */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        {/* Row: back | icon+title | new */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <PrimarySkeleton width={40} height={40} borderRadius={20} style={{ marginRight: Spacing.md }} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <PrimarySkeleton width={40} height={40} borderRadius={20} />
            <View style={{ gap: 5 }}>
              <PrimarySkeleton width={100} height={16} borderRadius={BorderRadius.sm} />
              <PrimarySkeleton width={80} height={12} borderRadius={BorderRadius.sm} />
            </View>
          </View>
          <PrimarySkeleton width={32} height={32} borderRadius={16} />
        </View>

        {/* Search bar (card bg) */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderRadius: BorderRadius.lg,
          paddingHorizontal: Spacing.md,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          marginBottom: Spacing.sm,
        }}>
          <PrimarySkeleton width={18} height={18} borderRadius={9} />
          <PrimarySkeleton width="70%" height={14} borderRadius={BorderRadius.sm} />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.sm }}>
          <PrimarySkeleton height={34} borderRadius={BorderRadius.md} style={{ flex: 1 }} />
          <PrimarySkeleton height={34} borderRadius={BorderRadius.md} style={{ flex: 1 }} />
        </View>
      </View>

      {/* Conversations list */}
      <View style={{ flex: 1, backgroundColor: colors.gray50, paddingTop: Spacing.xs }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationItemSkeleton key={i} />
        ))}
      </View>
    </View>
  );
});

// ============================================
// NOTIFICATIONS SCREEN SKELETON (full page)
// Matches NotificationsScreen: primary header (back+icon+title) + statsRow + filters + notification cards
// ============================================
export const NotificationsScreenSkeleton = memo(function NotificationsScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      {/* Header primary */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg }}>
        {/* Row: back | icon circle | title/subtitle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
          <PrimarySkeleton width={40} height={40} borderRadius={20} />
          <PrimarySkeleton width={40} height={40} borderRadius={20} />
          <View style={{ gap: 5 }}>
            <PrimarySkeleton width={130} height={18} borderRadius={BorderRadius.sm} />
            <PrimarySkeleton width={200} height={12} borderRadius={BorderRadius.sm} />
          </View>
        </View>

        {/* Stats row: 3 colonnes */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <PrimarySkeleton width={40} height={24} borderRadius={BorderRadius.sm} />
                <PrimarySkeleton width={55} height={12} borderRadius={BorderRadius.sm} />
              </View>
              {i < 2 && (
                <View style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Filters bar (card bg) */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Skeleton width={75} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={85} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={70} height={32} borderRadius={BorderRadius.full} />
        </View>
      </View>

      {/* Notifications list */}
      <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
        {/* Section header */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs }}>
          <Skeleton width={80} height={12} borderRadius={BorderRadius.sm} />
        </View>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={`a-${i}`} style={{ paddingHorizontal: Spacing.lg }}>
            <NotificationItemSkeleton />
          </View>
        ))}
        {/* Section header 2 */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs }}>
          <Skeleton width={40} height={12} borderRadius={BorderRadius.sm} />
        </View>
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={`b-${i}`} style={{ paddingHorizontal: Spacing.lg }}>
            <NotificationItemSkeleton />
          </View>
        ))}
      </View>
    </View>
  );
});

// ============================================
// MY EVENT CARD SKELETON
// Matches MyEventsScreen card: banner 160px + statusBadge + title + 2 meta rows + statsRow + actionsRow
// ============================================
export const MyEventCardSkeleton = memo(function MyEventCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.myEventCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      {/* Banner */}
      <Skeleton height={160} borderRadius={0} />
      {/* Status badge placeholder */}
      <View style={styles.myEventBadge}>
        <Skeleton width={75} height={22} borderRadius={BorderRadius.full} />
      </View>
      {/* Content */}
      <View style={styles.myEventContent}>
        {/* Title */}
        <Skeleton width="78%" height={15} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="55%" height={15} style={{ marginBottom: Spacing.md }} />
        {/* Meta rows */}
        <View style={{ gap: Spacing.xs, marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
            <Skeleton width="52%" height={12} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
            <Skeleton width="38%" height={12} />
          </View>
        </View>
        {/* Stats row */}
        <View style={[styles.myEventStats, { borderTopColor: colors.gray100 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Skeleton width={16} height={16} borderRadius={BorderRadius.full} />
            <Skeleton width={24} height={14} />
            <Skeleton width={42} height={12} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Skeleton width={16} height={16} borderRadius={BorderRadius.full} />
            <Skeleton width={24} height={14} />
            <Skeleton width={32} height={12} />
          </View>
          <Skeleton width={55} height={14} />
        </View>
        {/* Actions row */}
        <View style={[styles.myEventActions, { borderTopColor: colors.gray100 }]}>
          <Skeleton width={52} height={28} borderRadius={BorderRadius.md} />
          <Skeleton width={75} height={28} borderRadius={BorderRadius.md} />
          <Skeleton width={55} height={28} borderRadius={BorderRadius.md} />
          <Skeleton width={32} height={28} borderRadius={BorderRadius.md} />
        </View>
      </View>
    </View>
  );
});

// ============================================
// MY EVENTS SCREEN SKELETON (full page)
// Matches MyEventsScreen: purple gradient header + white contentArea + search + filterTabs + cards
// ============================================
export const MyEventsScreenSkeleton = memo(function MyEventsScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: '#4F46E5' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#4F46E5', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xl }}>
        {/* Top row: back + title + add */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <PrimarySkeleton width={40} height={40} borderRadius={20} />
          <PrimarySkeleton width={130} height={22} borderRadius={BorderRadius.sm} />
          <PrimarySkeleton width={40} height={40} borderRadius={20} />
        </View>
        {/* Stats line */}
        <PrimarySkeleton width="65%" height={14} borderRadius={BorderRadius.sm} style={{ alignSelf: 'center' }} />
      </View>

      {/* Content area */}
      <View style={{
        flex: 1,
        backgroundColor: colors.background,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        marginTop: -Spacing.md,
      }}>
        {/* Search bar */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
          <Skeleton height={40} borderRadius={BorderRadius.lg} />
        </View>
        {/* Filter tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm }}>
          <Skeleton width={50} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={70} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={80} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={65} height={32} borderRadius={BorderRadius.full} />
        </View>
        {/* Event cards */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, gap: Spacing.md }}>
          <MyEventCardSkeleton />
          <MyEventCardSkeleton />
          <MyEventCardSkeleton />
        </View>
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

  // Ticket QR Button (right side of ticket card)
  ticketQrButton: {
    width: 44,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },

  // Following Event Card (horizontal)
  followingCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  followingDateBadge: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  followingContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  followingSummaryCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },

  // Payment Card
  paymentCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // My Event Card (MyEventsScreen)
  myEventCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  myEventBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  myEventContent: {
    padding: Spacing.md,
  },
  myEventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    marginBottom: Spacing.sm,
  },
  myEventActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
});

export default Skeleton;
