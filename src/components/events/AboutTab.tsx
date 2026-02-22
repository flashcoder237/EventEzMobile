import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import FollowEventButton from './FollowEventButton';

export interface AboutTabProps {
  event: Event;
  eventId: string;
  isFollowing: boolean;
  onFollowChange: (following: boolean) => void;
  onNavigateVolunteers: () => void;
}

export default function AboutTab({
  event,
  eventId,
  isFollowing,
  onFollowChange,
  onNavigateVolunteers,
}: AboutTabProps) {
  return (
    <>
      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {event.description || event.short_description || 'Aucune description disponible pour cet evenement.'}
        </Text>
      </View>

      {/* Follow Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suivre cet evenement</Text>
        <Text style={styles.followDescription}>
          Recevez des notifications pour les mises a jour, rappels et annonces.
        </Text>
        <FollowEventButton
          eventId={eventId}
          variant="default"
          showFollowerCount
          initialFollowing={isFollowing}
          onFollowChange={onFollowChange}
        />
      </View>

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {event.tags.map((tag) => (
              <View key={tag.id} style={styles.tag}>
                <Text style={styles.tagText}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Volunteers Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.volunteerButton}
          onPress={onNavigateVolunteers}
          activeOpacity={0.7}
        >
          <View style={styles.volunteerIconContainer}>
            <Ionicons name="people-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.volunteerTextContainer}>
            <Text style={styles.volunteerTitle}>Benevoles</Text>
            <Text style={styles.volunteerSubtitle}>Voir ou rejoindre l'equipe de benevoles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </TouchableOpacity>
      </View>
    </>
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
  description: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 24,
  },
  followDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  volunteerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  volunteerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  volunteerTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  volunteerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
});
