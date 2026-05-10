/**
 * Skeleton Loading Components
 *
 * CONVENTION:
 * - Use Skeleton loaders for INITIAL page loads (first time seeing the screen)
 * - Use ActivityIndicator for IN-PAGE actions (loading more, submitting, refreshing)
 * - Use LoadingOverlay for BLOCKING operations (payments, form submissions)
 *
 * Available skeletons:
 * - SkeletonList: Generic list of items
 * - EventCardSkeleton: Single event card placeholder
 * - DiscoverScreenSkeleton: Full discover page skeleton
 * - DetailScreenSkeleton: Event detail page skeleton
 * - MyTicketsScreenSkeleton: Tickets list skeleton
 * - NotificationsScreenSkeleton: Notifications list skeleton
 * - MessageSkeleton: Single message bubble skeleton
 * - PaymentCardSkeleton: Payment item skeleton
 * - DashboardSkeleton: Dashboard overview skeleton
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
// EDITORIAL ATOMIC SKELETONS
// Composables for the new editorial layouts
// ============================================

interface EditorialHeaderSkeletonProps {
  withCta?: boolean;
}

export const EditorialHeaderSkeleton = memo(function EditorialHeaderSkeleton({ withCta = false }: EditorialHeaderSkeletonProps) {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: hairline,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Skeleton width={38} height={38} borderRadius={19} />
        <View style={{ flex: 1 }}>
          <Skeleton width={140} height={10} borderRadius={3} style={{ marginBottom: 6 }} />
          <Skeleton width={180} height={28} borderRadius={6} />
        </View>
        {withCta && <Skeleton width={90} height={36} borderRadius={BorderRadius.full} />}
      </View>
    </View>
  );
});

interface HeroGradientSkeletonProps {
  height?: number;
}

export const HeroGradientSkeleton = memo(function HeroGradientSkeleton({ height = 200 }: HeroGradientSkeletonProps) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg }}>
      <View
        style={{
          height,
          borderRadius: 28,
          backgroundColor: colors.gray200,
          padding: Spacing.lg,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width={100} height={10} borderRadius={3} />
          <Skeleton width={70} height={20} borderRadius={BorderRadius.full} />
        </View>
        <View>
          <Skeleton width={80} height={9} borderRadius={3} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={40} borderRadius={6} />
        </View>
      </View>
    </View>
  );
});

interface StatStripSkeletonProps {
  cells?: number;
}

export const StatStripSkeleton = memo(function StatStripSkeleton({ cells = 3 }: StatStripSkeletonProps) {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: hairline,
        backgroundColor: colors.card,
        paddingVertical: Spacing.sm,
      }}
    >
      {Array.from({ length: cells }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={{ flex: 1, paddingHorizontal: Spacing.sm, alignItems: 'flex-start', gap: 6 }}>
            <Skeleton width={40} height={22} borderRadius={4} />
            <Skeleton width={60} height={9} borderRadius={3} />
          </View>
          {i < cells - 1 && <View style={{ width: 1, backgroundColor: hairline }} />}
        </React.Fragment>
      ))}
    </View>
  );
});

interface TabsSegmentedSkeletonProps {
  count?: number;
}

export const TabsSegmentedSkeleton = memo(function TabsSegmentedSkeleton({ count = 4 }: TabsSegmentedSkeletonProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        padding: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.gray100,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 4, alignItems: 'center' }}>
          <Skeleton width={50} height={11} borderRadius={3} />
        </View>
      ))}
    </View>
  );
});

// Ledger-style card (date tile + body + amount column)
export const LedgerCardSkeleton = memo(function LedgerCardSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: hairline,
        backgroundColor: colors.card,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
      }}
    >
      {/* Date tile */}
      <View
        style={{
          width: 50,
          paddingVertical: 8,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.gray100,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Skeleton width={24} height={18} borderRadius={4} />
        <Skeleton width={20} height={8} borderRadius={2} />
      </View>
      {/* Body */}
      <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width={50} height={14} borderRadius={4} />
          <Skeleton width={30} height={9} borderRadius={3} />
        </View>
        <Skeleton width="80%" height={13} borderRadius={3} />
        <Skeleton width="60%" height={11} borderRadius={3} />
      </View>
      {/* Amount column */}
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80, gap: 4 }}>
        <Skeleton width={20} height={18} borderRadius={3} />
        <Skeleton width={60} height={14} borderRadius={3} />
        <Skeleton width={30} height={9} borderRadius={3} />
      </View>
    </View>
  );
});

