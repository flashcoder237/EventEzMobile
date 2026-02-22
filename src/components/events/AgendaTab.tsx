import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

export interface AgendaTabProps {
  sessions: Session[];
  loadingSessions: boolean;
}

export default function AgendaTab({
  sessions,
  loadingSessions,
}: AgendaTabProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Programme</Text>
      {loadingSessions ? (
        <View style={styles.emptyTab}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyTabText}>Chargement du programme...</Text>
        </View>
      ) : sessions && sessions.length > 0 ? (
        sessions.map((session, index) => (
          <View key={session.id || index} style={styles.sessionCard}>
            <View style={styles.sessionTime}>
              <Text style={styles.sessionTimeText}>
                {new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {session.end_time && (
                <Text style={styles.sessionEndTime}>
                  {new Date(session.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>{session.title}</Text>
              {session.session_type && (
                <View style={styles.sessionTypeBadge}>
                  <Text style={styles.sessionTypeText}>{session.session_type}</Text>
                </View>
              )}
              {!!(session.location || session.room) && (
                <View style={styles.sessionLocation}>
                  <Ionicons name="location-outline" size={12} color={Colors.gray500} />
                  <Text style={styles.sessionLocationText}>
                    {session.room ? `${session.room}${session.location ? ` - ${session.location}` : ''}` : session.location}
                  </Text>
                </View>
              )}
              {session.speakers_detail && session.speakers_detail.length > 0 && (
                <View style={styles.sessionSpeakers}>
                  <Ionicons name="person-outline" size={12} color={Colors.gray500} />
                  <Text style={styles.sessionSpeakersText}>
                    {session.speakers_detail.map((s: any) => s.full_name).join(', ')}
                  </Text>
                </View>
              )}
              {session.description && (
                <Text style={styles.sessionDescription} numberOfLines={2}>
                  {session.description}
                </Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyTab}>
          <Ionicons name="calendar-outline" size={40} color={Colors.gray300} />
          <Text style={styles.emptyTabText}>Aucune session programmee</Text>
        </View>
      )}
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
  // Session Card
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionTime: {
    width: 60,
    alignItems: 'center',
    paddingRight: Spacing.md,
    borderRightWidth: 2,
    borderRightColor: Colors.primary,
  },
  sessionTimeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  sessionEndTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  sessionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sessionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  sessionTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  sessionTypeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  sessionLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sessionLocationText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  sessionSpeakers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sessionSpeakersText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    flex: 1,
  },
  sessionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 18,
  },
});
