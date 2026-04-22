import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socialAPI } from '../../api';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../ui/LoadingOverlay';

interface ActivityItem {
  id: string;
  actor_name?: string;
  actor?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
  action?: string;
  content?: string;
  activity_type?: string;
  verb?: string;
  created_at?: string;
  timestamp?: string;
}

interface SocialTabProps {
  eventId: string;
}

const getActivityIcon = (type?: string): keyof typeof Ionicons.glyphMap => {
  switch (type?.toLowerCase()) {
    case 'registration':
    case 'inscription':
      return 'person-add-outline';
    case 'comment':
    case 'feedback':
      return 'chatbubble-outline';
    case 'like':
    case 'follow':
      return 'heart-outline';
    case 'share':
      return 'share-social-outline';
    case 'check_in':
    case 'checkin':
      return 'checkmark-circle-outline';
    case 'payment':
    case 'purchase':
      return 'card-outline';
    case 'session':
      return 'calendar-outline';
    case 'connection':
      return 'people-outline';
    default:
      return 'pulse-outline';
  }
};

const getActivityColor = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case 'registration':
    case 'inscription':
      return Colors.success;
    case 'comment':
    case 'feedback':
      return Colors.info;
    case 'like':
    case 'follow':
      return Colors.error;
    case 'share':
      return Colors.primary;
    case 'check_in':
    case 'checkin':
      return Colors.success;
    case 'payment':
    case 'purchase':
      return Colors.warning;
    default:
      return Colors.gray500;
  }
};

export default function SocialTab({ eventId }: SocialTabProps) {
  const { colors, isDark } = useTheme();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityFeed();
  }, [eventId]);

  const fetchActivityFeed = async () => {
    setLoading(true);
    try {
      const response = await socialAPI.getEventFeed(eventId);
      const data = response.data?.results || response.data || [];
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement activite:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActorName = (item: ActivityItem): string => {
    if (item.actor_name) return item.actor_name;
    if (item.actor) {
      if (item.actor.full_name) return item.actor.full_name;
      const first = item.actor.first_name || '';
      const last = item.actor.last_name || '';
      return `${first} ${last}`.trim();
    }
    return 'Quelqu\'un';
  };

  const getActionText = (item: ActivityItem): string => {
    return item.content || item.action || item.verb || 'a fait une action';
  };

  const formatTimestamp = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'A l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <LoadingSpinner />
        <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Chargement...</Text>
      </View>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Activite</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="pulse-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Aucune activite recente</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Activite</Text>
      {activities.map((item, index) => {
        const icon = getActivityIcon(item.activity_type);
        const iconColor = getActivityColor(item.activity_type);
        const actorName = getActorName(item);
        const actionText = getActionText(item);
        const timestamp = formatTimestamp(item.created_at || item.timestamp);

        return (
          <View key={item.id || index} style={[styles.activityCard, { backgroundColor: colors.gray50 }]}>
            <View style={[styles.activityIconContainer, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityText, { color: colors.gray700 }]} numberOfLines={2}>
                <Text style={[styles.actorName, { color: colors.gray900 }]}>{actorName}</Text>
                {' '}{actionText}
              </Text>
              {timestamp ? (
                <Text style={[styles.activityTimestamp, { color: colors.gray500 }]}>{timestamp}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
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
    letterSpacing: -0.3,
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray700,
    lineHeight: 20,
  },
  actorName: {
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  activityTimestamp: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 4,
  },
});