// Boarding-pass style card (perforated)
export const BoardingPassSkeleton = memo(function BoardingPassSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: hairline,
        backgroundColor: colors.card,
        marginBottom: Spacing.md,
        minHeight: 120,
        overflow: 'hidden',
      }}
    >
      {/* Left section */}
      <View style={{ flex: 1, padding: Spacing.md, justifyContent: 'center', gap: 8 }}>
        <Skeleton width={60} height={16} borderRadius={6} />
        <Skeleton width="80%" height={17} borderRadius={4} />
        <Skeleton width="60%" height={11} borderRadius={3} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Skeleton width={70} height={20} borderRadius={4} />
          <Skeleton width={30} height={11} borderRadius={3} />
        </View>
      </View>
      {/* Perforation */}
      <View
        style={{
          width: 1,
          alignSelf: 'stretch',
          marginHorizontal: 8,
          borderLeftWidth: 1.5,
          borderColor: hairline,
          borderStyle: 'dashed',
        }}
      />
      {/* Right stub */}
      <View style={{ width: 100, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Skeleton width={40} height={8} borderRadius={2} />
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Skeleton width={24} height={24} borderRadius={12} />
          <Skeleton width={20} height={20} borderRadius={3} />
          <Skeleton width={24} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
});

// Single badge tile (1/3 width grid)
export const BadgeTileSkeleton = memo(function BadgeTileSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={{ flex: 1 / 3, alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
      <View
        style={{
          width: '92%',
          aspectRatio: 1,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: hairline,
          backgroundColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Skeleton width={56} height={56} borderRadius={28} />
      </View>
      <Skeleton width="80%" height={11} borderRadius={3} style={{ marginTop: 4 }} />
      <Skeleton width="60%" height={9} borderRadius={2} />
    </View>
  );
});

// Leaderboard row
export const LeaderboardRowSkeleton = memo(function LeaderboardRowSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: hairline,
        backgroundColor: colors.card,
        marginBottom: 8,
      }}
    >
      <Skeleton width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 4 }}>
        <Skeleton width="55%" height={14} borderRadius={3} />
        <Skeleton width="35%" height={11} borderRadius={3} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 60 }}>
        <Skeleton width={40} height={17} borderRadius={3} />
        <Skeleton width={26} height={9} borderRadius={2} />
      </View>
    </View>
  );
});

// ============================================
// EVENT CARD SKELETON (default variant)
// Matches EventCard.tsx default: image 200px + dateAccent + title + location + price
// Width: 82% of screen (like real card)
// ============================================
export const EventCardSkeleton = memo(function EventCardSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: hairline, borderWidth: 1 }]}>
      {/* Image with overlays */}
      <View style={{ height: 220, position: 'relative' }}>
        <Skeleton height={220} borderRadius={0} />
        {/* Eyebrow pill top-left */}
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <Skeleton width={90} height={22} borderRadius={BorderRadius.full} />
        </View>
        {/* Bookmark disc top-right */}
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <Skeleton width={34} height={34} borderRadius={17} />
        </View>
        {/* Title overlay bottom */}
        <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, gap: 4 }}>
          <Skeleton width="80%" height={22} borderRadius={4} />
          <Skeleton width="60%" height={22} borderRadius={4} />
        </View>
      </View>
      {/* Footer: date tile + meta + price pill */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 }}>
        <View style={{ minWidth: 54, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center', gap: 3 }}>
          <Skeleton width={26} height={20} borderRadius={4} />
          <Skeleton width={22} height={9} borderRadius={2} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Skeleton width={11} height={11} borderRadius={5.5} />
            <Skeleton width="60%" height={11} borderRadius={3} />
          </View>
        </View>
        <Skeleton width={70} height={28} borderRadius={BorderRadius.full} />
      </View>
    </View>
  );
});

