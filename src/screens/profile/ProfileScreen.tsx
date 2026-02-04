import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { ticketPurchasesAPI, eventsAPI, feedbacksAPI, registrationsAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
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

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, danger }: MenuItemProps) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.6}
  >
    <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? Colors.error : Colors.gray700}
      />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {showArrow && (
      <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
    )}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const [stats, setStats] = useState({
    tickets: 0,
    favorites: 0,
    reviews: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all stats in parallel
      const [ticketsRes, registrationsRes, followingRes, feedbacksRes] = await Promise.all([
        ticketPurchasesAPI.getMyTickets({ page_size: 1 }).catch(() => ({ data: { count: 0 } })),
        registrationsAPI.getMyRegistrations({ page_size: 1 }).catch(() => ({ data: { count: 0 } })),
        eventsAPI.getFollowingEvents().catch(() => ({ data: [] })),
        feedbacksAPI.getFeedbacks({ user: 'me', page_size: 1 }).catch(() => ({ data: { count: 0 } })),
      ]);

      const ticketsCount = ticketsRes.data?.count || 0;
      const registrationsCount = registrationsRes.data?.count || 0;
      const followingList = followingRes.data?.results || followingRes.data || [];
      const feedbacksCount = feedbacksRes.data?.count || 0;

      setStats({
        tickets: ticketsCount + registrationsCount,
        favorites: Array.isArray(followingList) ? followingList.length : 0,
        reviews: feedbacksCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) {
      return `${first}${last}`.toUpperCase();
    }
    return (user.email?.[0] || '?').toUpperCase();
  };

  const handleLogout = () => {
    showConfirm(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      logout
    );
  };

  const isOrganizer = user?.role === 'organizer';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.gray700} />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
        >
          <View style={styles.userCardLeft}>
            {user?.profile_picture || user?.image ? (
              <Image
                source={{ uri: user.profile_picture || user.image }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.first_name || ''} {user?.last_name || ''}
                {!user?.first_name && !user?.last_name && 'Utilisateur'}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {isOrganizer && (
                <View style={styles.organizerBadge}>
                  <Text style={styles.organizerBadgeText}>Organisateur</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.tickets}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.favorites}</Text>
            <Text style={styles.statLabel}>Favoris</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.reviews}</Text>
            <Text style={styles.statLabel}>Avis</Text>
          </View>
        </View>

        {/* Moderator Section */}
        {isModerator && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Modération</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="shield-checkmark-outline"
                title="File de modération"
                subtitle="Valider les événements"
                onPress={() => navigation.navigate('Moderation')}
              />
            </View>
          </View>
        )}

        {/* Organizer Section */}
        {isOrganizer && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Organisateur</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="add-circle-outline"
                title="Créer un événement"
                onPress={() => navigation.navigate('EventCreate')}
              />
              <MenuItem
                icon="calendar-outline"
                title="Mes événements"
                onPress={() => navigation.navigate('MyEvents')}
              />
              <MenuItem
                icon="wallet-outline"
                title="Mon portefeuille"
                onPress={() => navigation.navigate('Wallet')}
              />
            </View>
          </View>
        )}

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Compte</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              title="Modifier le profil"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <MenuItem
              icon="card-outline"
              title="Mes paiements"
              subtitle="Historique et remboursements"
              onPress={() => navigation.navigate('MyPayments')}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              onPress={() => navigation.navigate('Notifications')}
            />
            <MenuItem
              icon="chatbubbles-outline"
              title="Messages"
              onPress={() => navigation.navigate('Messages')}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Préférences</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="heart-outline"
              title="Événements favoris"
              onPress={() => navigation.navigate('Main', { screen: 'Dashboard' } as any)}
            />
            <MenuItem
              icon="grid-outline"
              title="Tableau de bord"
              onPress={() => navigation.navigate('UserDashboard')}
            />
            <MenuItem
              icon="language-outline"
              title="Langue"
              subtitle="Français"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="help-circle-outline"
              title="Centre d'aide"
              onPress={() => showAlert('Info', 'Bientôt disponible')}
            />
            <MenuItem
              icon="document-text-outline"
              title="Conditions d'utilisation"
              onPress={() => showAlert('Info', 'Consulter les CGU')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              title="Déconnexion"
              onPress={handleLogout}
              showArrow={false}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={styles.version}>EventEz v1.0.0</Text>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...TextStyles.h2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: Colors.gray600,
  },
  userInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  userName: {
    ...TextStyles.h4,
  },
  userEmail: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  organizerBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  organizerBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...TextStyles.h2,
  },
  statLabel: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
  },
  menuSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  menuSectionTitle: {
    ...TextStyles.label,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: Colors.errorLight,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.medium,
  },
  menuTitleDanger: {
    color: Colors.error,
  },
  menuSubtitle: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    marginTop: Spacing['2xl'],
  },
});
