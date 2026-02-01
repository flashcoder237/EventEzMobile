import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../contexts/AuthContext';
import { eventsAPI, notificationsAPI, ticketPurchasesAPI, walletAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
  Gradients,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string | number;
  subtitle?: string;
  gradient?: boolean;
  onPress?: () => void;
}

const StatCard = ({ icon, title, value, subtitle, gradient, onPress }: StatCardProps) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
    {gradient ? (
      <LinearGradient
        colors={Gradients.primary}
        style={styles.statIconGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color={Colors.white} />
      </LinearGradient>
    ) : (
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={24} color={Colors.primary} />
      </View>
    )}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  badge?: number;
}

const QuickAction = ({ icon, title, onPress, badge }: QuickActionProps) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={22} color={Colors.primary} />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
    {badge !== undefined && badge > 0 && (
      <View style={styles.quickActionBadge}>
        <Text style={styles.quickActionBadgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
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
    following: 0,
    balance: 0,
  });

  const isOrganizer = user?.role === 'organizer';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const promises: Promise<any>[] = [
        ticketPurchasesAPI.getMyTickets({ page_size: 1 }).catch(() => ({ data: { count: 0 } })),
        notificationsAPI.getNotifications({ is_read: false, page_size: 1 }).catch(() => ({ data: { count: 0 } })),
        eventsAPI.getFollowingEvents({ page_size: 1 }).catch(() => ({ data: { count: 0 } })),
      ];

      if (isOrganizer) {
        promises.push(
          eventsAPI.getEvents({ my_events: true, page_size: 1 }).catch(() => ({ data: { count: 0 } })),
          walletAPI.getWallet().catch(() => ({ data: { available_balance: 0 } }))
        );
      }

      const results = await Promise.all(promises);

      setStats({
        tickets: results[0].data?.count || results[0].data?.results?.length || 0,
        notifications: results[1].data?.count || results[1].data?.results?.length || 0,
        following: results[2].data?.count || results[2].data?.results?.length || 0,
        events: isOrganizer ? (results[3]?.data?.count || results[3]?.data?.results?.length || 0) : 0,
        balance: isOrganizer ? (results[4]?.data?.available_balance || 0) : 0,
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

  const handleWelcomePress = () => {
    if (isOrganizer) {
      navigation.navigate('EventCreate');
    } else {
      navigation.navigate('Main', { screen: 'Explore' } as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Bienvenue, {user?.first_name || 'Utilisateur'} !
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.gray800} />
            {stats.notifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {stats.notifications > 9 ? '9+' : stats.notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <TouchableOpacity style={styles.welcomeCard} activeOpacity={0.9} onPress={handleWelcomePress}>
          <LinearGradient
            colors={Gradients.primary}
            style={styles.welcomeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>
                {isOrganizer ? 'Créer un événement' : 'Découvrir les événements'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {isOrganizer
                  ? 'Lancez votre prochain événement en quelques clics'
                  : 'Explorez les événements près de chez vous'}
              </Text>
            </View>
            <View style={styles.welcomeIconContainer}>
              <Ionicons
                name={isOrganizer ? 'add-circle' : 'compass'}
                size={40}
                color={Colors.white}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Organizer Balance Card */}
        {isOrganizer && (
          <TouchableOpacity
            style={styles.balanceCard}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.9}
          >
            <View style={styles.balanceContent}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>
                {stats.balance.toLocaleString()} <Text style={styles.balanceCurrency}>FCFA</Text>
              </Text>
            </View>
            <View style={styles.balanceIcon}>
              <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="ticket"
            title="Billets"
            value={stats.tickets}
            gradient
            onPress={() => navigation.navigate('Main', { screen: 'MyTickets' } as any)}
          />
          <StatCard
            icon="heart"
            title="Suivis"
            value={stats.following}
          />
          <StatCard
            icon="notifications"
            title="Notifications"
            value={stats.notifications}
            onPress={() => navigation.navigate('Notifications')}
          />
          {isOrganizer ? (
            <StatCard
              icon="calendar"
              title="Mes Événements"
              value={stats.events}
              onPress={() => navigation.navigate('MyEvents')}
            />
          ) : (
            <StatCard
              icon="compass"
              title="Explorer"
              value="→"
              onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActionsCard}>
            <QuickAction
              icon="ticket-outline"
              title="Mes billets"
              onPress={() => navigation.navigate('Main', { screen: 'MyTickets' } as any)}
            />
            <QuickAction
              icon="heart-outline"
              title="Événements suivis"
              onPress={() => {}}
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
              icon="settings-outline"
              title="Paramètres"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        {/* Organizer Section */}
        {isOrganizer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisateur</Text>
            <View style={styles.quickActionsCard}>
              <QuickAction
                icon="add-circle-outline"
                title="Créer un événement"
                onPress={() => navigation.navigate('EventCreate')}
              />
              <QuickAction
                icon="calendar-outline"
                title="Mes événements"
                onPress={() => navigation.navigate('MyEvents')}
              />
              <QuickAction
                icon="wallet-outline"
                title="Mon portefeuille"
                onPress={() => navigation.navigate('Wallet')}
              />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
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
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  welcomeCard: {
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  welcomeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  welcomeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  balanceContent: {},
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  balanceValue: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginTop: 4,
  },
  balanceCurrency: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray500,
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.lg,
  },
  statValue: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  statTitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  statSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  quickActionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
  },
  quickActionBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: Spacing.sm,
  },
  quickActionBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
});