// ============================================
// EVENT CARD HORIZONTAL SKELETON
// Matches EventCard.tsx horizontal: image-left + body + bookmark-right
// ============================================
export const EventCardHorizontalSkeleton = memo(function EventCardHorizontalSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={[styles.eventCardHorizontal, { backgroundColor: colors.card, borderColor: hairline, borderWidth: 1, minHeight: 140 }]}>
      <View style={{ width: 130, position: 'relative' }}>
        <Skeleton width={130} height={140} borderRadius={0} />
        {/* Floating date tile */}
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <Skeleton width={42} height={32} borderRadius={BorderRadius.md} />
        </View>
      </View>
      <View style={[styles.eventCardHorizontalContent, { gap: 4 }]}>
        <Skeleton width={70} height={18} borderRadius={6} />
        <Skeleton width="90%" height={15} borderRadius={4} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Skeleton width={11} height={11} borderRadius={5.5} />
          <Skeleton width="55%" height={11} borderRadius={3} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Skeleton width={60} height={20} borderRadius={4} />
          <Skeleton width={50} height={18} borderRadius={6} />
        </View>
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: Spacing.sm }}>
        <Skeleton width={32} height={32} borderRadius={16} />
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
// Matches conversation bubble: avatar (only when not grouped) + bubble with
// variable line count + width. Mimics real chat où certains messages sont
// courts (hi 👋), d'autres longs, et grouped messages n'ont pas d'avatar.
// ============================================
interface MessageSkeletonProps {
  isOwn?: boolean;
  /** Number of text lines inside the bubble (default 2). */
  lines?: number;
  /** Bubble width in px (default depends on isOwn + lines). */
  bubbleWidth?: number;
  /** If true, hide avatar (grouped consecutive messages). */
  grouped?: boolean;
}
export const MessageSkeleton = memo(function MessageSkeleton({
  isOwn = false,
  lines = 2,
  bubbleWidth,
  grouped = false,
}: MessageSkeletonProps) {
  const { colors, isDark } = useTheme();
  const ownBg = isDark ? `${colors.primary}33` : `${colors.primary}1A`;
  const otherBg = colors.gray100;
  const radius = BorderRadius.lg;
  const cornerNotch = isOwn ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 };
  const lineWidths = [
    bubbleWidth ?? (isOwn ? 160 : 200),
    bubbleWidth ? bubbleWidth - 30 : (isOwn ? 110 : 140),
    bubbleWidth ? bubbleWidth - 60 : (isOwn ? 70 : 90),
  ];

  return (
    <View style={[styles.message, isOwn && styles.messageOwn]}>
      {!isOwn && !grouped ? (
        <Skeleton width={28} height={28} borderRadius={14} style={{ marginRight: Spacing.sm }} />
      ) : !isOwn ? (
        <View style={{ width: 28, marginRight: Spacing.sm }} />
      ) : null}
      <View
        style={[
          styles.messageBubble,
          { backgroundColor: isOwn ? ownBg : otherBg, borderRadius: radius, ...cornerNotch },
        ]}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={lineWidths[i] ?? lineWidths[lineWidths.length - 1]}
            height={12}
            borderRadius={4}
            style={{ marginBottom: i < lines - 1 ? 6 : 0 }}
          />
        ))}
      </View>
    </View>
  );
});

// ============================================
// CONVERSATION SKELETON
// Full chat skeleton : date pill + alternating bubbles (variable widths,
// some grouped without avatar) + input bar at bottom. Plus fidèle qu'un
// simple SkeletonList car reproduit la sensation visuelle d'un chat bottom-
// aligned avec messages courts/longs/groupés.
// ============================================
export const ConversationSkeleton = memo(function ConversationSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  // Simulate realistic chat: mix of own/other, varied lengths, some grouped
  const messages: MessageSkeletonProps[] = [
    { isOwn: false, lines: 2, bubbleWidth: 220 },
    { isOwn: false, lines: 1, bubbleWidth: 110, grouped: true },
    { isOwn: true, lines: 1, bubbleWidth: 90 },
    { isOwn: true, lines: 3, bubbleWidth: 240, grouped: true },
    { isOwn: false, lines: 2, bubbleWidth: 180 },
    { isOwn: true, lines: 1, bubbleWidth: 130 },
    { isOwn: false, lines: 1, bubbleWidth: 70, grouped: false },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* Date separator pill — stylé comme dans la conv réelle */}
      <View style={{ alignItems: 'center', marginVertical: Spacing.md }}>
        <Skeleton width={90} height={20} borderRadius={10} />
      </View>

      <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}>
        {messages.map((m, idx) => (
          <View key={idx} style={{ marginBottom: m.grouped ? 2 : Spacing.sm }}>
            <MessageSkeleton {...m} />
          </View>
        ))}
      </View>

      {/* Typing indicator (someone typing) */}
      <View style={[styles.message, { paddingHorizontal: Spacing.md }]}>
        <Skeleton width={28} height={28} borderRadius={14} style={{ marginRight: Spacing.sm }} />
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: colors.gray100,
              flexDirection: 'row',
              gap: 4,
              paddingVertical: 10,
            },
          ]}
        >
          <Skeleton width={6} height={6} borderRadius={3} />
          <Skeleton width={6} height={6} borderRadius={3} />
          <Skeleton width={6} height={6} borderRadius={3} />
        </View>
      </View>

      {/* Input toolbar fake */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderTopWidth: 1,
          borderTopColor: hairline,
          backgroundColor: colors.card,
        }}
      >
        <Skeleton width={36} height={36} borderRadius={18} />
        <View
          style={{
            flex: 1,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.gray100,
            paddingHorizontal: Spacing.md,
            justifyContent: 'center',
          }}
        >
          <Skeleton width="55%" height={12} borderRadius={4} />
        </View>
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>
    </View>
  );
});

