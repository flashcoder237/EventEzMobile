/**
 * MyTeamEventsScreen
 *
 * Vue user-side : liste les events ou je suis staff actif (acceptedete une
 * invitation EventTeam). Pour chacun, affiche mon role + actions adaptees :
 *   - scan_tickets → bouton "Scanner billets" qui ouvre QRScannerScreen
 *   - moderate_chat → bouton "Voir le chat" qui ouvre la conversation event
 *   - view_analytics → bouton "Analytics" qui ouvre EventAnalyticsScreen
 *
 * Accessible depuis le ProfileScreen → "Mon equipe".
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { eventTeamAPI, EventStaffRole } from '../../api';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useTheme } from '../../contexts/ThemeContext';
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSizes,
  Shadows,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ROLE_ICONS: Record<EventStaffRole, keyof typeof MaterialCommunityIcons.glyphMap> = {
  co_organizer: 'crown-outline',
  moderator: 'shield-account-outline',
  scanner: 'qrcode-scan',
  analyst: 'chart-line',
};

interface TeamEvent {
  id: string;
  event: {
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    banner_url: string | null;
  };
  role: EventStaffRole;
  role_display: string;
  permissions: string[];
  accepted_at: string | null;
}

export default function MyTeamEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await eventTeamAPI.getMyTeamEvents();
      setEvents(res.data || []);
    } catch (err) {
      if (__DEV__) console.error('Erreur chargement my team events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch quand on revient (acceptance fraiche dans une autre fenetre).
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: TeamEvent }) => {
    const canScan = item.permissions.includes('scan_tickets');
    const canModerate = item.permissions.includes('moderate_chat');
    const canViewAnalytics = item.permissions.includes('view_analytics');

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
        <TouchableOpacity
          activeOpacity={TOUCH_OPACITY}
          onPress={() => navigation.navigate('EventDetails', { eventId: item.event.id })}
        >
          {item.event.banner_url ? (
            <Image source={{ uri: item.event.banner_url }} style={styles.banner} resizeMode="cover" />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: `${colors.primary}15` }]}>
              <MaterialCommunityIcons name="calendar-star" size={32} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}15` }]}>
              <MaterialCommunityIcons
                name={ROLE_ICONS[item.role]}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                {item.role_display}
              </Text>
            </View>
            {item.event.start_date && (
              <Text style={[styles.dateText, { color: colors.gray500 }]}>
                {formatDate(item.event.start_date)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={TOUCH_OPACITY}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.event.id })}
          >
            <Text style={[styles.title, { color: colors.gray900 }]} numberOfLines={2}>
              {item.event.title}
            </Text>
          </TouchableOpacity>

          {/* Quick actions selon permissions */}
          <View style={styles.actions}>
            {canScan && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('QRScanner', { eventId: item.event.id })}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="qr-code" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {t('myTeamEvents.scanTickets', { defaultValue: 'Scanner' })}
                </Text>
              </TouchableOpacity>
            )}
            {canModerate && (
              <TouchableOpacity
                style={[styles.actionButtonSecondary, { borderColor: colors.gray200 }]}
                onPress={() => navigation.navigate('EventDetails', { eventId: item.event.id })}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={colors.gray700} />
                <Text style={[styles.actionButtonSecondaryText, { color: colors.gray700 }]}>
                  {t('myTeamEvents.viewChat', { defaultValue: 'Chat' })}
                </Text>
              </TouchableOpacity>
            )}
            {canViewAnalytics && (
              <TouchableOpacity
                style={[styles.actionButtonSecondary, { borderColor: colors.gray200 }]}
                onPress={() => navigation.navigate('EventAnalytics', { eventId: item.event.id })}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="bar-chart-outline" size={16} color={colors.gray700} />
                <Text style={[styles.actionButtonSecondaryText, { color: colors.gray700 }]}>
                  {t('myTeamEvents.analytics', { defaultValue: 'Analytics' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>EQUIPE</WatermarkNumeral>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>EQUIPE</WatermarkNumeral>

      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.headerBack, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={TOUCH_OPACITY}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray900} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
            {t('myTeamEvents.eyebrow', { defaultValue: 'EN COULISSE' })}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
            {t('myTeamEvents.title', { defaultValue: 'Mon equipe' })}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing['3xl'] }}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.gray400} />
            <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
              {t('myTeamEvents.emptyTitle', {
                defaultValue: 'Vous n\'etes membre d\'aucune equipe',
              })}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.gray500 }]}>
              {t('myTeamEvents.emptyBody', {
                defaultValue: 'Quand un organisateur vous invite, l\'evenement apparaitra ici avec vos actions disponibles.',
              })}
            </Text>
          </View>
        }
      />
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  banner: {
    width: '100%',
    height: 120,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  dateText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  actionButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: '#FFFFFF',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionButtonSecondaryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
