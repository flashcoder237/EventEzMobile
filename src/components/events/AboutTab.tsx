import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { colors, isDark } = useTheme();

  return (
    <>
      {/* About Section — primary */}
      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>À propos</Text>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>De l'événement</Text>
        <Text style={[styles.description, { color: colors.gray600 }]}>
          {event.description || event.short_description || 'Aucune description disponible pour cet evenement.'}
        </Text>
      </View>

      {/* Follow Section — primary CTA */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Reste connecté</Text>
        <Text style={[styles.followDescription, { color: colors.gray500 }]}>
          Reçois des notifications pour les mises à jour, rappels et annonces.
        </Text>
        <FollowEventButton
          eventId={eventId}
          variant="default"
          showFollowerCount
          initialFollowing={isFollowing}
          onFollowChange={onFollowChange}
        />
      </View>

      {/* Tags — secondary (subsection) */}
      {event.tags && event.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.subsectionTitle, { color: colors.gray900 }]}>Thématiques</Text>
          <View style={styles.tagsRow}>
            {event.tags.map((tag) => (
              <View key={tag.id} style={[styles.tag, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.tagText, { color: colors.gray600 }]}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Volunteers Section — list-item CTA */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.volunteerButton, { backgroundColor: colors.gray50 }]}
          onPress={onNavigateVolunteers}
          activeOpacity={0.7}
        >
          <View style={[styles.volunteerIconContainer, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.volunteerTextContainer}>
            <Text style={[styles.volunteerTitle, { color: colors.gray900 }]}>Benevoles</Text>
            <Text style={[styles.volunteerSubtitle, { color: colors.gray500 }]}>Voir ou rejoindre l'equipe de benevoles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  // Hierarchie typo :
  // eyebrow (11px accent uppercase) > sectionTitle (h3 20px) > subsectionTitle (h4 18px) > body
  eyebrow: {
    ...TextStyles.eyebrow,
    marginBottom: 6,
  },
  sectionTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  subsectionTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.sm,
  },
  description: {
    ...TextStyles.body,
    lineHeight: 24,
  },
  followDescription: {
    ...TextStyles.small,
    marginBottom: Spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    ...TextStyles.small,
  },
  volunteerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  volunteerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  volunteerTitle: {
    ...TextStyles.bodyBold,
  },
  volunteerSubtitle: {
    ...TextStyles.small,
    marginTop: 2,
  },
});
