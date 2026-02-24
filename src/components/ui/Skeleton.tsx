/**
 * Composants Skeleton
 * Placeholders de chargement animes pour differents types de contenu
 */

import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

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
 * Skeleton de base
 */
function SkeletonComponent({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.gray200,
          opacity,
        },
        style,
      ]}
    />
  );
}

export const Skeleton = memo(SkeletonComponent);

/**
 * Skeleton pour une carte d'evenement
 */
export const EventCardSkeleton = memo(function EventCardSkeleton() {
  return (
    <View style={skeletonStyles.eventCard}>
      <Skeleton height={160} borderRadius={BorderRadius.lg} />
      <View style={skeletonStyles.eventCardContent}>
        <Skeleton width="40%" height={12} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="90%" height={18} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>
  );
});

/**
 * Skeleton pour une carte d'evenement horizontale
 */
export const EventCardHorizontalSkeleton = memo(function EventCardHorizontalSkeleton() {
  return (
    <View style={skeletonStyles.eventCardHorizontal}>
      <Skeleton width={100} height={100} borderRadius={BorderRadius.md} />
      <View style={skeletonStyles.eventCardHorizontalContent}>
        <Skeleton width="30%" height={10} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
});

/**
 * Skeleton pour une categorie
 */
export const CategoryCardSkeleton = memo(function CategoryCardSkeleton() {
  return (
    <View style={skeletonStyles.categoryCard}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <Skeleton width={70} height={12} style={{ marginTop: Spacing.sm }} />
    </View>
  );
});

/**
 * Skeleton pour un ticket
 */
export const TicketCardSkeleton = memo(function TicketCardSkeleton() {
  return (
    <View style={skeletonStyles.ticketCard}>
      <View style={skeletonStyles.ticketCardLeft}>
        <Skeleton width={80} height={80} borderRadius={BorderRadius.md} />
      </View>
      <View style={skeletonStyles.ticketCardRight}>
        <Skeleton width="70%" height={16} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="50%" height={12} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
});

/**
 * Skeleton pour un message
 */
export const MessageSkeleton = memo(function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <View style={[skeletonStyles.message, isOwn && skeletonStyles.messageOwn]}>
      {!isOwn && <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: Spacing.sm }} />}
      <View style={skeletonStyles.messageBubble}>
        <Skeleton width={isOwn ? 150 : 180} height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width={isOwn ? 100 : 120} height={14} />
      </View>
    </View>
  );
});

/**
 * Skeleton pour un item de conversation
 */
export const ConversationItemSkeleton = memo(function ConversationItemSkeleton() {
  return (
    <View style={skeletonStyles.conversationItem}>
      <Skeleton width={50} height={50} borderRadius={25} />
      <View style={skeletonStyles.conversationItemContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="80%" height={12} />
      </View>
      <Skeleton width={40} height={10} />
    </View>
  );
});

/**
 * Skeleton pour un profil utilisateur
 */
export const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <View style={skeletonStyles.profile}>
      <Skeleton width={100} height={100} borderRadius={50} />
      <Skeleton width={150} height={20} style={{ marginTop: Spacing.md }} />
      <Skeleton width={100} height={14} style={{ marginTop: Spacing.sm }} />
    </View>
  );
});

/**
 * Skeleton pour une ligne de texte
 */
export const TextLineSkeleton = memo(function TextLineSkeleton({
  width = '100%',
  height = 14,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  return <Skeleton width={width} height={height} borderRadius={BorderRadius.xs} />;
});

/**
 * Liste de skeletons
 */
export function SkeletonList({
  count = 3,
  Component,
  gap = Spacing.md,
}: {
  count?: number;
  Component: React.ComponentType;
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

/**
 * Skeleton pour un item de notification
 */
export const NotificationItemSkeleton = memo(function NotificationItemSkeleton() {
  return (
    <View style={skeletonStyles.notificationItem}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={skeletonStyles.notificationItemContent}>
        <Skeleton width="85%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="60%" height={12} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width={60} height={10} />
      </View>
    </View>
  );
});

/**
 * Skeleton pour une carte de statistique (dashboard)
 */
export const StatCardSkeleton = memo(function StatCardSkeleton() {
  return (
    <View style={skeletonStyles.statCard}>
      <Skeleton width={36} height={36} borderRadius={BorderRadius.md} style={{ marginBottom: Spacing.sm }} />
      <Skeleton width="50%" height={20} style={{ marginBottom: Spacing.xs }} />
      <Skeleton width="70%" height={12} />
    </View>
  );
});

/**
 * Skeleton pour un formulaire
 */
export const FormSkeleton = memo(function FormSkeleton() {
  return (
    <View style={skeletonStyles.form}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={skeletonStyles.formField}>
          <Skeleton width="30%" height={12} style={{ marginBottom: Spacing.sm }} />
          <Skeleton height={44} borderRadius={BorderRadius.md} />
        </View>
      ))}
      <Skeleton height={48} borderRadius={BorderRadius.lg} style={{ marginTop: Spacing.md }} />
    </View>
  );
});

/**
 * Skeleton pour un ecran de detail (EventDetails, OrganizerProfile, SpeakerDetails)
 */
export const DetailScreenSkeleton = memo(function DetailScreenSkeleton() {
  return (
    <View style={skeletonStyles.detailScreen}>
      <Skeleton height={220} borderRadius={0} />
      <View style={skeletonStyles.detailScreenContent}>
        <Skeleton width="30%" height={12} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="80%" height={22} style={{ marginBottom: Spacing.sm }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: Spacing.lg }} />
        <View style={skeletonStyles.detailScreenMeta}>
          <Skeleton width={100} height={12} />
          <Skeleton width={80} height={12} />
        </View>
        <Skeleton width="100%" height={14} style={{ marginTop: Spacing.lg, marginBottom: Spacing.xs }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
});

const skeletonStyles = StyleSheet.create({
  // Event Card
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  eventCardContent: {
    padding: Spacing.md,
  },

  // Event Card Horizontal
  eventCardHorizontal: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  eventCardHorizontalContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },

  // Category Card
  categoryCard: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },

  // Ticket Card
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ticketCardLeft: {
    marginRight: Spacing.md,
  },
  ticketCardRight: {
    flex: 1,
    justifyContent: 'center',
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
    backgroundColor: Colors.gray100,
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
    borderBottomColor: Colors.gray100,
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

  // Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  notificationItemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  // Stat Card
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flex: 1,
    minWidth: 140,
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
    backgroundColor: Colors.white,
  },
  detailScreenContent: {
    padding: Spacing.md,
  },
  detailScreenMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default Skeleton;
