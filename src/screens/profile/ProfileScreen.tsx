import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../contexts/AuthContext';
import { ticketPurchasesAPI, eventsAPI } from '../../api/client';
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

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showBadge?: boolean;
  badgeCount?: number;
  danger?: boolean;
}

const MenuItem = ({ icon, title, subtitle, onPress, showBadge, badgeCount, danger }: MenuItemProps) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? Colors.error : Colors.primary}
      />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <View style={styles.menuRight}>
      {showBadge && (
        badgeCount ? (
          <View style={styles.menuBadgeCount}>
            <Text style={styles.menuBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </View>
        ) : (
          <View style={styles.menuBadge} />
        )
      )}
      <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
    </View>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    events: 0,
    tickets: 0,
    following: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [ticketsRes] = await Promise.all([
        ticketPurchasesAPI.getMyTickets({ page_size: 1 }),
      ]);

      setStats({
        events: user?.role === 'organizer' ? 0 : 0, // Would need organizer events API
        tickets: ticketsRes.data.count || 0,
        following: 0, // Would need following API
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
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const isOrganizer = user?.role === 'organizer';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.gray800} />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={Gradients.primary}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {user?.profile_picture || user?.image ? (
              <Image
                source={{ uri: user.profile_picture || user.image }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{getInitials()}</Text>
            )}
          </LinearGradient>
          <Text style={styles.userName}>
            {user?.first_name || ''} {user?.last_name || ''}
            {!user?.first_name && !user?.last_name && 'Utilisateur'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.userBadge}>
            <Ionicons
              name={isOrganizer ? 'star' : 'shield-checkmark'}
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.userBadgeText}>
              {isOrganizer ? 'Organisateur' : 'Membre'}
            </Text>
          </View>

          <View style={styles.editProfileHint}>
            <Ionicons name="create-outline" size={14} color={Colors.gray400} />
            <Text style={styles.editProfileHintText}>Modifier le profil</Text>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.events}</Text>
            <Text style={styles.statLabel}>
              {isOrganizer ? 'Événements' : 'Participations'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.tickets}</Text>
            <Text style={styles.statLabel}>Billets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.following}</Text>
            <Text style={styles.statLabel}>Suivis</Text>
          </View>
        </View>

        {/* Organizer Section */}
        {isOrganizer && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Organisateur</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="add-circle-outline"
                title="Créer un événement"
                subtitle="Nouveau événement"
                onPress={() => navigation.navigate('EventCreate')}
              />
              <MenuItem
                icon="calendar-outline"
                title="Mes événements"
                subtitle="Gérer mes événements"
                onPress={() => navigation.navigate('MyEvents')}
              />
              <MenuItem
                icon="wallet-outline"
                title="Mon portefeuille"
                subtitle="Revenus et retraits"
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
              subtitle="Photo, nom, téléphone"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Gérer les alertes"
              showBadge
              onPress={() => navigation.navigate('Notifications')}
            />
            <MenuItem
              icon="chatbubbles-outline"
              title="Messages"
              subtitle="Conversations"
              onPress={() => navigation.navigate('Messages')}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Préférences</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="heart-outline"
              title="Événements suivis"
              subtitle="Voir mes favoris"
              onPress={() => {}}
            />
            <MenuItem
              icon="card-outline"
              title="Moyens de paiement"
              subtitle="Cartes et mobile money"
              onPress={() => navigation.navigate('Settings')}
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
              subtitle="FAQ et tutoriels"
              onPress={() => Alert.alert('Info', 'Bientôt disponible')}
            />
            <MenuItem
              icon="chatbubble-outline"
              title="Nous contacter"
              subtitle="Support client"
              onPress={() => Alert.alert('Info', 'support@eventez.com')}
            />
            <MenuItem
              icon="document-text-outline"
              title="Conditions d'utilisation"
              onPress={() => Alert.alert('Info', 'Consulter les CGU')}
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
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={styles.version}>EventEz v1.0.0</Text>

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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  userCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarText: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  userEmail: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
  },
  userBadgeText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  editProfileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  editProfileHintText: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.md,
  },
  menuSection: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.xl,
  },
  menuSectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
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
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
  },
  menuTitleDanger: {
    color: Colors.error,
  },
  menuSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  menuBadgeCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    marginTop: Spacing['2xl'],
  },
});