// ============================================
// CONVERSATION ITEM SKELETON
// Matches MessagesScreen "Editorial List" : row plate + avatar 60 + 2 lignes
// (nom/heure et preview/badge), avec hairline en bas. Pas de card wrapper.
// ============================================
export const ConversationItemSkeleton = memo(function ConversationItemSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : colors.gray100;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: hairline,
      }}
    >
      {/* Avatar 60x60 (incluant ring) — matches le wrap du design Editorial List */}
      <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton width={52} height={52} borderRadius={26} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
        {/* Ligne 1 : nom + heure */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Skeleton width="55%" height={15} borderRadius={4} />
          <Skeleton width={36} height={11} borderRadius={3} />
        </View>
        {/* Ligne 2 : preview + (parfois) badge unread */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width="78%" height={13} borderRadius={3} />
        </View>
      </View>
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
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: hairline,
        backgroundColor: colors.card,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.md,
      }}
    >
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width={50} height={18} borderRadius={6} />
          <Skeleton width={50} height={10} borderRadius={3} />
        </View>
        <Skeleton width="85%" height={15} borderRadius={4} />
        <Skeleton width="65%" height={11} borderRadius={3} />
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
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: hairline,
        backgroundColor: colors.card,
        overflow: 'hidden',
        marginBottom: Spacing.md,
      }}
    >
      {/* Hero block: huge % numeral on left + code on right */}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', minHeight: 110 }}>
        <View
          style={{
            width: 120,
            paddingVertical: Spacing.md,
            paddingHorizontal: 8,
            backgroundColor: colors.gray100,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Skeleton width={70} height={48} borderRadius={4} />
          <Skeleton width={40} height={16} borderRadius={3} />
          <Skeleton width={50} height={9} borderRadius={2} />
        </View>
        <View style={{ flex: 1, padding: Spacing.md, justifyContent: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={50} height={18} borderRadius={6} />
            <Skeleton width={40} height={11} borderRadius={3} />
          </View>
          <Skeleton height={36} borderRadius={8} />
          <Skeleton width={90} height={10} borderRadius={3} />
        </View>
      </View>
      {/* Meta row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: hairline }}>
        <Skeleton width={11} height={11} borderRadius={5.5} />
        <Skeleton width="70%" height={11} borderRadius={3} />
      </View>
      {/* Usage bar */}
      <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width={70} height={9} borderRadius={3} />
          <Skeleton width={30} height={12} borderRadius={3} />
        </View>
        <Skeleton height={6} borderRadius={3} />
      </View>
      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md, borderTopWidth: 1, borderTopColor: hairline }}>
        <Skeleton height={32} borderRadius={BorderRadius.full} style={{ flex: 1 }} />
        <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
      </View>
    </View>
  );
});

