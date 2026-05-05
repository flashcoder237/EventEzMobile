import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ExportButton from '../../components/common/ExportButton';
import VerificationBanner from '../../components/auth/VerificationBanner';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnreadCounts } from '../../contexts/NotificationContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { eventsAPI, ticketPurchasesAPI, walletAPI } from '../../api';
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

// Mémoïsé : props stables (icon, title, onPress useCallback côté parent),
// re-render uniquement si une prop change vraiment ou si le thème switch.
const QuickAction = memo(({ icon, title, onPress, badge }: QuickActionProps) => {
  const { colors } = useTheme();
  // Styles dérivés du thème dans un useMemo : référence stable tant que le thème
  // ne change pas. Évite de créer un objet à chaque render.
  const themedStyles = useMemo(() => ({
    container: { backgroundColor: colors.gray50 },
    icon: { backgroundColor: colors.card },
    badge: { backgroundColor: colors.error },
    title: { color: colors.text },
  }), [colors.gray50, colors.card, colors.error, colors.text]);

  return (
    <TouchableOpacity style={[styles.quickAction, themedStyles.container]} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={title}>
      <View style={[styles.quickActionIcon, themedStyles.icon]}>
        <Ionicons name={icon} size={22} color={colors.gray700} />
        {badge !== undefined && badge > 0 && (
          <View style={[styles.quickActionBadge, themedStyles.badge]}>
            <Text style={styles.quickActionBadgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.quickActionTitle, themedStyles.title]}>{title}</Text>
    </TouchableOpacity>
  );
});
QuickAction.displayName = 'QuickAction';

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  // Source unique pour le count de notifs non lues : le NotificationContext
  // refetch déjà ces données toutes les 30s + au foreground. Avant, on
  // refetchait également ici → 2 requêtes concurrentes en < 2s sur les
  // pages avec polling.
  const { unreadNotificationCount } = useUnreadCounts();
  const { colors } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    events: 0,
    tickets: 0,
    notifications: 0,
    balance: 0,
  });

  const isOrganizer = user?.role === 'organizer';

  // Callbacks de navigation stables — préservent la mémoïsation de QuickAction.
  const goToMyTickets = useCallback(() => navigation.navigate('Main', { screen: 'MyTickets' } as any), [navigation]);
  const goToSaved = useCallback(() => navigation.navigate('Main', { screen: 'Saved' } as any), [navigation]);
  const goToDiscover = useCallback(() => navigation.navigate('Main', { screen: 'Discover' } as any), [navigation]);
  const goToNotifications = useCallback(() => navigation.navigate('Notifications'), [navigation]);
  const goToMessages = useCallback(() => navigation.navigate('Messages'), [navigation]);
  const goToInvitations = useCallback(() => navigation.navigate('Invitations'), [navigation]);
  const goToReferrals = useCallback(() => navigation.navigate('Referrals'), [navigation]);
  const goToGamification = useCallback(() => navigation.navigate('Gamification'), [navigation]);
  const goToAnalytics = useCallback(() => navigation.navigate('AnalyticsDashboard'), [navigation]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchStats();
    });
    return () => task.cancel();
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

      // Notifications : on lit depuis NotificationContext (déjà polled 30s).
      // Plus de fetch local → plus de requête concurrente.
      const promises: Promise<any>[] = [
        ticketPurchasesAPI.getMyPurchases().catch(() => ({ data: [] })),
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
        // notifications: lu depuis le context, pas du fetch ici. On garde
        // la valeur courante du context — le useEffect plus bas synchronisera
        // si elle change après le set.
        notifications: 0,
        events: isOrganizer ? extractCount(results[1]) : 0,
        balance: isOrganizer ? (results[2]?.data?.available_balance || 0) : 0,
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
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>DB</WatermarkNumeral>
      <ScrollView
        style={{ flex: 1, zIndex: 1 }}
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
        <VerificationBanner />

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
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{getGreeting()}</Text>
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
            {unreadNotificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
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
            onPress={goToDiscover}
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
              <QuickAction icon="ticket-outline" title="Mes billets" onPress={goToMyTickets} />
            </StaggeredItem>
            <StaggeredItem index={1} style={styles.quickActionWrapper}>
              <QuickAction icon="heart-outline" title="Favoris" onPress={goToSaved} />
            </StaggeredItem>
            <StaggeredItem index={2} style={styles.quickActionWrapper}>
              <QuickAction icon="notifications-outline" title="Notifications" badge={unreadNotificationCount} onPress={goToNotifications} />
            </StaggeredItem>
            <StaggeredItem index={3} style={styles.quickActionWrapper}>
              <QuickAction icon="chatbubbles-outline" title="Messages" onPress={goToMessages} />
            </StaggeredItem>
            <StaggeredItem index={4} style={styles.quickActionWrapper}>
              <QuickAction icon="mail-outline" title="Invitations" onPress={goToInvitations} />
            </StaggeredItem>
            <StaggeredItem index={5} style={styles.quickActionWrapper}>
              <QuickAction icon="gift-outline" title="Parrainage" onPress={goToReferrals} />
            </StaggeredItem>
            <StaggeredItem index={6} style={styles.quickActionWrapper}>
              <QuickAction icon="trophy-outline" title="Badges" onPress={goToGamification} />
            </StaggeredItem>
            {isOrganizer && (
              <StaggeredItem index={7} style={styles.quickActionWrapper}>
                <QuickAction icon="analytics-outline" title="Analytics" onPress={goToAnalytics} />
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
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 40,
    fontFamily: FontFamily.displayExtraBold,
    letterSpacing: -0.9,
    lineHeight: 34,
    marginTop: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
