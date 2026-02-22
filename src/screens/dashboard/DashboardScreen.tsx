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
import { eventsAPI, notificationsAPI, ticketPurchasesAPI, walletAPI } from '../../api/client';
import { RootStackParamList, Event } from '../../types';
import EventCard from '../../components/events/EventCard';
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

const QuickAction = ({ icon, title, onPress, badge }: QuickActionProps) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.6}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={22} color={Colors.gray700} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
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

  const fetchStats = async () => {
    try {
      const promises: Promise<any>[] = [
        ticketPurchasesAPI.getMyTickets().catch(() => ({ data: { count: 0 } })),
        notificationsAPI.getNotifications({ is_read: false, page_size: 1 }).catch(() => ({ data: { count: 0 } })),
      ];

      if (isOrganizer) {
        promises.push(
          eventsAPI.getEvents({ my_events: true, page_size: 1 }).catch(() => ({ data: { count: 0 } })),
          walletAPI.getMyWallet().catch(() => ({ data: { available_balance: 0 } }))
        );
      }

      const results = await Promise.all(promises);

      setStats({
        tickets: results[0].data?.count || results[0].data?.results?.length || 0,
        notifications: results[1].data?.count || results[1].data?.results?.length || 0,
        events: isOrganizer ? (results[2]?.data?.count || results[2]?.data?.results?.length || 0) : 0,
        balance: isOrganizer ? (results[3]?.data?.available_balance || 0) : 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.first_name || 'Utilisateur'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.gray700} />
            {stats.notifications > 0 && (
              <View style={styles.notificationBadge}>
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
            style={styles.balanceCard}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>
                {stats.balance.toLocaleString()} FCFA
              </Text>
            </View>
            <View style={styles.balanceIcon}>
              <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Main', { screen: 'MyTickets' } as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{stats.tickets}</Text>
            <Text style={styles.statLabel}>Billets</Text>
          </TouchableOpacity>

          {isOrganizer && (
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('MyEvents')}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{stats.events}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="compass-outline" size={24} color={Colors.primary} />
            <Text style={styles.statLabel}>Explorer</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="ticket-outline"
              title="Mes billets"
              onPress={() => navigation.navigate('Main', { screen: 'MyTickets' } as any)}
            />
            <QuickAction
              icon="heart-outline"
              title="Favoris"
              onPress={() => navigation.navigate('Main', { screen: 'Following' } as any)}
            />
            <QuickAction
              icon="notifications-outline"
              title="Notifications"
              badge={stats.notifications}
              onPress={() => navigation.navigate('Notifications')}
            />
            <QuickAction
              icon="chatbubbles-outline"
              title="Messages"
              onPress={() => navigation.navigate('Messages')}
            />
            <QuickAction
              icon="mail-outline"
              title="Invitations"
              onPress={() => navigation.navigate('Invitations')}
            />
            <QuickAction
              icon="gift-outline"
              title="Parrainage"
              onPress={() => navigation.navigate('Referrals')}
            />
            <QuickAction
              icon="trophy-outline"
              title="Badges"
              onPress={() => navigation.navigate('Gamification')}
            />
          </View>
        </View>

        {/* Organizer Actions */}
        {isOrganizer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisateur</Text>
            <View style={styles.organizerActions}>
              <TouchableOpacity
                style={styles.organizerActionCard}
                onPress={() => navigation.navigate('EventCreate')}
                activeOpacity={0.7}
              >
                <View style={styles.organizerActionIcon}>
                  <Ionicons name="add" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.organizerActionTitle}>Créer un événement</Text>
                <Text style={styles.organizerActionSubtitle}>Nouveau</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.organizerActionCard}
                onPress={() => navigation.navigate('MyEvents')}
                activeOpacity={0.7}
              >
                <View style={styles.organizerActionIcon}>
                  <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.organizerActionTitle}>Mes événements</Text>
                <Text style={styles.organizerActionSubtitle}>{stats.events} actifs</Text>
              </TouchableOpacity>
            </View>

            {/* Additional Organizer Actions */}
            <View style={[styles.organizerActions, { marginTop: Spacing.md }]}>
              <TouchableOpacity
                style={styles.organizerActionCard}
                onPress={() => navigation.navigate('Wallet')}
                activeOpacity={0.7}
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="wallet-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.organizerActionTitle}>Portefeuille</Text>
                <Text style={styles.organizerActionSubtitle}>Revenus & paiements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.organizerActionCard}
                onPress={() => navigation.navigate('MyEvents')}
                activeOpacity={0.7}
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="stats-chart-outline" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.organizerActionTitle}>Analytiques</Text>
                <Text style={styles.organizerActionSubtitle}>Voir les stats</Text>
              </TouchableOpacity>
            </View>

            {/* Subscription Action */}
            <View style={[styles.organizerActions, { marginTop: Spacing.md }]}>
              <TouchableOpacity
                style={styles.organizerActionCard}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.7}
              >
                <View style={[styles.organizerActionIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="diamond-outline" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.organizerActionTitle}>Abonnement</Text>
                <Text style={styles.organizerActionSubtitle}>Gerer mon plan</Text>
              </TouchableOpacity>

              <View style={styles.organizerActionCard}>
                <View style={[styles.organizerActionIcon, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="download-outline" size={24} color="#6366F1" />
                </View>
                <Text style={styles.organizerActionTitle}>Exporter</Text>
                <Text style={styles.organizerActionSubtitle}>Vos donnees</Text>
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
          style={styles.settingsLink}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.settingsLinkLeft}>
            <Ionicons name="settings-outline" size={20} color={Colors.gray600} />
            <Text style={styles.settingsLinkText}>Paramètres</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
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
    paddingBottom: Spacing.xl,
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
  quickAction: {
    width: '47%',
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
    fontSize: FontSizes.base,
    color: Colors.gray600,
  },
});