// ============================================
// DISCOVER SCREEN SKELETON (full page)
// Matches DiscoverScreen: header + featured horizontal scroll + section titles + event cards
// ============================================
export const DiscoverScreenSkeleton = memo(function DiscoverScreenSkeleton() {
  // Squelette réduit : on n'affiche que ce que l'utilisateur verra "above the
  // fold" pendant le tout premier chargement (search + hero + une rangée de
  // teasers). Les sections restantes apparaissent quand les fetches arrivent
  // — pas besoin de squelette complet pour des données qui sont à 600px de scroll.
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
      {/* Hero card (single, full-bleed visual placeholder) */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
        <View style={[styles.eventCard, { backgroundColor: colors.card, width: '100%' }]}>
          <Skeleton height={180} borderRadius={0} />
          <View style={styles.eventCardContent}>
            <Skeleton width="45%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={16} style={{ marginBottom: 6 }} />
            <Skeleton width="35%" height={16} />
          </View>
        </View>
      </View>
      {/* Single teaser row (one horizontal card hint) */}
      <View style={{ paddingHorizontal: Spacing.lg }}>
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
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Skeleton width={80} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={70} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={75} height={32} borderRadius={BorderRadius.full} />
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm }}>
        <BoardingPassSkeleton />
        <BoardingPassSkeleton />
        <BoardingPassSkeleton />
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
export const PaymentCardSkeleton = memo(LedgerCardSkeleton);

// ============================================
// MESSAGES SCREEN SKELETON (full page)
// Matches MessagesScreen: editorial header (back disc + eyebrow+title + search disc + compose btn)
// + chips row + conversation list. Uses light canvas + Skeleton (NOT primary/PrimarySkeleton)
// because the actual screen is editorial-style on `colors.background`.
// ============================================
export const MessagesScreenSkeleton = memo(function MessagesScreenSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Editorial header — soft rounded bottom corners, matches MessagesScreen */}
      <View
        style={{
          backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: hairline,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        {/* Top row: back disc | eyebrow+title | search disc | compose btn */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Skeleton width={120} height={10} borderRadius={3} style={{ marginBottom: 6 }} />
            <Skeleton width={100} height={28} borderRadius={6} />
          </View>
          <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 8 }} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>

        {/* Chips row (Tous / Événements / Archives) */}
        <View style={{ flexDirection: 'row', gap: 8, paddingTop: Spacing.sm }}>
          <Skeleton width={70} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={100} height={32} borderRadius={BorderRadius.full} />
          <Skeleton width={84} height={32} borderRadius={BorderRadius.full} />
        </View>
      </View>

      {/* Conversations list — chaque skeleton porte son propre padding
          horizontal pour matcher le design Editorial List du composant réel. */}
      <View style={{ flex: 1, paddingTop: Spacing.sm }}>
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
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      <StatStripSkeleton cells={3} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Skeleton width={70} height={30} borderRadius={BorderRadius.full} />
        <Skeleton width={90} height={30} borderRadius={BorderRadius.full} />
        <Skeleton width={70} height={30} borderRadius={BorderRadius.full} />
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm }}>
          <Skeleton width={70} height={10} />
          <View style={{ flex: 1, height: 1, backgroundColor: colors.gray100 }} />
        </View>
        {Array.from({ length: 4 }).map((_, i) => (
          <NotificationItemSkeleton key={i} />
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
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={{
        borderRadius: 24,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: hairline,
        backgroundColor: colors.card,
      }}
    >
      {/* Image with overlays */}
      <View style={{ position: 'relative', height: 200 }}>
        <Skeleton height={200} borderRadius={0} />
        {/* Status pill top-left */}
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <Skeleton width={80} height={22} borderRadius={BorderRadius.full} />
        </View>
        {/* Date tile top-right */}
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <Skeleton width={56} height={48} borderRadius={BorderRadius.lg} />
        </View>
        {/* Title overlay bottom */}
        <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14, gap: 4 }}>
          <Skeleton width={80} height={9} borderRadius={2} />
          <Skeleton width="80%" height={20} borderRadius={4} />
        </View>
      </View>

      {/* Meta row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
        <Skeleton width={11} height={11} borderRadius={5.5} />
        <Skeleton width={50} height={11} />
        <Skeleton width={3} height={3} borderRadius={1.5} />
        <Skeleton width={11} height={11} borderRadius={5.5} />
        <Skeleton width={70} height={11} />
      </View>

      {/* Stats bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: hairline,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width={30} height={18} />
          <Skeleton width={50} height={9} />
        </View>
        <View style={{ width: 1, height: 30, backgroundColor: hairline, marginHorizontal: Spacing.sm }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width={30} height={18} />
          <Skeleton width={40} height={9} />
        </View>
        <View style={{ width: 1, height: 30, backgroundColor: hairline, marginHorizontal: Spacing.sm }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width={50} height={18} />
          <Skeleton width={40} height={9} />
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md }}>
        <Skeleton width={100} height={36} borderRadius={BorderRadius.full} />
        <Skeleton width={36} height={36} borderRadius={18} />
        <View style={{ flex: 1 }} />
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>
    </View>
  );
});

// ============================================
// MY EVENTS SCREEN SKELETON (full page)
// Matches MyEventsScreen: purple gradient header + white contentArea + search + filterTabs + cards
// ============================================
export const MyEventsScreenSkeleton = memo(function MyEventsScreenSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      <StatStripSkeleton cells={4} />
      {/* Search */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Skeleton height={46} borderRadius={BorderRadius.xl} />
      </View>
      {/* Filter pills */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: 8 }}>
        <Skeleton width={50} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={75} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={85} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
      </View>
      {/* Event cards */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
        <MyEventCardSkeleton />
        <MyEventCardSkeleton />
      </View>
    </View>
  );
});

