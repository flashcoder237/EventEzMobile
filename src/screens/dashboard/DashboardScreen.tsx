import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ExportButton from '../../components/common/ExportButton';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { eventsAPI, notificationsAPI, ticketPurchasesAPI, walletAPI } from '../../api';
import CacheService from '../../services/CacheService';
import { RootStackParamList, Event } from '../../types';
import EventCard from '../../components/events/EventCard';
import { StaggeredItem } from '../../components/ui/Animations';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  badge?: number;
}

const QuickAction = ({ icon, title, onPress, badge }: QuickActionProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.gray50 }]} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={title}>
      <View style={[styles.quickActionIcon, { backgroundColor: colors.card }]}>
        <Ionicons name={icon} size={22} color={colors.gray700} />
        {badge !== undefined && badge > 0 && (
          <View style={[styles.quickActionBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.quickActionBadgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.quickActionTitle, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    events: 0,
    tickets: 0,
    notifications: 0,
    balance: 0,
  });

  const isOrganizer = user?.role === 'organizer';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async (bypassCache = false) => {
    const cacheKey = `dashboard:${user?.id}:${isOrganizer}`;
    try {
      if (!bypassCache) {
        const cached = await CacheService.get<typeof stats>(cacheKey);
        if (cached) {
          setStats(cached.data);
          if (!cached.isStale) return; // Données fraîches
          // Périmées : refresh silencieux
        }
      }

      // Extraire le count depuis reponse paginee {count, results} ou tableau direct [...]
      const extractCount = (res: any) => {
        const d = res.data;
        if (d?.count !== undefined) return d.count;
        if (Array.isArray(d?.results)) return d.results.length;
        if (Array.isArray(d)) return d.length;
        return 0;
      };

      const promises: Promise<any>[] = [
        ticketPurchasesAPI.getMyPurchases().catch(() => ({ data: [] })),
        notificationsAPI.getNotifications({ is_read: false, page_size: 1 }).catch(() => ({ data: { count: 0 } })),
      ];

      if (isOrganizer) {
        promises.push(
          eventsAPI.getMyEvents().catch(() => ({ data: [] })),
          walletAPI.getMyWallet().catch(() => ({ data: { available_balance: 0 } }))
        );
      }

      const results = await Promise.all(promises);

      const newStats = {
        tickets: extractCount(results[0]),
        notifications: extractCount(results[1]),
        events: isOrganizer ? extractCount(results[2]) : 0,
        balance: isOrganizer ? (results[3]?.data?.available_balance || 0) : 0,
      };
      setStats(newStats);
      CacheService.set(cacheKey, newStats, 2 * 60 * 1000); // fraîcheur : 2 minutes
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.gray50 }]}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back" size={24} color={colors.gray700} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.greeting, { color: colors.gray500 }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.first_name || 'Utilisateur'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: colors.gray50 }]}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.gray700} />
            {stats.notifications > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.notificationBadgeText}>
                  {stats.notifications > 9 ? '9+' : stats.notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Organizer Balance Card */}
        {isOrganizer && (
          <TouchableOpacity
            style={[styles.balanceCard, { backgroundColor: colors.gray50 }]}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Portefeuille - Solde disponible"
          >
            <View>
              <Text style={[styles.balanceLabel, { color: colors.gray500 }]}>Solde disponible</Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {stats.balance.toLocaleString()} {platformCurrency}
              </Text>
            </View>
            <View style={[styles.balanceIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.gray50 }]}
            onPress={() => navigation.navigate('Main', { screen: 'MyTickets' } as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${stats.tickets} Billets`}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.tickets}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>Billets</Text>
          </TouchableOpacity>

          {isOrganizer && (
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.gray50 }]}
              onPress={() => navigation.navigate('MyEvents')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${stats.events} Evenements`}
            >
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.events}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>Événements</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.gray50 }]}
            onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Explorer les evenements"
          >
            <Ionicons name="compass-outline" size={24} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>Explorer</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accès rapide</Text>
          <View style={styles.quickActionsGrid}>
            <StaggeredItem index={0} style={styles.quickActionWrapper}>
              <QuickAction
                icon="ticket-outline"
                title="Mes billets"
                onPress={() => navigation.navigate('Main', { screen: 'MyTickets' } as any)}
              />
            </StaggeredItem>
            <StaggeredItem index={1} style={styles.quickActionWrapper}>
              <QuickAction
                icon="heart-outline"
                title="Favoris"
                onPress={() => navigation.navigate('Main', { screen: 'Saved' } as any)}
              />
            </StaggeredItem>
            <StaggeredItem index={2} style={styles.quickActionWrapper}>
              <QuickAction
                icon="notifications-outline"
                title="Notifications"
                badge={stats.notifications}
                onPress={() => navigation.navigate('Notifications')}
              />
            </StaggeredItem>
            <StaggeredItem index={3} style={styles.quickActionWrapper}>
              <QuickAction
                icon="chatbubbles-outline"
                title="Messages"
                onPress={() => navigation.navigate('Messages')}
              />
            </StaggeredItem>
            <StaggeredItem index={4} style={styles.quickActionWrapper}>
              <QuickAction
                icon="mail-outline"
                title="Invitations"
                onPress={() => navigation.navigate('Invitations')}
              />
            </StaggeredItem>
            <StaggeredItem index={5} style={styles.quickActionWrapper}>
              <QuickAction
                icon="gift-outline"
                title="Parrainage"
                onPress={() => navigation.navigate('Referrals')}
              />
            </StaggeredItem>
            <StaggeredItem index={6} style={styles.quickActionWrapper}>
              <QuickAction
                icon="trophy-outline"
                title="Badges"
                onPress={() => navigation.navigate('Gamification')}
              />
            </StaggeredItem>
            {isOrganizer && (
              <StaggeredItem index={7} style={styles.quickActionWrapper}>
                <QuickAction
                  icon="analytics-outline"
                  title="Analytics"
                  onPress={() => navigation.navigate('AnalyticsDashboard')}
                />
              </StaggeredItem>
            )}
          </View>
        </View>

        {/* Organizer Actions */}
        {isOrganizer && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Organisateur</Text>
            <View style={styles.organizerActions}>
              <TouchableOpacity
                style={[styles.organizerActionCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
                onPress={() => navigation.navigate('EventCreate')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Creer un evenement"
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.organizerActionTitle, { color: colors.text }]}>Créer un événement</Text>
                <Text style={[styles.organizerActionSubtitle, { color: colors.gray500 }]}>Nouveau</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.organizerActionCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
                onPress={() => navigation.navigate('MyEvents')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mes evenements"
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.organizerActionTitle, { color: colors.text }]}>Mes événements</Text>
                <Text style={[styles.organizerActionSubtitle, { color: colors.gray500 }]}>{stats.events} actifs</Text>
              </TouchableOpacity>
            </View>

            {/* Additional Organizer Actions */}
            <View style={[styles.organizerActions, { marginTop: Spacing.md }]}>
              <TouchableOpacity
                style={[styles.organizerActionCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
                onPress={() => navigation.navigate('Wallet')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Portefeuille"
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="wallet-outline" size={24} color={colors.success} />
                </View>
                <Text style={[styles.organizerActionTitle, { color: colors.text }]}>Portefeuille</Text>
                <Text style={[styles.organizerActionSubtitle, { color: colors.gray500 }]}>Revenus & paiements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.organizerActionCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
                onPress={() => navigation.navigate('MyEvents')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Analytiques"
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="stats-chart-outline" size={24} color={colors.warning} />
                </View>
                <Text style={[styles.organizerActionTitle, { color: colors.text }]}>Analytiques</Text>
                <Text style={[styles.organizerActionSubtitle, { color: colors.gray500 }]}>Voir les stats</Text>
              </TouchableOpacity>
            </View>

            {/* Subscription Action */}
            <View style={[styles.organizerActions, { marginTop: Spacing.md }]}>
              <TouchableOpacity
                style={[styles.organizerActionCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Abonnement"
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="diamond-outline" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.organizerActionTitle, { color: colors.text }]}>Abonnement</Text>
                <Text style={[styles.organizerActionSubtitle, { color: colors.gray500 }]}>Gerer mon plan</Text>
              </TouchableOpacity>

              <View style={[styles.organizerActionCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
                <View style={[styles.organizerActionIcon, { backgroundColor: colors.infoBg }]}>
                  <Ionicons name="download-outline" size={24} color={colors.infoDark} />
                </View>
                <Text style={[styles.organizerActionTitle, { color: colors.text }]}>Exporter</Text>
                <Text style={[styles.organizerActionSubtitle, { color: colors.gray500 }]}>Vos donnees</Text>
                <ExportButton
                  endpoint="/events/export/"
                  filename="evenements"
                />
              </View>
            </View>
          </View>
        )}

        {/* Settings Link */}
        <TouchableOpacity
          style={[styles.settingsLink, { borderTopColor: colors.gray100 }]}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="link"
          accessibilityLabel="Parametres"
        >
          <View style={styles.settingsLinkLeft}>
            <Ionicons name="settings-outline" size={20} color={colors.gray600} />
            <Text style={[styles.settingsLinkText, { color: colors.gray600 }]}>Paramètres</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    ...TextStyles.small,
    color: Colors.gray500,
  },
  userName: {
    ...TextStyles.h2,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  balanceLabel: {
    ...TextStyles.small,
    color: Colors.gray500,
  },
  balanceValue: {
    ...TextStyles.h2,
    marginTop: 4,
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...TextStyles.h2,
  },
  statLabel: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 4,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h4,
    fontSize: FontSizes.base,
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionWrapper: {
    width: '47%',
  },
  quickAction: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  quickActionTitle: {
    ...TextStyles.smallBold,
    fontFamily: FontFamily.medium,
  },
  organizerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  organizerActionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  organizerActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  organizerActionTitle: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.medium,
  },
  organizerActionSubtitle: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  settingsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsLinkText: {
    ...TextStyles.body,
    color: Colors.gray600,
  },
});
