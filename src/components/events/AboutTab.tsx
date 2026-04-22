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
      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>À propos</Text>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Description</Text>
        <Text style={[styles.description, { color: colors.gray600 }]}>
          {event.description || event.short_description || 'Aucune description disponible pour cet evenement.'}
        </Text>
      </View>

      {/* Follow Section */}
      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>Reste connecté</Text>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Sauvegarder cet événement</Text>
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

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>Thématiques</Text>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Tags</Text>
          <View style={styles.tagsRow}>
            {event.tags.map((tag) => (
              <View key={tag.id} style={[styles.tag, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.tagText, { color: colors.gray600 }]}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Volunteers Section */}
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
  eyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
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