// ============================================
// WALLET SCREEN SKELETON
// ============================================
export const WalletScreenSkeleton = memo(function WalletScreenSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      {/* Black card hero */}
      <HeroGradientSkeleton height={220} />
      {/* Withdraw pill */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
        <Skeleton height={56} borderRadius={BorderRadius.full} />
      </View>
      <StatStripSkeleton cells={3} />
      {/* Tabs segmented */}
      <TabsSegmentedSkeleton count={4} />
      {/* Section header */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md }}>
        <Skeleton width={120} height={10} borderRadius={3} style={{ marginBottom: 4 }} />
        <Skeleton width="50%" height={22} borderRadius={4} />
      </View>
      {/* Cards */}
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <LedgerCardSkeleton />
        <LedgerCardSkeleton />
        <LedgerCardSkeleton />
      </View>
    </View>
  );
});

// ============================================
// MY PAYMENTS SCREEN SKELETON
// ============================================
export const MyPaymentsScreenSkeleton = memo(function MyPaymentsScreenSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      {/* Hero gradient (total spent) */}
      <HeroGradientSkeleton height={180} />
      {/* Status chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
        <Skeleton width={60} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={70} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={75} height={32} borderRadius={BorderRadius.full} />
      </View>
      {/* Section header */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
        <Skeleton width={100} height={10} borderRadius={3} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={11} borderRadius={3} />
      </View>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <LedgerCardSkeleton />
        <LedgerCardSkeleton />
        <LedgerCardSkeleton />
        <LedgerCardSkeleton />
      </View>
    </View>
  );
});

// ============================================
// ANALYTICS DASHBOARD SCREEN SKELETON
// ============================================
export const AnalyticsDashboardScreenSkeleton = memo(function AnalyticsDashboardScreenSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      {/* Time range chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Skeleton width={70} height={32} borderRadius={BorderRadius.full} style={{ flex: 1 }} />
        <Skeleton width={70} height={32} borderRadius={BorderRadius.full} style={{ flex: 1 }} />
        <Skeleton width={70} height={32} borderRadius={BorderRadius.full} style={{ flex: 1 }} />
        <Skeleton width={70} height={32} borderRadius={BorderRadius.full} style={{ flex: 1 }} />
      </View>
      {/* Hero gradient */}
      <HeroGradientSkeleton height={210} />
      {/* KPI grid 2x2 */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: 8 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1].map((col) => (
              <View
                key={col}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: hairline,
                  backgroundColor: colors.card,
                  padding: Spacing.md,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skeleton width={32} height={32} borderRadius={16} />
                  <Skeleton width={50} height={20} borderRadius={BorderRadius.full} />
                </View>
                <Skeleton width={50} height={9} borderRadius={3} style={{ marginTop: 6 }} />
                <Skeleton width={70} height={22} borderRadius={4} />
                <Skeleton width="60%" height={10} borderRadius={3} />
              </View>
            ))}
          </View>
        ))}
      </View>
      {/* Chart card */}
      <View
        style={{
          marginHorizontal: Spacing.lg,
          marginTop: Spacing.md,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: hairline,
          backgroundColor: colors.card,
          padding: Spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={120} height={9} borderRadius={3} />
            <Skeleton width="60%" height={17} borderRadius={4} />
            <Skeleton width="40%" height={11} borderRadius={3} />
          </View>
          <Skeleton width={70} height={22} borderRadius={6} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: hairline }}>
          {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
            <Skeleton key={i} width={18} height={h} borderRadius={4} />
          ))}
        </View>
      </View>
    </View>
  );
});

// ============================================
// GAMIFICATION SCREEN SKELETON
// ============================================
export const GamificationScreenSkeleton = memo(function GamificationScreenSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      {/* Hero points card */}
      <HeroGradientSkeleton height={220} />
      <StatStripSkeleton cells={3} />
      {/* Tabs */}
      <TabsSegmentedSkeleton count={2} />
      {/* Section header */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md }}>
        <Skeleton width={140} height={10} borderRadius={3} style={{ marginBottom: 4 }} />
        <Skeleton width="50%" height={22} borderRadius={4} />
      </View>
      {/* Badges grid 3x2 */}
      <View style={{ paddingHorizontal: Spacing.lg }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
            <BadgeTileSkeleton />
            <BadgeTileSkeleton />
            <BadgeTileSkeleton />
          </View>
        ))}
      </View>
    </View>
  );
});

// ============================================
// INVITATIONS SCREEN SKELETON
// ============================================
export const InvitationsScreenSkeleton = memo(function InvitationsScreenSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton withCta />
      <StatStripSkeleton cells={3} />
      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
      </View>
      {/* Invitation cards */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: hairline,
              backgroundColor: colors.card,
              padding: Spacing.md,
              gap: Spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
              <Skeleton width={54} height={54} borderRadius={BorderRadius.lg} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={70} height={18} borderRadius={6} />
                <Skeleton width="80%" height={17} borderRadius={4} />
              </View>
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: hairline }}>
              <Skeleton width={80} height={9} borderRadius={3} />
              <Skeleton width={70} height={11} borderRadius={3} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

// ============================================
// REFERRAL SCREEN SKELETON
// ============================================
export const ReferralScreenSkeleton = memo(function ReferralScreenSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton />
      {/* Hero earnings */}
      <HeroGradientSkeleton height={200} />
      {/* How it works */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
        <Skeleton width={160} height={10} borderRadius={3} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={22} borderRadius={4} style={{ marginBottom: Spacing.md }} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                padding: Spacing.md,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: hairline,
                backgroundColor: colors.card,
                gap: 4,
              }}
            >
              <Skeleton width={40} height={22} borderRadius={4} />
              <Skeleton width="80%" height={13} borderRadius={3} />
            </View>
          ))}
        </View>
      </View>
      {/* Code cards */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
        <Skeleton width={110} height={10} borderRadius={3} style={{ marginBottom: Spacing.md }} />
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: hairline,
            backgroundColor: colors.card,
            padding: Spacing.md,
            gap: Spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', minHeight: 110, gap: Spacing.sm }}>
            <View style={{ flex: 1, padding: Spacing.md, borderRadius: 16, backgroundColor: colors.gray100, gap: 8, justifyContent: 'center' }}>
              <Skeleton width={40} height={9} borderRadius={3} />
              <Skeleton width={120} height={22} borderRadius={4} />
              <Skeleton width={50} height={9} borderRadius={3} />
            </View>
            <View style={{ width: 100, gap: 6, justifyContent: 'center' }}>
              <Skeleton height={36} borderRadius={12} />
              <Skeleton height={36} borderRadius={12} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: hairline }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, gap: 4, paddingHorizontal: 6 }}>
                <Skeleton width={30} height={16} borderRadius={3} />
                <Skeleton width={36} height={9} borderRadius={2} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
});

// ============================================
// EDIT PROFILE SCREEN SKELETON
// ============================================
export const EditProfileScreenSkeleton = memo(function EditProfileScreenSkeleton() {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={{ flex: 1 }}>
      <EditorialHeaderSkeleton />
      {/* Profile image */}
      <View style={{ alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: 8 }}>
        <Skeleton width={100} height={100} borderRadius={50} />
        <Skeleton width={120} height={13} borderRadius={3} />
        <Skeleton width={180} height={11} borderRadius={3} />
      </View>
      {/* Section cards */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            marginHorizontal: Spacing.lg,
            marginTop: Spacing.md,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: hairline,
            backgroundColor: colors.card,
            padding: Spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
          }}
        >
          <Skeleton width={38} height={38} borderRadius={19} />
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={16} borderRadius={4} />
          </View>
          <Skeleton width={18} height={18} borderRadius={4} />
        </View>
      ))}
      {/* Save pill */}
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
        <Skeleton height={56} borderRadius={BorderRadius.full} />
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
